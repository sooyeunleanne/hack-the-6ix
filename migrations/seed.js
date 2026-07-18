// Run with: npm run seed
// Creates one demo user + a handful of closet items so Claire and Leanne
// have data to build against before real auth/upload flows are wired up.
// Safe to re-run — skips insertion if the demo data already exists.
require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");

const DEMO_AUTH0_ID = "demo|seed-user";

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI — copy .env.example to .env.local and fill it in.");
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "closet_app");

  const usersCol = db.collection("users");
  let user = await usersCol.findOne({ auth0_id: DEMO_AUTH0_ID });
  if (!user) {
    const result = await usersCol.insertOne({
      auth0_id: DEMO_AUTH0_ID,
      email: "demo@closetapp.test",
      full_body_photo_url: null,
      style_prefs: { vibes: ["y2k", "cute"], favorite_colors: ["black", "lavender"] },
      created_at: new Date()
    });
    user = { _id: result.insertedId };
    console.log("Created demo user:", user._id.toString());
  } else {
    console.log("Demo user already exists:", user._id.toString());
  }

  const sampleItems = [
    { category: "top", color_tags: ["white"], image_url: "https://placehold.co/400x400?text=White+Tee" },
    { category: "bottom", color_tags: ["blue"], image_url: "https://placehold.co/400x400?text=Blue+Jeans" },
    { category: "shoes", color_tags: ["black"], image_url: "https://placehold.co/400x400?text=Black+Boots" },
    { category: "accessory", color_tags: ["gold"], image_url: "https://placehold.co/400x400?text=Gold+Necklace" }
  ];

  const itemsCol = db.collection("closet_items");
  const existingCount = await itemsCol.countDocuments({ user_id: user._id });
  if (existingCount === 0) {
    const docs = sampleItems.map((item) => ({
      user_id: user._id,
      ...item,
      wear_count: 0,
      last_worn_at: null,
      created_at: new Date()
    }));
    await itemsCol.insertMany(docs);
    console.log(`Inserted ${docs.length} sample closet items.`);
  } else {
    console.log("Sample closet items already present, skipping.");
  }

  await client.close();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
