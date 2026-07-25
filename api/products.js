// api/products.js
// Live product catalog, shared by every visitor worldwide (stored in MongoDB, not the browser).
//   GET    /api/products         -> public, returns every product
//   POST   /api/products         -> admin-key required, creates or updates one product (upsert by id)
//   DELETE /api/products?id=xxx  -> admin-key required, deletes one product
import connectToDatabase from "../lib/mongodb.js";
import requireAdmin from "../lib/adminAuth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("products");

    if (req.method === "GET") {
      const products = await col.find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).toArray();
      return res.status(200).json({ ok: true, products });
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const p = req.body;
      if (!p || typeof p !== "object" || Array.isArray(p)) {
        return res.status(400).json({ ok: false, error: "Missing product body" });
      }
      if (!p.id) {
        p.id = "hmf_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      }
      const nowIso = new Date().toISOString();
      p.updatedAt = nowIso;
      if (!p.createdAt) p.createdAt = nowIso;
      delete p._id;
      await col.replaceOne({ id: p.id }, p, { upsert: true });
      return res.status(200).json({ ok: true, product: p });
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
    console.error("products api error:", e);
    return res.status(500).json({ ok: false, error: "Server error", detail: String((e && e.message) || e) });
  }
}
