// lib/adminAuth.js
// Shared write-protection for the admin-only API endpoints (products, bundles, image upload).
// The admin panel (admin.html) sends the key back as the "x-admin-key" header on every
// create/update/delete call. Set ADMIN_API_KEY in Vercel's Project Settings -> Environment
// Variables to any long random string, then paste that same value into admin.html when it
// asks for your Site Admin Key (one-time, stored in that browser's localStorage).
function requireAdmin(req, res) {
  const configured = process.env.ADMIN_API_KEY;
  if (!configured) {
    res.status(500).json({
      ok: false,
      error: "Server is missing the ADMIN_API_KEY environment variable. Set it in Vercel Project Settings -> Environment Variables, then redeploy.",
    });
    return false;
  }

  const header = req.headers["x-admin-key"] || "";
  const bearer = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
  const key = String(header || bearer || "").trim();

  if (!key || key !== configured) {
    res.status(401).json({ ok: false, error: "Unauthorized — missing or incorrect admin key." });
    return false;
  }
  return true;
}

module.exports = requireAdmin;
