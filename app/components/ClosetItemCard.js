"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function ClosetItemCard({ item, isFrontOfCloset, onWear }) {
  const [wearing, setWearing] = useState(false);

  async function handleWear() {
    setWearing(true);
    try {
      await onWear(item.id);
    } finally {
      setWearing(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="glass-panel"
      style={{
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        border: isFrontOfCloset ? "1px solid var(--gold)" : "1px solid var(--glass-border)",
        boxShadow: isFrontOfCloset ? "0 0 22px rgba(240,200,90,0.45)" : "var(--shadow-soft)",
        position: "relative"
      }}
    >
      {isFrontOfCloset && (
        <span
          className="chip"
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "linear-gradient(135deg, var(--gold), var(--gold-deep))",
            color: "var(--midnight-deep)",
            border: "none",
            fontWeight: 700,
            zIndex: 1
          }}
        >
          ✨ wear me
        </span>
      )}

      <div
        style={{
          width: "100%",
          aspectRatio: "3 / 4",
          borderRadius: 14,
          overflow: "hidden",
          background: "rgba(255,255,255,0.08)"
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.category}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <strong style={{ color: "var(--cream)", fontSize: "0.92rem", textTransform: "capitalize" }}>
          {item.category}
        </strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(item.colorTags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="chip" style={{ padding: "2px 9px", fontSize: "0.68rem" }}>
              {tag}
            </span>
          ))}
          {(item.styleTags || []).slice(0, 3).map((tag) => (
            <span key={tag} className="chip" style={{ padding: "2px 9px", fontSize: "0.68rem", background: "rgba(240,200,90,0.16)", color: "var(--gold)" }}>
              #{tag}
            </span>
          ))}
        </div>
        <span style={{ fontSize: "0.72rem", color: "var(--periwinkle-soft)" }}>
          worn {item.wearCount}x
        </span>
      </div>

      <button
        onClick={handleWear}
        disabled={wearing}
        className="btn-glass"
        style={{ fontSize: "0.78rem", padding: "8px 12px" }}
      >
        {wearing ? "Marking…" : "I wore this today"}
      </button>
    </motion.div>
  );
}
