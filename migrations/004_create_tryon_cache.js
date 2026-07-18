module.exports = {
  name: "004_create_tryon_cache",
  async up(db) {
    const existing = await db.listCollections({ name: "tryon_cache" }).toArray();
    if (existing.length === 0) {
      await db.createCollection("tryon_cache", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["item_ids_hash", "generated_image_url", "created_at"],
            properties: {
              item_ids_hash: { bsonType: "string" },
              item_ids: { bsonType: "array" },
              generated_image_url: { bsonType: "string" },
              created_at: { bsonType: "date" }
            }
          }
        },
        validationLevel: "moderate",
        validationAction: "warn"
      });
      console.log('  created collection "tryon_cache"');
    }

    // Unique so a given item combo only ever has one cached render.
    await db.collection("tryon_cache").createIndex({ item_ids_hash: 1 }, { unique: true });
    console.log("  ensured unique index on tryon_cache.item_ids_hash");
  }
};
