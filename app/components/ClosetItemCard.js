"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { nearestColorName } from "../../lib/colorNames";

export default function ClosetItemCard({ item, isFrontOfCloset, onWear, onDelete }) {
  const [wearing, setWearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleWear() {
    setWearing(true);
    try {
      await onWear(item.id);
    } finally {
      setWearing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove this ${item.category} from your closet?`)) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
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

      <button
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Remove ${item.category} from closet`}
        className="btn-glass"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 26,
          height: 26,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          fontSize: "0.8rem",
          lineHeight: 1,
          zIndex: 1
        }}
      >
        {deleting ? "…" : "✕"}
      </button>

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
            <span key={tag} className="chip" style={{ padding: "2px 9px 2px 5px", fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 11, height: 11, borderRadius: "50%", background: tag, border: "1px solid rgba(255,255,255,0.35)", flexShrink: 0 }} />
              {nearestColorName(tag)}
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
