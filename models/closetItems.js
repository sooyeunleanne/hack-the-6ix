import { ObjectId } from "mongodb";
import { getDb } from "../lib/mongodb";

const ACCESSORY_CATEGORIES = new Set(["Accessory", "Bag", "Shoes"]);

export async function createClosetItem(userId, { imageUrl, category, colorTags = [], styleTags = [], attributes = {} }) {
  const db = await getDb();
  const doc = {
    user_id: new ObjectId(userId),
    image_url: imageUrl,
    category,
    color_tags: colorTags,
    style_tags: styleTags,
    attributes,
    is_accessory: ACCESSORY_CATEGORIES.has(category),
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
  if (category !== undefined) {
    update.category = category;
    update.is_accessory = ACCESSORY_CATEGORIES.has(category);
  }
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

export async function markWorn(itemId, userId) {
  const db = await getDb();
  const result = await db.collection("closet_items").updateOne(
    { _id: new ObjectId(itemId), user_id: new ObjectId(userId) },
    { $inc: { wear_count: 1 }, $set: { last_worn_at: new Date() } }
  );
  return result.matchedCount > 0;
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

// Same category + at least one shared color tag — the "you own three
// similar black cardigans" comparison set for donation reasoning.
export async function getSimilarItems(userId, item) {
  const db = await getDb();
  return db.collection("closet_items").find({
    user_id: new ObjectId(userId),
    _id: { $ne: new ObjectId(item._id) },
    category: item.category,
    color_tags: { $in: item.color_tags || [] }
  }).toArray();
}
