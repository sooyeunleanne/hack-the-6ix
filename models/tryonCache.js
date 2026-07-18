import { getDb } from "../lib/mongodb";
import { hashItemIds } from "../lib/hash";

// Nano Banana calls are the slowest/flakiest dependency in this app —
// always check this cache before calling the API, and always save
// successful results here. This also doubles as your judging-day fallback
// if the API is slow or down.
export async function getCachedTryon(itemIds) {
  const db = await getDb();
  const key = hashItemIds(itemIds);
  return db.collection("tryon_cache").findOne({ item_ids_hash: key });
}

export async function saveTryonResult(itemIds, generatedImageUrl) {
  const db = await getDb();
  const key = hashItemIds(itemIds);
  await db.collection("tryon_cache").updateOne(
    { item_ids_hash: key },
    {
      $set: {
        item_ids_hash: key,
        item_ids: itemIds,
        generated_image_url: generatedImageUrl,
        created_at: new Date()
      }
    },
    { upsert: true }
  );
}
