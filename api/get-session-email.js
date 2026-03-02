// api/get-session-email.js
const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

module.exports = async (req, res) => {
  try {
    const sessionId = String(req.query.session_id || "").trim();
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // email can be in customer_details.email OR metadata.email
    const email =
      (session.customer_details && session.customer_details.email) ||
      (session.metadata && session.metadata.email) ||
      "";

    return res.status(200).json({ ok: true, email });
  } catch (e) {
    console.error("get-session-email error:", e);
    return res.status(500).json({ ok: false, error: "Server error", detail: String(e?.message || e) });
  }
};