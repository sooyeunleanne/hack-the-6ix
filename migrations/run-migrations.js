// Run with: npm run migrate
// Applies each migration's up(db) in order. Safe to re-run — every
// migration checks for existing collections/indexes before creating them.
require("dotenv").config({ path: ".env.local" });
const { MongoClient } = require("mongodb");

const migrations = [
  require("./001_create_users"),
  require("./002_create_closet_items"),
  require("./003_create_outfit_log"),
  require("./004_create_tryon_cache"),
  require("./005_create_shopping_suggestions")
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI — copy .env.example to .env.local and fill it in.");
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "closet_app");

  for (const migration of migrations) {
    console.log(`Running ${migration.name}...`);
    await migration.up(db);
  }

  console.log("\nAll migrations applied.");
  await client.close();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
