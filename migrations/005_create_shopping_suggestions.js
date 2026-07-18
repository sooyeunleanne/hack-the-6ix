module.exports = {
  name: "005_create_shopping_suggestions",
  async up(db) {
    const existing = await db.listCollections({ name: "shopping_suggestions" }).toArray();
    if (existing.length === 0) {
      await db.createCollection("shopping_suggestions", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "created_at"],
            properties: {
              user_id: { bsonType: "objectId" },
              outfit_context: { bsonType: ["object", "null"] },
              suggested_items: { bsonType: ["array", "null"] },
              created_at: { bsonType: "date" }
            }
          }
        },
        validationLevel: "moderate",
        validationAction: "warn"
      });
      console.log('  created collection "shopping_suggestions"');
    }

    await db.collection("shopping_suggestions").createIndex({ user_id: 1, created_at: -1 });
    console.log("  ensured index on shopping_suggestions");
  }
};
