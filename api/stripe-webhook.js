import Stripe from "stripe";
import { MongoClient } from "mongodb";

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Reuse client across invocations (good on Vercel)
const client = new MongoClient(process.env.MONGODB_URI);

async function readRawBody(req) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  let event;

  // 1) Verify signature
  try {
    const rawBody = await readRawBody(req);
    const sig = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2) Handle event
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const email =
        (session.customer_details?.email || "").toString().trim().toLowerCase();

      if (!email) {
        console.warn("checkout.session.completed: missing customer email");
        return res.status(200).json({ received: true });
      }

      if (!session.subscription) {
        console.log("checkout.session.completed: no subscription on session");
        return res.status(200).json({ received: true });
      }

      // Pull subscription status + current period end from Stripe
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );

      await client.connect();
      const db = client.db(process.env.MONGODB_DB);
      const users = db.collection("subscribers");

      await users.updateOne(
        { email },
        {
          $set: {
            email,
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: subscription.id,
            status: subscription.status, // active / trialing / etc.
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      console.log("✅ Subscription saved to MongoDB:", email, subscription.status);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).send("Webhook handler failed");
  }
}