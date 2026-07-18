"use client";

import { motion, AnimatePresence } from "framer-motion";

async function shareItem(item) {
  const text = `Never worn this ${item.category.toLowerCase()} — up for grabs! 🪄`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Bibbity Bobbity Boo", text });
    } catch {
      /* user cancelled — fine */
    }
  } else {
    await navigator.clipboard.writeText(text);
    alert("Copied a share message to your clipboard!");
  }
}

export default function DonateNudges({ candidates }) {
  if (candidates.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
        style={{
          padding: "18px 22px",
          marginBottom: 8,
          border: "1px solid var(--blush)",
          boxShadow: "0 0 24px rgba(247,201,216,0.3)"
        }}
      >
        <h3 style={{ margin: "0 0 10px", fontSize: "1.05rem", color: "var(--blush)" }}>
          🎀 Time to let go? These have never left the closet
        </h3>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
          {candidates.map((item) => (
            <div
              key={item.id}
              style={{
                minWidth: 120,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: 8
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.category}
                style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8 }}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--cream)", textTransform: "capitalize" }}>
                {item.category}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => shareItem(item)}
                  className="btn-glass"
                  style={{ flex: 1, fontSize: "0.68rem", padding: "6px 4px" }}
                >
                  Share
                </button>
                <a
                  href="https://www.google.com/maps/search/clothing+donation+near+me"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-glass"
                  style={{ flex: 1, fontSize: "0.68rem", padding: "6px 4px", textAlign: "center", textDecoration: "none" }}
                >
                  Donate
                </a>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
