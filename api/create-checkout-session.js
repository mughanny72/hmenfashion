// api/create-checkout-session.js
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

function getBaseUrl() {
  // ✅ Always redirect back to your main domain
  return "https://hmenfashion.com";
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY in env." });
    }

    const baseUrl = getBaseUrl();

    // ✅ INPUTS:
    // kind: "subscription" OR "payment"
    // customerEmail: optional
    // items: required for payment
    const { kind = "subscription", customerEmail, items = [] } = req.body || {};

    // ✅ Normalize email
    const email =
      typeof customerEmail === "string" && customerEmail.includes("@")
        ? customerEmail.trim().toLowerCase()
        : "";

    // ✅ Common checkout collection settings
    // These increase the chance you never “miss” customer details.
    const common = {
      // Prefill email if provided
      customer_email: email || undefined,

      // Ask for phone (useful for shipping + delivery)
      phone_number_collection: { enabled: true },

      // Force billing address collection (good for receipts + disputes)
      billing_address_collection: "required",

      // Success/cancel
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html`,

      // Always include metadata (safe + helpful)
      metadata: {
        site: "hmenfashion.com",
        kind,
        email: email || "",
      },
    };

    // =========================
    // A) SUBSCRIPTION checkout
    // =========================
    if (kind === "subscription") {
      const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
      if (!priceId) {
        return res.status(500).json({
          error: "Missing STRIPE_SUBSCRIPTION_PRICE_ID in env.",
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],

        // Collect shipping address ONLY if you plan to ship member kits/physical items.
        // If you don't need shipping for subscription, you can delete this block.
        // shipping_address_collection: { allowed_countries: ["US"] },

        line_items: [{ price: priceId, quantity: 1 }],

        ...common,

        metadata: {
          ...common.metadata,
          plan: "membership",
        },
      });

      return res.status(200).json({ url: session.url });
    }

    // =========================
    // B) ONE-TIME PAYMENT checkout
    // =========================
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Missing items for payment checkout. Send items: [{name, unitAmount, qty}]",
      });
    }

    const line_items = items.map((it) => {
      const name = String(it.name || "").trim() || "Item";
      const qty = Number(it.qty || 1);
      const unitAmount = Number(it.unitAmount || 0); // cents

      if (!Number.isFinite(qty) || qty < 1) throw new Error("Invalid qty in items");
      if (!Number.isFinite(unitAmount) || unitAmount < 50)
        throw new Error("Invalid unitAmount in items (must be >= 50 cents)");

      return {
        quantity: Math.round(qty),
        price_data: {
          currency: "usd",
          unit_amount: Math.round(unitAmount),
          product_data: {
            name,
            metadata: {
              sku: it.sku ? String(it.sku) : "",
            },
          },
        },
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,

      // ✅ Shipping address collection (for a real store checkout)
      shipping_address_collection: {
        allowed_countries: ["US"],
      },

      // ✅ Shipping options
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 995, currency: "usd" },
            display_name: "Standard Shipping (3–5 days)",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 3 },
              maximum: { unit: "business_day", value: 5 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 1995, currency: "usd" },
            display_name: "Express Shipping (1–2 days)",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 2 },
            },
          },
        },
      ],

      ...common,

      metadata: {
        ...common.metadata,
        // Store a simple cart summary in metadata (keep it small)
        items_count: String(items.length),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};