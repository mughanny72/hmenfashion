// api/bundles.js
// Live bundle/combo catalog, shared by every visitor worldwide (stored in MongoDB, not the browser).
//   GET    /api/bundles         -> public, returns every bundle
//   POST   /api/bundles         -> admin-key required, creates or updates one bundle (upsert by id)
//   DELETE /api/bundles?id=xxx  -> admin-key required, deletes one bundle
const connectToDatabase = require("../lib/mongodb");
const requireAdmin = require("../lib/adminAuth");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("bundles");

    if (req.method === "GET") {
      const bundles = await col.find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).toArray();
      return res.status(200).json({ ok: true, bundles });
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const b = req.body;
      if (!b || typeof b !== "object" || Array.isArray(b)) {
        return res.status(400).json({ ok: false, error: "Missing bundle body" });
      }
      if (!b.id) {
        b.id = "hmfb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      }
      const nowIso = new Date().toISOString();
      b.updatedAt = nowIso;
      if (!b.createdAt) b.createdAt = nowIso;
      delete b._id;
      await col.replaceOne({ id: b.id }, b, { upsert: true });
      return res.status(200).json({ ok: true, bundle: b });
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const id = String(req.query.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, error: "Missing id" });
      await col.deleteOne({ id });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    console.error("bundles api error:", e);
    return res.status(500).json({ ok: false, error: "Server error", detail: String((e && e.message) || e) });
  }
};
