"use client";

// Fixed status hues (good/warning/critical) — not themed to the app's gold
// palette on purpose, so the score reads as a status signal, not a style
// choice. Color is paired with a text label, never carrying meaning alone.
const STATUS_STEPS = [
  { min: 80, color: "#0ca30c", label: "Thriving" },
  { min: 50, color: "#fab219", label: "Good progress" },
  { min: 0, color: "#d03b3b", label: "Needs a refresh" }
];

function getStatus(score) {
  return STATUS_STEPS.find((step) => score >= step.min) || STATUS_STEPS[STATUS_STEPS.length - 1];
}

function formatCompact(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export default function ClosetHealthCard({ health }) {
  if (!health || health.totalItems === 0) {
    return (
      <section className="glass-panel" style={{ padding: 26 }}>
        <h2 style={{ fontSize: "1.15rem", color: "var(--cream)", margin: "0 0 6px" }}>🌱 Closet Health</h2>
        <p style={{ margin: 0, color: "var(--periwinkle-soft)", fontSize: "0.85rem" }}>
          Add a few items to your closet to see your sustainability score.
        </p>
      </section>
    );
  }

  const status = getStatus(health.score);

  return (
    <section className="glass-panel" style={{ padding: 26 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 26, marginBottom: 24 }}>
        <div
          className="health-meter"
          style={{ "--score": health.score, "--meter-color": status.color }}
        >
          <div className="health-meter-face">
            <span className="health-meter-value">{health.score}</span>
            <span className="health-meter-max">/ 100</span>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "1.15rem", color: "var(--cream)", margin: "0 0 4px" }}>🌱 Closet Health</h2>
          <p style={{ margin: "0 0 8px", color: "var(--periwinkle-soft)", fontSize: "0.85rem" }}>
            How well you&apos;re using what you already own.
          </p>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: "0.8rem",
              color: "var(--cream)",
              fontWeight: 600
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: status.color,
                boxShadow: `0 0 6px ${status.color}`,
                flexShrink: 0
              }}
            />
            {status.label}
          </span>
        </div>
      </div>

      <div className="health-stats-grid">
        <div className="health-stat">
          <span className="health-stat-value">{health.stalePercent}%</span>
          <span className="health-stat-label">unworn in 12 months</span>
        </div>
        <div className="health-stat">
          <span className="health-stat-value">{health.avgWears}</span>
          <span className="health-stat-label">avg. wears per item</span>
        </div>
        <div className="health-stat">
          <span className="health-stat-value">{formatCompact(health.co2SavedKg)} kg</span>
          <span className="health-stat-label">CO₂e saved by re-wearing</span>
        </div>
        <div className="health-stat">
          <span className="health-stat-value">${formatCompact(health.moneySavedUsd)}</span>
          <span className="health-stat-label">saved shopping your closet</span>
        </div>
      </div>

      <p style={{ margin: "16px 0 0", fontSize: "0.68rem", color: "var(--periwinkle-soft)", opacity: 0.7 }}>
        CO₂ and savings are estimates based on average garment footprint & cost, not your specific items.
      </p>
    </section>
  );
}
