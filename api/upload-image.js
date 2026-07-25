// api/upload-image.js
// Admin-only. Accepts a base64 photo and stores it in Vercel Blob storage, returning a
// permanent public HTTPS URL. This is what makes photos visible to every visitor worldwide
// (instead of sitting only in one browser's local storage or on one computer's disk).
//
// Requires a Blob store connected to this Vercel project (Vercel Dashboard -> Storage ->
// Create Database -> Blob -> connect to this project). That automatically adds the
// BLOB_READ_WRITE_TOKEN environment variable this code needs — no manual token copying.
const { put } = require("@vercel/blob");
const requireAdmin = require("../lib/adminAuth");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!requireAdmin(req, res)) return;

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        ok: false,
        error: "No Blob store connected yet. In Vercel Dashboard -> Storage, create a Blob store and connect it to this project, then redeploy.",
      });
    }

    const { dataUrl, filename } = req.body || {};
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return res.status(400).json({ ok: false, error: "Missing or invalid dataUrl" });
    }
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ ok: false, error: "Could not parse dataUrl" });

    const mime = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const ext = (mime.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
    const rawName = String(filename || "photo").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) || "photo";
    const finalName = rawName.includes(".") ? rawName : rawName + "." + ext;

    const blob = await put("products/" + finalName, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: true,
    });

    return res.status(200).json({ ok: true, url: blob.url });
  } catch (e) {
    console.error("upload-image error:", e);
    return res.status(500).json({ ok: false, error: "Server error", detail: String((e && e.message) || e) });
  }
};
