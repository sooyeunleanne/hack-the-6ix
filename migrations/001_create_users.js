module.exports = {
  name: "001_create_users",
  async up(db) {
    const existing = await db.listCollections({ name: "users" }).toArray();
    if (existing.length === 0) {
      await db.createCollection("users", {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["auth0_id", "created_at"],
            properties: {
              auth0_id: {
                bsonType: "string",
                description: "Auth0 'sub' claim — required, unique"
              },
              email: { bsonType: ["string", "null"] },
              full_body_photo_url: { bsonType: ["string", "null"] },
              style_prefs: { bsonType: ["object", "null"] },
              created_at: { bsonType: "date" }
            }
          }
        },
        validationLevel: "moderate",
        validationAction: "warn" // warn instead of error — keeps hackathon iteration fast
      });
      console.log('  created collection "users"');
    }

    await db.collection("users").createIndex({ auth0_id: 1 }, { unique: true });
    console.log("  ensured unique index on users.auth0_id");
  }
};
