module.exports = {
  name: "002_create_closet_items",
  async up(db) {
    const existing = await db.listCollections({ name: "closet_items" }).toArray();
    if (existing.length === 0) {
      await db.createCollection("closet_items", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "image_url", "category", "created_at"],
            properties: {
              user_id: { bsonType: "objectId" },
              image_url: { bsonType: "string" },
              category: { bsonType: "string" },
              color_tags: { bsonType: "array", items: { bsonType: "string" } },
              wear_count: { bsonType: "int" },
              last_worn_at: { bsonType: ["date", "null"] },
              created_at: { bsonType: "date" }
            }
          }
        },
        validationLevel: "moderate",
        validationAction: "warn"
      });
      console.log('  created collection "closet_items"');
    }

    const col = db.collection("closet_items");
    await col.createIndex({ user_id: 1 });
    // Supports the "front of closet / back of closet" wear-reorder query.
    await col.createIndex({ user_id: 1, wear_count: 1 });
    console.log("  ensured indexes on closet_items");
  }
};
