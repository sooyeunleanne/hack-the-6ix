"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function ShoppingListPanel({ onSuggestion }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shopping-suggestions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't put together a list");
      setSuggestions(data);
      if (data.suggestedItems?.[0]) {
        onSuggestion?.(`A little shopping magic: consider a ${data.suggestedItems[0].name.toLowerCase()} — ${data.suggestedItems[0].reason}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-panel" style={{ padding: 22 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", color: "var(--cream)" }}>
        🛍️ Fill the Gaps
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: "0.78rem", color: "var(--periwinkle-soft)" }}>
        Gemini spots what's missing from your closet — a text-first wish list.
      </p>

      <button className="btn-gold" style={{ width: "100%" }} onClick={handleGenerate} disabled={loading}>
        {loading ? "Reading the closet…" : "What should I buy?"}
      </button>

      {error && <p style={{ color: "var(--blush)", fontSize: "0.8rem" }}>{error}</p>}

      {suggestions && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16 }}>
          {suggestions.mock && (
            <span className="chip" style={{ marginBottom: 10, display: "inline-block" }}>
              demo mode
            </span>
          )}
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {suggestions.suggestedItems.map((item, i) => (
              <li
                key={i}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "10px 14px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <strong style={{ color: "var(--cream)", fontSize: "0.88rem" }}>{item.name}</strong>
                  <span className="chip" style={{ padding: "1px 9px", fontSize: "0.65rem" }}>
                    {item.category}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--periwinkle-soft)" }}>{item.reason}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </section>
  );
}
