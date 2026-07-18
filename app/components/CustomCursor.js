"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// A small, cute fairy sprite that replaces the system cursor — decorative
// only. Disabled for touch devices (no real pointer to attach to) and for
// prefers-reduced-motion (the flutter/trail is pure motion, not information).
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const main = { x: useSpring(x, { stiffness: 600, damping: 40 }), y: useSpring(y, { stiffness: 600, damping: 40 }) };
  const trail1 = { x: useSpring(x, { stiffness: 260, damping: 30 }), y: useSpring(y, { stiffness: 260, damping: 30 }) };
  const trail2 = { x: useSpring(x, { stiffness: 140, damping: 26 }), y: useSpring(y, { stiffness: 140, damping: 26 }) };

  useEffect(() => {
    const canUse =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canUse) return;

    setEnabled(true);
    document.documentElement.classList.add("has-custom-cursor");

    const handleMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.documentElement.classList.remove("has-custom-cursor");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled) return null;

  return (
    <>
      <motion.span
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x: trail2.x,
          y: trail2.y,
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "var(--gold)",
          opacity: 0.35,
          pointerEvents: "none",
          zIndex: 9999,
          translateX: "-50%",
          translateY: "-50%"
        }}
      />
      <motion.span
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x: trail1.x,
          y: trail1.y,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "var(--gold)",
          opacity: 0.55,
          pointerEvents: "none",
          zIndex: 9999,
          translateX: "-50%",
          translateY: "-50%"
        }}
      />
      <motion.div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x: main.x,
          y: main.y,
          pointerEvents: "none",
          zIndex: 9999,
          translateX: "-30%",
          translateY: "-30%"
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fairy.gif" alt="" width={80} height={80} style={{ display: "block" }} />
      </motion.div>
    </>
  );
}
