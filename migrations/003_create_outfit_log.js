module.exports = {
  name: "003_create_outfit_log",
  async up(db) {
    const existing = await db.listCollections({ name: "outfit_log" }).toArray();
    if (existing.length === 0) {
      await db.createCollection("outfit_log", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "item_ids", "worn_on"],
            properties: {
              user_id: { bsonType: "objectId" },
              item_ids: { bsonType: "array", items: { bsonType: "objectId" } },
              worn_on: { bsonType: "date" },
              occasion: { bsonType: ["string", "null"] }
            }
          }
        },
        validationLevel: "moderate",
        validationAction: "warn"
      });
      console.log('  created collection "outfit_log"');
    }

    await db.collection("outfit_log").createIndex({ user_id: 1, worn_on: -1 });
    console.log("  ensured index on outfit_log");
  }
};
