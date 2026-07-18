"use client";

import { AnimatePresence, motion } from "framer-motion";
import ClosetItemCard from "./ClosetItemCard";

// Exported so DashboardClient can compute the same "least worn" set for its
// filter toggle — keeps the toggle and the on-tile badge always in sync.
export const CATEGORY_ORDER = ["Outerwear", "Top", "Bottom", "Dress", "Shoes", "Accessory", "Bag", "Other"];
export const LEAST_WORN_COUNT = 3;

export default function ClosetGrid({ items, onWear, onDelete, selectedItemIds = [], onSelectToggle, colorMatches }) {
  if (items.length === 0) {
    return (
      <div
        className="glass-panel"
        style={{ padding: 32, textAlign: "center", color: "var(--periwinkle-soft)" }}
      >
        Your closet is empty for now. Add your first piece and watch the
        magic begin. 🪄
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {});

  items.forEach((item) => {
    const category = CATEGORY_ORDER.includes(item.category) ? item.category : "Other";
    grouped[category].push(item);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      {CATEGORY_ORDER.map((category) => {
        const categoryItems = grouped[category];
        if (categoryItems.length === 0) return null;

        const frontCount = Math.min(LEAST_WORN_COUNT, categoryItems.length);
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
                {categoryItems.map((item, i) => (
                  <ClosetItemCard
                    key={item.id}
                    item={item}
                    isFrontOfCloset={i < frontCount}
                    onWear={onWear}
                    onDelete={onDelete}
                    selected={selectedItemIds.includes(item.id)}
                    onSelectToggle={onSelectToggle}
                    colorMatch={colorMatches?.get(item.id)}
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
