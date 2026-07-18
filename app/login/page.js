"use client";

import { motion } from "framer-motion";
import SparkleField from "../components/SparkleField";

export default function LoginPage() {
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
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ zIndex: 1 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/fairy.gif"
          alt=""
          width={150}
          height={150}
          style={{ filter: "drop-shadow(0 0 18px rgba(240,200,90,0.55))" }}
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
        className="gold-text"
        style={{
          fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
          margin: "12px 0 6px",
          zIndex: 1
        }}
      >
        The Enchanted Closet
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          color: "var(--periwinkle-soft)",
          fontSize: "1rem",
          maxWidth: 380,
          margin: "0 auto 32px",
          zIndex: 1
        }}
      >
        Every guest needs an invitation. Enter if you already hold one, or
        request one of your own.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
        className="glass-panel"
        style={{
          zIndex: 1,
          width: "100%",
          maxWidth: 380,
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16
        }}
      >
        <motion.a
          href="/auth/login"
          className="btn-gold"
          style={{
            display: "block",
            width: "100%",
            fontSize: "1.05rem",
            textDecoration: "none"
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          ✨ Enter the Ball
        </motion.a>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            color: "var(--periwinkle-soft)",
            fontSize: "0.78rem",
            opacity: 0.7
          }}
        >
          <span style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
          or
          <span style={{ flex: 1, height: 1, background: "var(--glass-border)" }} />
        </div>

        <motion.a
          href="/auth/login?screen_hint=signup"
          className="btn-glass"
          style={{
            display: "block",
            width: "100%",
            fontSize: "1.05rem",
            textDecoration: "none",
            textAlign: "center"
          }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          👑 Request an Invitation
        </motion.a>

        <p
          style={{
            color: "var(--periwinkle-soft)",
            opacity: 0.65,
            fontSize: "0.78rem",
            margin: "4px 0 0"
          }}
        >
          New here? Requesting an invitation creates your account.
        </p>
      </motion.div>

      <motion.a
        href="/"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        whileHover={{ opacity: 1 }}
        style={{
          marginTop: 28,
          color: "var(--periwinkle-soft)",
          fontSize: 13,
          textDecoration: "none",
          zIndex: 1
        }}
      >
        ← Back to the entrance
      </motion.a>
    </main>
  );
}
