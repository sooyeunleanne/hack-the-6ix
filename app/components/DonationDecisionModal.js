"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Item photos are stored as base64 data URLs (no real image host), so
// classic "share to Facebook/Twitter" links can't work — those need a
// fetchable public URL. The Web Share API can share the actual image file
// directly to whatever apps are installed instead; copy/download cover
// browsers that don't support it.
async function imageToFile(imageUrl, category) {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  return new File([blob], `${(category || "item").toLowerCase()}.jpg`, { type: blob.type || "image/jpeg" });
}

// Decision tree before donation: don't jump straight to "donate this" —
// try restyling it first, and only offer donate/sell/swap once that's
// been considered and declined.
export default function DonationDecisionModal({ item, items, onClose, onResolved }) {
  const [step, setStep] = useState("restyle");
  const [ideas, setIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [shareState, setShareState] = useState("idle"); // idle | sharing | copied | error
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    fetch(`/api/closet-items/${item.id}/restyle-ideas`)
      .then((res) => res.json())
      .then((data) => {
        setIdeas(data.ideas || []);
        setIdeasLoading(false);
      })
      .catch(() => setIdeasLoading(false));
  }, [item.id]);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && Boolean(navigator.share));
  }, []);

  function itemsFor(ids) {
    return items.filter((i) => (ids || []).includes(i.id));
  }

  async function handleRemove() {
    onResolved({ deleted: true });
  }

  async function handleNativeShare() {
    setShareState("sharing");
    try {
      const file = await imageToFile(item.imageUrl, item.category);
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        throw new Error("File sharing not supported");
      }
      await navigator.share({
        files: [file],
        title: "Up for grabs from my closet!",
        text: `Anyone want this ${item.category.toLowerCase()}? Free to a good home.`
      });
      setShareState("idle");
    } catch (err) {
      if (err?.name === "AbortError") {
        setShareState("idle");
      } else {
        setShareState("error");
      }
    }
  }

  async function handleCopyImage() {
    setShareState("sharing");
    try {
      const file = await imageToFile(item.imageUrl, item.category);
      await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("error");
    }
  }

  function handleDownloadImage() {
    const a = document.createElement("a");
    a.href = item.imageUrl;
    a.download = `${(item.category || "item").toLowerCase()}.jpg`;
    a.click();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,19,48,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
        padding: 20
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "86vh",
          overflowY: "auto",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          background: "rgba(15,19,48,0.97)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.category} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", color: "var(--cream)" }}>Before we donate this…</h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--periwinkle-soft)" }}>{item.category}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--periwinkle-soft)", fontSize: 20, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "restyle" && (
            <motion.div key="restyle" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cream)" }}>
                Can it be styled differently? Here are 5 outfits your godmother came up with:
              </p>

              {ideasLoading ? (
                <p style={{ fontSize: "0.8rem", color: "var(--periwinkle-soft)" }}>✨ Dreaming up outfits…</p>
              ) : ideas.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "var(--periwinkle-soft)" }}>Couldn&apos;t find a fresh pairing this time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ideas.map((idea, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: 8, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {itemsFor(idea.itemIds).map((it) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={it.id} src={it.imageUrl} alt={it.category} style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", border: "1px solid var(--glass-border)" }} />
                        ))}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--periwinkle-soft)" }}>{idea.description}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={onClose} className="btn-gold" style={{ flex: 1, fontSize: "0.8rem" }}>
                  Love it — I&apos;ll keep it!
                </button>
                <button onClick={() => setStep("final")} className="btn-glass" style={{ flex: 1, fontSize: "0.8rem" }}>
                  Still not interested
                </button>
              </div>
            </motion.div>
          )}

          {step === "final" && (
            <motion.div key="final" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cream)" }}>
                No shame in that — let&apos;s give it a new home instead.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href="https://www.google.com/maps/search/clothing+donation+near+me"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-glass"
                  style={{ flex: 1, textAlign: "center", textDecoration: "none", fontSize: "0.78rem", padding: "10px 8px" }}
                >
                  Donate
                </a>
                <a
                  href="https://www.google.com/search?q=sell+clothes+online+near+me"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-glass"
                  style={{ flex: 1, textAlign: "center", textDecoration: "none", fontSize: "0.78rem", padding: "10px 8px" }}
                >
                  Sell
                </a>
                <button
                  onClick={() => setStep("share")}
                  className="btn-glass"
                  style={{ flex: 1, fontSize: "0.78rem", padding: "10px 8px" }}
                >
                  Swap
                </button>
              </div>
              <button onClick={handleRemove} className="btn-gold" style={{ fontSize: "0.8rem" }}>
                Done — remove it from my closet
              </button>
              <button onClick={onClose} className="btn-glass" style={{ fontSize: "0.75rem" }}>
                Actually, I&apos;ll keep it for now
              </button>
            </motion.div>
          )}

          {step === "share" && (
            <motion.div key="share" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cream)" }}>
                Share this piece with friends and family who might want it:
              </p>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: 120, height: 120, borderRadius: 12, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.category} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </div>

              {canNativeShare && (
                <button onClick={handleNativeShare} className="btn-gold" disabled={shareState === "sharing"} style={{ fontSize: "0.8rem" }}>
                  {shareState === "sharing" ? "Opening share sheet…" : "📤 Share to Messages, WhatsApp, Instagram…"}
                </button>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleCopyImage} className="btn-glass" disabled={shareState === "sharing"} style={{ flex: 1, fontSize: "0.75rem", padding: "10px 8px" }}>
                  {shareState === "copied" ? "Copied!" : "📋 Copy image"}
                </button>
                <button onClick={handleDownloadImage} className="btn-glass" style={{ flex: 1, fontSize: "0.75rem", padding: "10px 8px" }}>
                  ⬇️ Download image
                </button>
              </div>

              {shareState === "error" && (
                <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--blush)" }}>
                  Sharing didn&apos;t work on this browser — try copying or downloading instead.
                </p>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep("final")} className="btn-glass" style={{ flex: 1, fontSize: "0.75rem" }}>
                  ← Back
                </button>
                <button onClick={handleRemove} className="btn-gold" style={{ flex: 1, fontSize: "0.75rem" }}>
                  Done — remove it from my closet
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
