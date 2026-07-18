import { ObjectId } from "mongodb";
import { getDb } from "../lib/mongodb";

export async function saveSuggestion(userId, { outfitContext, suggestedItems }) {
  const db = await getDb();
  const doc = {
    user_id: new ObjectId(userId),
    outfit_context: outfitContext,
    suggested_items: suggestedItems,
    created_at: new Date()
  };
  const result = await db.collection("shopping_suggestions").insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function getSuggestionsByUser(userId, { limit = 20 } = {}) {
  const db = await getDb();
  return db.collection("shopping_suggestions")
    .find({ user_id: new ObjectId(userId) })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}
