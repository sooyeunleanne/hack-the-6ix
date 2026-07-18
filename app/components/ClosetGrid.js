"use client";

import { AnimatePresence, motion } from "framer-motion";
import ClosetItemCard from "./ClosetItemCard";

// Exported so DashboardClient can compute the same "least worn" set for its
// filter toggle — keeps the toggle and the on-tile badge always in sync.
export const CATEGORY_ORDER = ["Outerwear", "Top", "Bottom", "Dress", "Shoes", "Accessory", "Bag", "Other"];
export const LEAST_WORN_COUNT = 3;

function groupByCategory(items) {
  const grouped = {};
  CATEGORY_ORDER.forEach((c) => (grouped[c] = []));
  items.forEach((item) => {
    const category = CATEGORY_ORDER.includes(item.category) ? item.category : "Other";
    grouped[category].push(item);
  });
  return grouped;
}

// An item only earns the "Least worn" badge if it's both in the bottom
// LEAST_WORN_COUNT of its category (by wear count — items arrive pre-sorted
// ascending) AND actually worn less than that category's most-worn piece.
// Without the second check, a category with only 1-2 items would badge
// every item in it — including ones worn constantly — just because they
// trivially rank in the "front."
export function getLeastWornIds(items) {
  const grouped = groupByCategory(items);
  const ids = new Set();

  CATEGORY_ORDER.forEach((category) => {
    const categoryItems = grouped[category];
    if (categoryItems.length === 0) return;

    const frontCount = Math.min(LEAST_WORN_COUNT, categoryItems.length);
    const maxWear = Math.max(...categoryItems.map((item) => item.wearCount || 0));

    categoryItems.slice(0, frontCount).forEach((item) => {
      if ((item.wearCount || 0) < maxWear) ids.add(item.id);
    });
  });

  return ids;
}

// leastWornIds must be computed from the user's FULL closet (see
// DashboardClient) and passed in — never recomputed from `items` here,
// since `items` may already be narrowed by the category/least-worn filters,
// which would corrupt the per-category "max wear" comparison inside
// getLeastWornIds.
export default function ClosetGrid({ items, onWear, onDelete, selectedItemIds = [], onSelectToggle, outfitMatches, leastWornIds }) {
  if (items.length === 0) {
    return (
      <div
        className="glass-panel"
        style={{ padding: 32, textAlign: "center", color: "var(--periwinkle-soft)" }}
      >
        Your closet is empty for now. Add your first piece and watch the
        magic begin.
      </div>
    );
  }

  const grouped = groupByCategory(items);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      {CATEGORY_ORDER.map((category) => {
        const categoryItems = grouped[category];
        if (categoryItems.length === 0) return null;

        return (
          <section key={category}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--cream)" }}>{category}</h3>
                <p style={{ margin: "5px 0 0", color: "var(--periwinkle-soft)", fontSize: "0.8rem" }}>
                  {categoryItems.length} item{categoryItems.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="chip" style={{ padding: "5px 10px", fontSize: "0.75rem" }}>
                {categoryItems.filter((item) => selectedItemIds.includes(item.id)).length} selected
              </span>
            </div>
            <motion.div layout className="closet-grid">
              <AnimatePresence>
                {categoryItems.map((item) => (
                  <ClosetItemCard
                    key={item.id}
                    item={item}
                    isFrontOfCloset={Boolean(leastWornIds?.has(item.id))}
                    onWear={onWear}
                    onDelete={onDelete}
                    selected={selectedItemIds.includes(item.id)}
                    onSelectToggle={onSelectToggle}
                    outfitMatch={outfitMatches?.get(item.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </section>
        );
      })}
    </div>
  );
}