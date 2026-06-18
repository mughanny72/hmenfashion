// api/combos.js
// Handles: POST /api/combos (save named combo) | GET /api/combos (leaderboard)
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

function getET(date) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true
  }) + " ET";
}

function makeSignature(selections) {
  // Canonical fingerprint of a combo — order-independent per part label
  return JSON.stringify(
    [...selections]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(s => `${s.label}:${s.color}${s.size ? "/" + s.size : ""}`)
  );
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const combos = db.collection("combos");

    // ── GET: leaderboard ──
    if (req.method === "GET") {
      const list = await combos
        .find({})
        .sort({ soldCount: -1, createdAt: 1 })
        .limit(50)
        .toArray();

      return res.status(200).json({
        ok: true,
        combos: list.map(c => ({
          id: String(c._id),
          name: c.name,
          bundleId: c.bundleId,
          bundleTitle: c.bundleTitle,
          price: c.price,
          selections: c.selections,
          creatorEmail: c.creatorEmail,
          soldCount: c.soldCount || 0,
          rewardUnlocked: (c.soldCount || 0) >= 10,
          createdAtET: getET(c.createdAt),
          signature: c.signature,
        }))
      });
    }

    // ── POST: save a new named combo ──
    if (req.method === "POST") {
      const { name, bundleId, bundleTitle, price, selections, creatorEmail } = req.body || {};

      if (!name || !bundleId || !selections || !selections.length) {
        return res.status(400).json({ ok: false, error: "name, bundleId, and selections are required." });
      }

      const signature = makeSignature(selections);
      const now = new Date();

      // Check if this exact combo already exists
      const existing = await combos.findOne({ bundleId, signature });
      if (existing) {
        return res.status(409).json({
          ok: false,
          alreadyExists: true,
          existingName: existing.name,
          existingCreatorEmail: existing.creatorEmail,
          createdAtET: getET(existing.createdAt),
          id: String(existing._id),
          message: `This exact combo already exists as "${existing.name}", created on ${getET(existing.createdAt)}.`
        });
      }

      const result = await combos.insertOne({
        name: String(name).trim().slice(0, 60),
        bundleId,
        bundleTitle: bundleTitle || "",
        price: Number(price) || 0,
        selections,
        creatorEmail: String(creatorEmail || "").trim().toLowerCase(),
        soldCount: 0,
        rewardUnlocked: false,
        rewardCode: null,
        createdAt: now,
        signature,
      });

      return res.status(200).json({
        ok: true,
        id: String(result.insertedId),
        createdAtET: getET(now),
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("combos error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
};
