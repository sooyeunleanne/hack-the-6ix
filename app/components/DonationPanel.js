"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DonationDecisionModal from "./DonationDecisionModal";

// Underneath the closet bot: surfaces never-worn, stale items with a
// Gemini-written *reason* (not just "least worn"), and a "Let's decide"
// flow that tries restyling and altering before ever suggesting donation.
export default function DonationPanel({ items, onDelete }) {
  const [candidates, setCandidates] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [reasoning, setReasoning] = useState({});
  const [decisionItem, setDecisionItem] = useState(null);

  useEffect(() => {
    fetch("/api/closet-items/donation-candidates")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.items || []).map((i) => ({
          id: i._id.toString ? i._id.toString() : i._id,
          imageUrl: i.image_url,
          category: i.category
        }));
        setCandidates(list);
        setLoaded(true);
        list.forEach((item) => fetchReasoning(item.id));
      })
      .catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReasoning(itemId) {
    setReasoning((prev) => ({ ...prev, [itemId]: { loading: true } }));
    try {
      const res = await fetch(`/api/closet-items/${itemId}/donation-recommendation`);
      const data = await res.json();
      setReasoning((prev) => ({ ...prev, [itemId]: { loading: false, ...data } }));
    } catch {
      setReasoning((prev) => ({ ...prev, [itemId]: { loading: false, explanation: null } }));
    }
  }

  function handleResolved(itemId, { deleted }) {
    setCandidates((prev) => prev.filter((c) => c.id !== itemId));
    setDecisionItem(null);
    if (deleted) onDelete?.(itemId);
  }

  if (!loaded || candidates.length === 0) return null;

  return (
    <section className="glass-panel" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", color: "var(--cream)" }}>
          🎀 Worth Donating?
        </h3>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--periwinkle-soft)" }}>
          Pieces that have sat unworn a while — with a reason, not just a wear count.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <AnimatePresence>
          {candidates.map((item) => {
            const r = reasoning[item.id] || { loading: true };
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 10,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)"
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.08)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.category} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--cream)", lineHeight: 1.4 }}>
                    {r.loading ? "✨ Thinking about this one…" : r.explanation}
                  </p>
                  <button
                    onClick={() => setDecisionItem(item)}
                    className="btn-glass"
                    style={{ alignSelf: "flex-start", fontSize: "0.72rem", padding: "6px 12px" }}
                  >
                    Let&apos;s decide
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {decisionItem && (
        <DonationDecisionModal
          item={decisionItem}
          items={items}
          onClose={() => setDecisionItem(null)}
          onResolved={(result) => handleResolved(decisionItem.id, result)}
        />
      )}
    </section>
  );
}
