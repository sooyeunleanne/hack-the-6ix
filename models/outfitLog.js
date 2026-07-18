import { ObjectId } from "mongodb";
import { getDb } from "../lib/mongodb";

export async function logOutfitWorn(userId, itemIds, { occasion } = {}) {
  const db = await getDb();
  const doc = {
    user_id: new ObjectId(userId),
    item_ids: itemIds.map((id) => new ObjectId(id)),
    worn_on: new Date(),
    occasion: occasion || null
  };
  const result = await db.collection("outfit_log").insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function getOutfitLogByUser(userId, { limit = 50 } = {}) {
  const db = await getDb();
  return db.collection("outfit_log")
    .find({ user_id: new ObjectId(userId) })
    .sort({ worn_on: -1 })
    .limit(limit)
    .toArray();
}
