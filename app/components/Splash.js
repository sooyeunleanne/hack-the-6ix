"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SparkleField from "./SparkleField";

const TITLE = "Bibbity Bobbity Boo";

const letterVariants = {
  hidden: { opacity: 0, y: 18, rotate: -6 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { delay: 0.4 + i * 0.045, duration: 0.5, ease: "easeOut" }
  })
};

export default function Splash({ onEnter } = {}) {
  const [stage, setStage] = useState("wand"); // wand -> title -> gate

  useEffect(() => {
    const t1 = setTimeout(() => setStage("title"), 900);
    const t2 = setTimeout(() => setStage("gate"), 900 + TITLE.length * 45 + 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        overflow: "hidden"
      }}
    >
      <SparkleField count={60} />

      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
        animate={{
          scale: stage === "wand" ? 1.15 : 1,
          opacity: 1,
          rotate: 0
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ fontSize: 72, zIndex: 1, filter: "drop-shadow(0 0 24px rgba(240,200,90,0.65))" }}
      >
        <motion.span
          animate={{ rotate: [0, -12, 10, -6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4 }}
          style={{ display: "inline-block" }}
        >
          🪄
        </motion.span>
      </motion.div>

      <AnimatePresence>
        {stage !== "wand" && (
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontSize: "clamp(2.2rem, 6vw, 4rem)",
              margin: "18px 0 6px",
              zIndex: 1,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center"
            }}
          >
            {TITLE.split("").map((ch, i) => (
              <motion.span
                key={i}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={letterVariants}
                className="gold-text"
                style={{ whiteSpace: "pre" }}
              >
                {ch}
              </motion.span>
            ))}
          </motion.h1>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === "gate" && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ zIndex: 1, marginTop: 8 }}
          >
            <p
              style={{
                color: "var(--periwinkle-soft)",
                fontSize: "1.05rem",
                maxWidth: 420,
                margin: "0 auto 28px"
              }}
            >
              Your closet, enchanted. Log every outfit, let the least-worn
              pieces step forward, and let your fairy godmother handle the
              rest.
            </p>
            {onEnter ? (
              <motion.button
                onClick={onEnter}
                className="btn-gold"
                style={{ fontSize: "1.05rem" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                ✨ Enter the Ball
              </motion.button>
            ) : (
              <motion.a
                href="/auth/login"
                className="btn-gold"
                style={{
                  display: "inline-block",
                  fontSize: "1.05rem",
                  textDecoration: "none"
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                ✨ Enter the Ball
              </motion.a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {stage !== "gate" && (
        <button
          onClick={() => setStage("gate")}
          style={{
            position: "absolute",
            bottom: 24,
            right: 24,
            background: "transparent",
            border: "none",
            color: "var(--periwinkle-soft)",
            opacity: 0.6,
            fontSize: 13,
            cursor: "pointer",
            zIndex: 1
          }}
        >
          skip ✨
        </button>
      )}
    </main>
  );
}
