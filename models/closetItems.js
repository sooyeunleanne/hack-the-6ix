import { ObjectId } from "mongodb";
import { getDb } from "../lib/mongodb";

export async function createClosetItem(userId, { imageUrl, category, colorTags = [] }) {
  const db = await getDb();
  const doc = {
    user_id: new ObjectId(userId),
    image_url: imageUrl,
    category,
    color_tags: colorTags,
    wear_count: 0,
    last_worn_at: null,
    created_at: new Date()
  };
  const result = await db.collection("closet_items").insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function getClosetItemsByUser(userId, { sortByWear = false } = {}) {
  const db = await getDb();
  const cursor = db.collection("closet_items").find({ user_id: new ObjectId(userId) });
  if (sortByWear) cursor.sort({ wear_count: 1 }); // least-worn first — front-of-closet ordering
  return cursor.toArray();
}

export async function getClosetItemById(itemId, userId) {
  const db = await getDb();
  return db.collection("closet_items").findOne({
    _id: new ObjectId(itemId),
    user_id: new ObjectId(userId)
  });
}

export async function updateClosetItemTags(itemId, userId, { category, colorTags } = {}) {
  const db = await getDb();
  const update = {};
  if (category !== undefined) update.category = category;
  if (colorTags !== undefined) update.color_tags = colorTags;
  if (Object.keys(update).length === 0) return;
  const result = await db.collection("closet_items").updateOne(
    { _id: new ObjectId(itemId), user_id: new ObjectId(userId) },
    { $set: update }
  );
  return result.matchedCount > 0;
}

export async function deleteClosetItem(itemId, userId) {
  const db = await getDb();
  const result = await db.collection("closet_items").deleteOne({
    _id: new ObjectId(itemId),
    user_id: new ObjectId(userId)
  });
  return result.deletedCount > 0;
}

export async function markWorn(itemId) {
  const db = await getDb();
  await db.collection("closet_items").updateOne(
    { _id: new ObjectId(itemId) },
    { $inc: { wear_count: 1 }, $set: { last_worn_at: new Date() } }
  );
}

// Donation-nudge heuristic: never worn + older than staleDays.
// Bottom-20%-by-wear-count can be layered on top of this in the UI/route
// once there's real usage data to rank against.
export async function getDonationCandidates(userId, { staleDays = 60 } = {}) {
  const db = await getDb();
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
  return db.collection("closet_items").find({
    user_id: new ObjectId(userId),
    wear_count: 0,
    created_at: { $lt: cutoff }
  }).toArray();
}
