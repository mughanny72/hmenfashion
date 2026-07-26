// api/shipping-rates.js
// Live USPS / UPS shipping rate quotes via Shippo, based on the real cart
// weight and the customer's destination address. US-only for now.
//
// Requires an env var: SHIPPO_API_KEY
// Get one free at https://goshippo.com (Settings -> API).
// USPS rates are available on Shippo by default. UPS rates require
// connecting a UPS account (or Shippo's UPS account) in the Shippo
// dashboard under Settings -> Carrier Accounts.

const SHIP_FROM = {
  name: "H Men's Fashion",
  street1: "5256 US-30, Suite NL-04",
  city: "Greensburg",
  state: "PA",
  zip: "15601",
  country: "US"
};

// One general-purpose apparel box. Good enough for most orders; adjust if
// you regularly ship larger combined orders.
const PARCEL_TEMPLATE = {
  length: "14",
  width: "11",
  height: "6",
  distance_unit: "in"
};

function clean(value, max = 120) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function totalWeightLb(cart) {
  const CATEGORY_WEIGHT_OZ = {
    SUITS: 64,
    CASUAL: 16,
    SHOES: 32,
    ACCESSORIES: 8
  };
  const DEFAULT_OZ = 16;

  let oz = 0;
  for (const item of cart) {
    const qty = Math.max(1, Number(item.qty || 1));
    const perItemOz =
      Number(item.weightOz) > 0
        ? Number(item.weightOz)
        : CATEGORY_WEIGHT_OZ[item.category] || DEFAULT_OZ;
    oz += perItemOz * qty;
  }
  const lb = oz / 16;
  return Math.max(1, Math.round(lb * 10) / 10); // at least 1 lb
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    if (!process.env.SHIPPO_API_KEY) {
      return res.status(500).json({ ok: false, error: "Missing SHIPPO_API_KEY" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const cart = Array.isArray(body?.cart) ? body.cart : [];
    const address = body?.address || {};

    if (!cart.length) return res.status(400).json({ ok: false, error: "Cart is empty" });

    const street1 = clean(address.street1, 120);
    const city = clean(address.city, 80);
    const state = clean(address.state, 40);
    const zip = clean(address.zip, 20);

    if (!street1 || !city || !state || !zip) {
      return res.status(400).json({ ok: false, error: "Missing shipping address fields" });
    }

    const weight = totalWeightLb(cart);

    const shipmentPayload = {
      address_from: SHIP_FROM,
      address_to: {
        name: clean(address.name, 120) || "Customer",
        street1,
        street2: clean(address.street2, 120),
        city,
        state,
        zip,
        country: "US"
      },
      parcels: [
        {
          ...PARCEL_TEMPLATE,
          weight: String(weight),
          mass_unit: "lb"
        }
      ],
      async: false
    };

    const response = await fetch("https://api.goshippo.com/shipments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`
      },
      body: JSON.stringify(shipmentPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Shippo error:", data);
      return res.status(502).json({ ok: false, error: "Could not get shipping rates", detail: data });
    }

    const rawRates = Array.isArray(data.rates) ? data.rates : [];

    if (!rawRates.length) {
      return res.status(200).json({
        ok: true,
        rates: [],
        message: data.messages?.length
          ? data.messages.map((m) => m.text).join(" ")
          : "No live rates available for this address yet."
      });
    }

    const rates = rawRates
      .filter((r) => r.amount)
      .map((r) => ({
        id: r.object_id,
        carrier: r.provider,
        service: r.servicelevel?.name || r.servicelevel?.token || "Shipping",
        amount: Number(r.amount),
        currency: r.currency || "USD",
        days: r.estimated_days ?? null
      }))
      .sort((a, b) => a.amount - b.amount);

    return res.status(200).json({ ok: true, rates, weightLb: weight });
  } catch (err) {
    console.error("Shipping rate error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Shipping rate error" });
  }
}
