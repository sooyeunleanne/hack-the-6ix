"use client";

import { useEffect, useState } from "react";

// Decorative twinkling starfield used behind every screen for the
// Cinderella night-sky look. Positions are randomized client-side only
// (after mount) — generating them during SSR would produce different
// values than the client's hydration pass and trigger a hydration mismatch.
export default function SparkleField({ count = 40 }) {
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    setSparkles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 3.2
      }))
    );
  }, [count]);

  return (
    <div className="sparkle-field" aria-hidden="true">
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="sparkle"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`
          }}
        />
      ))}
    </div>
  );
}
