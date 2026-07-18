import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI — copy .env.example to .env.local and fill it in.");
}

let clientPromise;

// Vercel/Next.js API routes are serverless: a fresh MongoClient per request
// will blow through Atlas's connection limit fast. Cache the connection
// promise across invocations of the same warm instance (and across HMR
// reloads in dev) instead of creating a new client every time.
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || "closet_app");
}

export default clientPromise;
