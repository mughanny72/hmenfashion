import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function clean(value, max = 120) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function cents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ ok: false, error: "Missing STRIPE_SECRET_KEY" });
    }

    const origin = process.env.SITE_URL || req.headers.origin || `https://${req.headers.host}`;
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const cart = Array.isArray(body?.cart) ? body.cart : [];
    const shippingRate = body?.shippingRate || null;
    const shippingAddress = body?.shippingAddress || null;

    if (!cart.length) return res.status(400).json({ ok: false, error: "Cart is empty" });
    if (cart.length > 100) return res.status(400).json({ ok: false, error: "Too many items" });

    // A live USPS/UPS rate must have been fetched and selected client-side
    // (see hmf-shipping.js) before we'll create a checkout session. This
    // guarantees the customer is charged the exact quoted carrier rate.
    const shippingCents = cents(shippingRate?.amount);
    if (!shippingRate || !shippingCents) {
      return res.status(400).json({ ok: false, error: "Please select a shipping option before checkout." });
    }

    const line_items = cart.map((item) => {
      const unit_amount = cents(item.price);
      if (!unit_amount) throw new Error("Invalid item price");

      const description = [
        item.styleNumber ? `Style: ${clean(item.styleNumber, 40)}` : "",
        item.suitSize ? `Jacket/Suit: ${clean(item.suitSize, 40)}` : "",
        item.shirtSize ? `Shirt: ${clean(item.shirtSize, 40)}` : "",
        item.pantsSize ? `Pants: ${clean(item.pantsSize, 40)}` : "",
        item.shoeSize ? `Shoes: ${clean(item.shoeSize, 40)}` : "",
        item.beltSize ? `Belt: ${clean(item.beltSize, 40)}` : "",
        item.color ? `Color: ${clean(item.color, 40)}` : "",
        item.fit ? `Fit: ${clean(item.fit, 40)}` : ""
      ].filter(Boolean).join(" • ");

      return {
        quantity: Math.max(1, Math.min(99, Number(item.qty || 1))),
        price_data: {
          currency: "usd",
          unit_amount,
          product_data: {
            name: clean(item.name || "H Men's Fashion item"),
            description: description || "H Men's Fashion",
            metadata: {
              local_id: clean(item.id, 80),
              cart_key: clean(item.cartKey, 250)
            }
          }
        }
      };
    });

    const shippingLabel = clean(
      `${shippingRate.carrier || ""} ${shippingRate.service || "Shipping"}`.trim(),
      100
    ) || "Shipping";

    // Create a lightweight guest Customer record carrying the shipping address
    // the shopper already typed in on the cart page (see hmf-shipping.js). Passing
    // this customer to Checkout lets Stripe pre-fill the shipping form so they
    // don't have to type the same address twice.
    let customerId;
    if (shippingAddress?.street1 && shippingAddress?.city && shippingAddress?.state && shippingAddress?.zip) {
      try {
        const customerName = clean(shippingAddress.name, 120) || "Customer";
        const customer = await stripe.customers.create({
          name: customerName,
          shipping: {
            name: customerName,
            address: {
              line1: clean(shippingAddress.street1, 120),
              line2: clean(shippingAddress.street2, 120) || undefined,
              city: clean(shippingAddress.city, 80),
              state: clean(shippingAddress.state, 40),
              postal_code: clean(shippingAddress.zip, 20),
              country: "US"
            }
          }
        });
        customerId = customer.id;
      } catch (custErr) {
        console.error("Could not pre-create Stripe customer (continuing without prefill):", custErr);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      ...(customerId ? { customer: customerId } : {}),
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingCents, currency: "usd" },
            display_name: shippingLabel,
            delivery_estimate: shippingRate.days
              ? {
                  minimum: { unit: "business_day", value: Math.max(1, Math.round(shippingRate.days)) },
                  maximum: { unit: "business_day", value: Math.max(1, Math.round(shippingRate.days)) + 1 }
                }
              : undefined
          }
        }
      ],
      phone_number_collection: { enabled: true },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel.html`
    });

    return res.status(200).json({ ok: true, url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Checkout error" });
  }
}
