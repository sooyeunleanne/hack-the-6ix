"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { nearestColorName } from "../../lib/colorNames";

export default function ClosetItemCard({ item, isFrontOfCloset, onWear, onDelete, selected, onSelectToggle, colorMatch }) {
  const [wearing, setWearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const matchGood = colorMatch?.tier === "good";
  const matchSoso = colorMatch?.tier === "soso";

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

  function handleSelectToggle() {
    onSelectToggle?.(item.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass-panel"
      style={{
        padding: 14,
        borderRadius: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: selected
          ? "2px solid var(--gold)"
          : isFrontOfCloset
          ? "1px solid rgba(207,224,251,0.5)"
          : "1px solid var(--glass-border)",
        boxShadow: selected
          ? "0 0 26px rgba(240,200,90,0.55)"
          : isFrontOfCloset
          ? "0 0 18px rgba(207,224,251,0.28)"
          : "var(--shadow-soft)",
        position: "relative"
      }}
    >
      {isFrontOfCloset && (
        <span
          className="chip least-worn-badge"
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            fontSize: "0.72rem",
            padding: "5px 12px",
            zIndex: 1
          }}
        >
          Least worn
        </span>
      )}

      <button
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Remove ${item.category} from closet`}
        className="tile-delete-btn"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 30,
          height: 30,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          fontSize: "0.9rem",
          fontWeight: 700,
          lineHeight: 1,
          boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          zIndex: 1
        }}
      >
        {deleting ? "…" : "✕"}
      </button>

      <div
        className="selectable-photo"
        onClick={handleSelectToggle}
        role="button"
        aria-pressed={selected}
        aria-label={selected ? "Remove from outfit" : "Add to outfit"}
        title={selected ? "Remove from outfit" : "Tap to add to outfit"}
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
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "auto 0 0 0",
            height: "38%",
            background: "linear-gradient(to top, rgba(15,19,48,0.55), transparent)",
            pointerEvents: "none"
          }}
        />
        <span className={`select-badge${selected ? " selected" : ""}`}>{selected ? "✓" : "+"}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <strong
          style={{
            color: "var(--cream)",
            fontSize: "0.94rem",
            letterSpacing: "0.01em",
            textTransform: "capitalize"
          }}
        >
          {item.category}
        </strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
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
        <span className="chip" style={{ alignSelf: "flex-start", padding: "2px 10px", fontSize: "0.68rem" }}>
          worn {item.wearCount}×
        </span>
      </div>

      <button
        onClick={handleWear}
        disabled={wearing}
        className="btn-glass"
        style={{ fontSize: "0.78rem", padding: "9px 12px" }}
      >
        {wearing ? "Marking…" : "I wore this today"}
      </button>
    </motion.div>
  );
}
