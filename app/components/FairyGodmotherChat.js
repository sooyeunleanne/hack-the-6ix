"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

// weather/weatherError/onCityLookup are lifted up to DashboardClient so the
// header and this chat share one geolocation lookup instead of each
// prompting the browser separately.
export default function FairyGodmotherChat({ items, fullBodyPhotoUrl, onSuggestion, weather, weatherError, onCityLookup }) {
  const [cityInput, setCityInput] = useState("");

  const [cameraOn, setCameraOn] = useState(false);
  const [photo, setPhoto] = useState(fullBodyPhotoUrl);
  const [countdown, setCountdown] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const countdownRef = useRef(null);

  const CAPTURE_COUNTDOWN_SECONDS = 5;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    const greeting = weather
      ? `It's ${weather.temp}°${weather.unit} and ${weather.condition} out there. Tell me what you're in the mood for, and I'll find something in your closet.`
      : "Tell me what you're in the mood for, and I'll find something in your closet. (Share your city below for weather-aware picks.)";
    setMessages([{ id: "greeting", role: "godmother", text: greeting }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather === null]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // The <video> element only mounts once cameraOn is true, so the stream
  // can't be attached inside startCamera (videoRef.current is still null
  // at that point) — attach it here instead, once the element exists.
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  function handleCityLookup() {
    onCityLookup?.(cityInput);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      alert("Couldn't access your camera — check browser permissions.");
    }
  }

  function stopCamera() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
      setCountdown(null);
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  // Gives the user time to step back and pose for a full-body shot instead
  // of capturing the instant they click.
  function startCaptureCountdown() {
    if (countdownRef.current) return;
    let secondsLeft = CAPTURE_COUNTDOWN_SECONDS;
    setCountdown(secondsLeft);
    countdownRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        capturePhoto();
      } else {
        setCountdown(secondsLeft);
      }
    }, 1000);
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhoto(dataUrl);
    stopCamera();

    fetch("/api/users/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: dataUrl })
    }).catch(() => {});

    // If the godmother already suggested an outfit before the camera was
    // on, put it on right away now that we have a photo.
    setMessages((prev) => {
      const last = [...prev].reverse().find((m) => m.role === "godmother" && m.itemIds && !m.tryOnImage);
      if (last) runTryOn(last.id, last.itemIds, dataUrl);
      return prev;
    });
  }

  function retakePhoto() {
    setPhoto(null);
  }

  async function runTryOn(messageId, itemIds, photoOverride) {
    const activePhoto = photoOverride || photo;
    if (!activePhoto || !itemIds || itemIds.length === 0) return;

    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, tryOnLoading: true } : m)));
    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds })
      });
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, tryOnLoading: false, tryOnImage: data.generatedImageUrl, tryOnMock: data.mock, tryOnNote: data.note }
            : m
        )
      );
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, tryOnLoading: false } : m)));
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const userMsg = { id: nextId(), role: "user", text };
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await fetch("/api/outfit-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, weather, history })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't summon a suggestion");

      const godmotherMsg = {
        id: nextId(),
        role: "godmother",
        text: data.reply,
        itemIds: data.itemIds,
        mock: data.mock
      };
      setMessages((prev) => [...prev, godmotherMsg]);
      onSuggestion?.(data.reply);

      if (photo && data.itemIds?.length) {
        runTryOn(godmotherMsg.id, data.itemIds);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: nextId(), role: "godmother", text: `Oh dear — ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  function itemsFor(ids) {
    return items.filter((i) => ids?.includes(i.id));
  }

  return (
    <section className="glass-panel" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", color: "var(--cream)" }}>
          🧚 Ask Your Fairy Godmother
        </h3>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--periwinkle-soft)" }}>
          Chat for outfit picks — weather-aware, and shown on you live.
        </p>
      </div>

      {weatherError && !weather && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="text-input"
            placeholder="Your city (for weather-aware picks)"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCityLookup()}
            style={{ fontSize: "0.85rem" }}
          />
          <button onClick={handleCityLookup} className="btn-glass" style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
            Go
          </button>
        </div>
      )}

      <div>
        {!photo && !cameraOn && (
          <button onClick={startCamera} className="btn-glass" style={{ width: "100%" }}>
            📷 Turn on Camera
          </button>
        )}

        {!photo && cameraOn && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", borderRadius: 14, border: "1px solid var(--glass-border)", transform: "scaleX(-1)" }}
              />
              {countdown !== null && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 72,
                    fontWeight: 700,
                    color: "var(--gold)",
                    textShadow: "0 0 24px rgba(0,0,0,0.7)"
                  }}
                >
                  {countdown}
                </div>
              )}
            </div>
            <button onClick={startCaptureCountdown} className="btn-gold" style={{ width: "100%" }} disabled={countdown !== null}>
              {countdown !== null ? `Get ready… ${countdown}` : `📸 Capture (${CAPTURE_COUNTDOWN_SECONDS}s timer)`}
            </button>
          </div>
        )}

        {photo && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="you"
              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--gold)" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--periwinkle-soft)" }}>Camera ready — outfits go straight on</span>
            <button onClick={retakePhoto} className="btn-glass" style={{ marginLeft: "auto", padding: "6px 12px", fontSize: "0.7rem" }}>
              Retake
            </button>
          </div>
        )}
        <canvas ref={canvasRef} hidden />
      </div>

      <div
        ref={logRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxHeight: 320,
          overflowY: "auto",
          paddingRight: 4
        }}
      >
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              background: m.role === "user" ? "rgba(240,200,90,0.18)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${m.role === "user" ? "rgba(240,200,90,0.4)" : "var(--glass-border)"}`,
              borderRadius: 14,
              padding: "9px 13px"
            }}
          >
            {m.mock && (
              <span className="chip" style={{ marginBottom: 6, padding: "1px 8px", fontSize: "0.62rem" }}>
                demo mode
              </span>
            )}
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cream)" }}>{m.text}</p>

            {m.itemIds && itemsFor(m.itemIds).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {itemsFor(m.itemIds).map((item) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={item.id}
                    src={item.imageUrl}
                    alt={item.category}
                    style={{ width: 46, height: 58, objectFit: "cover", borderRadius: 8, border: "1px solid var(--glass-border)" }}
                  />
                ))}
              </div>
            )}

            {m.tryOnLoading && (
              <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "var(--periwinkle-soft)" }}>
                Weaving the magic…
              </p>
            )}

            {m.tryOnImage && (
              <div style={{ marginTop: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.tryOnImage}
                  alt="try-on"
                  style={{ width: "100%", borderRadius: 12, border: "1px solid var(--glass-border)" }}
                />
                {m.tryOnMock && (
                  <span className="chip" style={{ marginTop: 6, display: "inline-block", padding: "1px 8px", fontSize: "0.62rem" }}>
                    demo mode
                  </span>
                )}
              </div>
            )}

            {m.itemIds && !photo && !m.tryOnImage && (
              <p style={{ margin: "8px 0 0", fontSize: "0.7rem", color: "var(--periwinkle-soft)", fontStyle: "italic" }}>
                Turn on your camera above and I'll show you wearing it.
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="text-input"
          placeholder="Something cozy for tonight…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={sending}
        />
        <button onClick={handleSend} className="btn-gold" disabled={sending || !input.trim()} style={{ whiteSpace: "nowrap" }}>
          {sending ? "…" : "Send"}
        </button>
      </div>
    </section>
  );
}
