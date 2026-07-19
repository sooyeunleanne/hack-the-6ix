import { getDb } from "./mongodb";

// Fixed-window limiter backed by Mongo, not memory — a serverless function's
// in-memory counter resets on every cold start/new instance and wouldn't
// actually cap spend on the Gemini/ElevenLabs APIs in production. One doc
// per (user, bucket, window); bucket is per-route so a spike on one feature
// (e.g. try-on) can't starve the limit for another (e.g. voice).
export async function checkRateLimit(userId, bucket, { limit, windowSeconds }) {
  const db = await getDb();
  const window = Math.floor(Date.now() / (windowSeconds * 1000));

  const doc = await db.collection("rate_limits").findOneAndUpdate(
    { user_id: String(userId), bucket, window },
    { $inc: { count: 1 }, $setOnInsert: { created_at: new Date() } },
    { upsert: true, returnDocument: "after" }
  );

  return { allowed: doc.count <= limit, count: doc.count, limit, retryAfterSeconds: windowSeconds };
}
