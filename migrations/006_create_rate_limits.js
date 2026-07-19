module.exports = {
  name: "006_create_rate_limits",
  async up(db) {
    const existing = await db.listCollections({ name: "rate_limits" }).toArray();
    if (existing.length === 0) {
      await db.createCollection("rate_limits", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "bucket", "window", "count", "created_at"],
            properties: {
              user_id: { bsonType: "string" },
              bucket: { bsonType: "string" },
              window: { bsonType: ["int", "long", "double"] },
              count: { bsonType: ["int", "long", "double"] },
              created_at: { bsonType: "date" }
            }
          }
        },
        validationLevel: "moderate",
        validationAction: "warn"
      });
      console.log('  created collection "rate_limits"');
    }

    // Matches the upsert key in lib/rateLimit.js — one doc per user+bucket+window.
    await db.collection("rate_limits").createIndex(
      { user_id: 1, bucket: 1, window: 1 },
      { unique: true }
    );
    console.log("  ensured unique index on rate_limits.user_id+bucket+window");

    // Every window used today is 10 minutes or less — 2 hours of margin
    // means old windows self-expire and the collection never grows unbounded.
    await db.collection("rate_limits").createIndex(
      { created_at: 1 },
      { expireAfterSeconds: 7200 }
    );
    console.log("  ensured TTL index on rate_limits.created_at");
  }
};
