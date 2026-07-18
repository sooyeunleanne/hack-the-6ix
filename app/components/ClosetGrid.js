"use client";

import { AnimatePresence, motion } from "framer-motion";
import ClosetItemCard from "./ClosetItemCard";

export default function ClosetGrid({ items, onWear }) {
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

  // Least-worn items are sorted first by the caller — the front 3 glow as
  // "front of closet," visually surfacing the wear-reorder thesis.
  const frontCount = Math.min(3, items.length);

  return (
    <motion.div layout className="closet-grid">
      <AnimatePresence>
        {items.map((item, i) => (
          <ClosetItemCard key={item.id} item={item} isFrontOfCloset={i < frontCount} onWear={onWear} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
