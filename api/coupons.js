// api/coupons.js
// Admin-only coupon generator, backed directly by Stripe (Coupons + Promotion Codes).
// No separate database needed — Stripe is the source of truth, and the checkout page
// (allow_promotion_codes: true in create-checkout-session.js) already has a field for
// customers to type these codes in.
//
//   GET    /api/coupons              -> admin-key required, lists active promotion codes
//   POST   /api/coupons              -> admin-key required, creates a percent-off coupon code
//   DELETE /api/coupons?id=promo_xxx -> admin-key required, deactivates a promotion code
import Stripe from "stripe";
import requireAdmin from "../lib/adminAuth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function randomCode(prefix) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O/1/I
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${suffix}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!requireAdmin(req, res)) return;

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ ok: false, error: "Missing STRIPE_SECRET_KEY" });
    }

    if (req.method === "GET") {
      const list = await stripe.promotionCodes.list({ limit: 100 });
      const codes = list.data.map((pc) => ({
        id: pc.id,
        code: pc.code,
        active: pc.active,
        percentOff: pc.coupon?.percent_off ?? null,
        timesRedeemed: pc.times_redeemed,
        maxRedemptions: pc.max_redemptions,
        expiresAt: pc.expires_at ? new Date(pc.expires_at * 1000).toISOString() : null,
        created: new Date(pc.created * 1000).toISOString()
      }));
      // Newest first
      codes.sort((a, b) => new Date(b.created) - new Date(a.created));
      return res.status(200).json({ ok: true, codes });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const percentOff = Number(body.percentOff);
      if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
        return res.status(400).json({ ok: false, error: "percentOff must be a number between 1 and 100" });
      }

      let code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
      if (!code) code = randomCode(`SAVE${Math.round(percentOff)}-`);

      const maxRedemptions = body.maxRedemptions != null && body.maxRedemptions !== ""
        ? Math.max(1, Math.round(Number(body.maxRedemptions)))
        : undefined;

      let expiresAt;
      if (body.expiresAt) {
        const ts = Math.floor(new Date(body.expiresAt).getTime() / 1000);
        if (Number.isFinite(ts) && ts > Date.now() / 1000) expiresAt = ts;
      }

      const coupon = await stripe.coupons.create({
        percent_off: percentOff,
        duration: "once",
        name: `${percentOff}% off — ${code}`
      });

      const promoParams = {
        coupon: coupon.id,
        code,
        active: true
      };
      if (maxRedemptions) promoParams.max_redemptions = maxRedemptions;
      if (expiresAt) promoParams.expires_at = expiresAt;

      const promo = await stripe.promotionCodes.create(promoParams);

      return res.status(200).json({
        ok: true,
        coupon: {
          id: promo.id,
          code: promo.code,
          percentOff,
          maxRedemptions: promo.max_redemptions,
          expiresAt: promo.expires_at ? new Date(promo.expires_at * 1000).toISOString() : null
        }
      });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, error: "Missing id" });
      await stripe.promotionCodes.update(id, { active: false });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("coupons api error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}
