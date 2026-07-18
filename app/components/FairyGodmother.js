"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GREETINGS = [
  (name) => `Hello, ${name}! Your closet awaits, dear.`,
  () => "Bibbity bobbity boo — let's find something fabulous.",
  () => "Chin up, buttercup. Even glass slippers need a good outfit."
];

// Floating voice widget. Speaks via ElevenLabs (server-proxied) when a key
// is configured, otherwise falls back to the browser's speech synthesis —
// either way the text bubble always shows, so the feature never looks broken.
export default function FairyGodmother({ line, onLineConsumed, userName }) {
  const [bubble, setBubble] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (line) {
      speak(line);
      onLineConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line]);

  function fallbackSpeak(text) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = 1.3;
      window.speechSynthesis.speak(utter);
    }
  }

  async function speak(text) {
    setBubble(text);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(() => {});
        }
      } else {
        fallbackSpeak(text);
      }
    } catch {
      fallbackSpeak(text);
    }
    setTimeout(() => setBubble((b) => (b === text ? null : b)), 6000);
  }

  function handleWandClick() {
    const greet = GREETINGS[Math.floor(Math.random() * GREETINGS.length)](userName);
    speak(greet);
  }

  return (
    <>
      <audio ref={audioRef} hidden />
      <AnimatePresence>
        {bubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="glass-panel"
            style={{
              position: "fixed",
              bottom: 96,
              right: 24,
              maxWidth: 260,
              padding: "12px 16px",
              fontSize: "0.85rem",
              color: "var(--cream)",
              zIndex: 45
            }}
          >
            {bubble}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={handleWandClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ y: [0, -6, 0] }}
        transition={{ y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, var(--gold), var(--gold-deep))",
          fontSize: 26,
          cursor: "pointer",
          boxShadow: "0 8px 26px rgba(240,200,90,0.55)",
          zIndex: 45
        }}
        aria-label="Ask your fairy godmother"
      >
        🧚
      </motion.button>
    </>
  );
}
