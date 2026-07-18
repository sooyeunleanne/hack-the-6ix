import crypto from "crypto";

// Deterministic cache key for a set of closet items being composited
// together in a try-on. Order-independent so {A,B} and {B,A} hit the
// same cache entry.
export function hashItemIds(itemIds) {
  const sorted = [...itemIds].map(String).sort();
  return crypto.createHash("sha256").update(sorted.join(",")).digest("hex");
}
