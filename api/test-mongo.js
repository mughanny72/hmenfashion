// api/test-mongo.js
// Quick diagnostic: confirms MONGODB_URI actually connects. Safe to delete after testing.
const { MongoClient } = require("mongodb");

module.exports = async (req, res) => {
  try {
    if (!process.env.MONGODB_URI) {
      return res.status(500).json({ ok: false, error: "MONGODB_URI is not set." });
    }
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const dbName = process.env.MONGODB_DB || "(default)";
    const db = client.db(process.env.MONGODB_DB);
    const collections = await db.listCollections().toArray();
    await client.close();
    return res.status(200).json({
      ok: true,
      message: "MongoDB connection successful.",
      database: dbName,
      collections: collections.map((c) => c.name),
    });
  } catch (e) {
    console.error("test-mongo error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
};
