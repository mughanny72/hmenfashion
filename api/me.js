import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB;

// Cache the connection across serverless invocations (Vercel)
let cached = global._mongo;
if (!cached) cached = global._mongo = { client: null, db: null, promise: null };

function maskMongoUri(uri) {
  try {
    if (!uri) return uri;
    // mask password part in mongodb+srv://user:pass@host
    return uri.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@)/, "$1***$3");
  } catch {
    return "[unmaskable]";
  }
}

async function getDb() {
  if (!URI) throw new Error("Missing env MONGODB_URI");
  if (!DB_NAME) throw new Error("Missing env MONGODB_DB");

  if (cached.db) return cached.db;

  if (!cached.promise) {
    const client = new MongoClient(URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });

    cached.promise = client.connect().then((c) => {
      return { client: c, db: c.db(DB_NAME) };
    });
  }

  const conn = await cached.promise;
  cached.client = conn.client;
  cached.db = conn.db;

  return cached.db;
}

export default async function handler(req, res) {
  try {
    // ✅ TEMP DEBUG (remove after fixed)
    console.log("ENV CHECK DB:", DB_NAME);
    console.log("ENV CHECK URI:", maskMongoUri(URI));

    const email = (req.query.email || "").toString().trim().toLowerCase();
    if (!email) return res.status(400).json({ ok: false, error: "Missing email" });

    const db = await getDb();
    const users = db.collection("subscribers");

    const u = await users.findOne({ email });
    if (!u) return res.status(200).json({ ok: true, found: false, status: "none" });

    const status = String(u.status || "");
    const isActive = ["active", "trialing"].includes(status);

    return res.status(200).json({
      ok: true,
      found: true,
      email: u.email,
      status,
      isActive,
      currentPeriodEnd: u.currentPeriodEnd || null,
    });
  } catch (e) {
    console.error("ME API ERROR:", e);
    return res.status(500).json({
      ok: false,
      error: "Server error",
      detail: String(e?.message || e),
    });
  }
}