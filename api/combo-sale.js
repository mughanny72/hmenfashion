// api/combo-sale.js
// Called after a successful combo purchase to increment soldCount
// and generate a 50% Stripe coupon for the creator when soldCount hits 10
const { MongoClient, ObjectId } = require("mongodb");
const Stripe = require("stripe");

const client = new MongoClient(process.env.MONGODB_URI);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

function getET(date) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  }) + " ET";
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { comboId } = req.body || {};
    if (!comboId) return res.status(400).json({ ok: false, error: "comboId is required." });

    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const combos = db.collection("combos");

    // Increment soldCount atomically
    const result = await combos.findOneAndUpdate(
      { _id: new ObjectId(comboId) },
      { $inc: { soldCount: 1 } },
      { returnDocument: "after" }
    );

    const combo = result.value || result;
    if (!combo) return res.status(404).json({ ok: false, error: "Combo not found." });

    const newCount = combo.soldCount;
    let rewardCode = combo.rewardCode;

    // Generate 50% off reward coupon at exactly 10 sales (once only)
    if (newCount >= 10 && !combo.rewardCode && combo.creatorEmail) {
      try {
        const coupon = await stripe.coupons.create({
          percent_off: 50,
          duration: "once",
          name: `${combo.name} Creator Reward`,
          metadata: { comboId, creatorEmail: combo.creatorEmail }
        });
        const promoCode = await stripe.promotionCodes.create({
          coupon: coupon.id,
          max_redemptions: 1,
          metadata: { comboId, creatorEmail: combo.creatorEmail }
        });
        rewardCode = promoCode.code;
        await combos.updateOne(
          { _id: new ObjectId(comboId) },
          { $set: { rewardCode, rewardUnlocked: true, rewardGeneratedAt: new Date() } }
        );
        console.log(`✅ Reward generated for ${combo.creatorEmail}: ${rewardCode}`);
      } catch (stripeErr) {
        console.error("Stripe coupon generation error:", stripeErr);
      }
    }

    return res.status(200).json({
      ok: true,
      soldCount: newCount,
      rewardUnlocked: newCount >= 10,
      rewardCode: rewardCode || null,
    });
  } catch (e) {
    console.error("combo-sale error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
};
