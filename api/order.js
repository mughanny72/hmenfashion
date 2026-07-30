// api/order.js
//   GET /api/order?session_id=xxx  -> public, single order lookup (unchanged)
//   GET /api/order                 -> admin-key required, lists recent paid orders from Stripe
import { MongoClient } from "mongodb";
import Stripe from "stripe";
import requireAdmin from "../lib/adminAuth.js";

// Cache DB connection across serverless calls
let cached = global._mongoOrder;
if (!cached) cached = global._mongoOrder = { conn: null, promise: null };

async function getDb() {
  const URI = process.env.MONGODB_URI;
  const DB = process.env.MONGODB_DB;

  if (!URI) throw new Error("Missing MONGODB_URI");
  if (!DB) throw new Error("Missing MONGODB_DB");

  if (cached.conn) return cached.conn.db(DB);

  if (!cached.promise) {
    const client = new MongoClient(URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });
    cached.promise = client.connect().then((c) => ({ client: c }));
  }

  cached.conn = await cached.promise;
  return cached.conn.client.db(DB);
}

function s(v) {
  return v == null ? "" : String(v);
}

function lower(v) {
  return s(v).trim().toLowerCase();
}

export default async function handler(req, res) {
  // Basic CORS (safe for GET)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const session_id = s(req.query.session_id).trim();

    // No session_id -> admin order list, pulled live from Stripe (Checkout Sessions).
    if (!session_id) {
      if (!requireAdmin(req, res)) return;
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ ok: false, error: "Missing STRIPE_SECRET_KEY" });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const startingAfter = req.query.starting_after ? s(req.query.starting_after) : undefined;

      const list = await stripe.checkout.sessions.list({
        limit,
        starting_after: startingAfter,
        status: "complete",
      });

      const orders = [];
      for (const session of list.data) {
        if (session.mode !== "payment") continue; // skip subscription sessions

        let items = [];
        try {
          const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
          items = (li.data || []).map((it) => ({
            description: s(it.description),
            quantity: it.quantity || 1,
            amount: it.amount_total || 0,
          }));
        } catch (_) {}

        const cd = session.customer_details || {};
        const sd = session.shipping_details || {};

        orders.push({
          id: session.id,
          created: new Date(session.created * 1000).toISOString(),
          email: lower(cd.email),
          phone: s(cd.phone),
          name: s(sd.name || cd.name),
          address: sd.address || null,
          amountTotal: session.amount_total || 0,
          amountShipping: session.total_details?.amount_shipping ?? null,
          currency: lower(session.currency || "usd"),
          paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
          items,
        });
      }

      return res.status(200).json({
        ok: true,
        orders,
        hasMore: list.has_more,
        nextCursor: list.data.length ? list.data[list.data.length - 1].id : null,
      });
    }

    const db = await getDb();
    const orders = db.collection("orders");

    // 1) Try DB first
    const existing = await orders.findOne({ stripeSessionId: session_id });
    if (existing) {
      return res.status(200).json({ ok: true, order: existing, source: "db" });
    }

    // 2) If not found, fetch from Stripe and create the order now (receipt generator)
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ ok: false, error: "Missing STRIPE_SECRET_KEY in env." });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent", "customer", "subscription"],
    });

    // If not complete/paid yet, don't save
    const paid = session.payment_status === "paid";
    const complete = session.status === "complete";
    if (!paid && !complete) {
      return res.status(200).json({
        ok: true,
        order: null,
        source: "stripe",
        status: session.status,
        payment_status: session.payment_status,
        message: "Checkout not completed/paid yet.",
      });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(session_id, { limit: 100 });

    const cd = session.customer_details || {};
    const sd = session.shipping_details || {};

    const orderDoc = {
      stripeSessionId: s(session.id),
      mode: s(session.mode), // payment | subscription
      status: s(session.status),
      payment_status: s(session.payment_status),

      currency: lower(session.currency || "usd"),
      amount_subtotal: session.amount_subtotal || 0,
      amount_total: session.amount_total || 0,
      amount_tax: session.total_details?.amount_tax || 0,
      amount_shipping: session.total_details?.amount_shipping || 0,
      amount_discount: session.total_details?.amount_discount || 0,

      customer: {
        name: s(cd.name || sd.name),
        email: lower(cd.email),
        phone: s(cd.phone),
      },

      shipping: {
        name: s(sd.name),
        address: sd.address || null, // {line1,line2,city,state,postal_code,country}
      },

      items: (lineItems.data || []).map((li) => ({
        description: s(li.description),
        quantity: li.quantity || 1,
        amount_subtotal: li.amount_subtotal || 0,
        amount_total: li.amount_total || 0,
        currency: lower(li.currency || session.currency || "usd"),
        price: li.price
          ? {
              id: s(li.price.id),
              unit_amount: li.price.unit_amount || 0,
              currency: lower(li.price.currency || session.currency || "usd"),
              product: li.price.product || null,
            }
          : null,
      })),

      metadata: session.metadata || {},

      stripe_created: session.created ? new Date(session.created * 1000) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save (upsert)
    await orders.updateOne(
      { stripeSessionId: orderDoc.stripeSessionId },
      { $set: orderDoc, $setOnInsert: { createdAt: orderDoc.createdAt } },
      { upsert: true }
    );

    const saved = await orders.findOne({ stripeSessionId: orderDoc.stripeSessionId });

    return res.status(200).json({ ok: true, order: saved, source: "stripe->db" });
  } catch (e) {
    console.error("ORDER API ERROR:", e);
    return res.status(500).json({
      ok: false,
      error: "Server error",
      detail: String(e?.message || e),
    });
  }
}
