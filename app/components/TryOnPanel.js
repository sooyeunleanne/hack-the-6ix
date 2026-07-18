"use client";

import { useEffect, useRef, useState } from "react";

const CAPTURE_COUNTDOWN_SECONDS = 5;

// Dedicated try-on section: owns the camera/photo capture flow and shows
// the current outfit render. Kept separate from the chat so the chat stays
// focused on conversation and this stays focused on "what does it look like."
export default function TryOnPanel({ photo, onPhotoCaptured, onRetake, outfitImage, outfitLoading, outfitError }) {
  const [cameraOn, setCameraOn] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const countdownRef = useRef(null);

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

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    onPhotoCaptured(dataUrl);
  }

  const displayImage = outfitImage || photo;

  return (
    <section className="glass-panel" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", color: "var(--cream)" }}>Try It On</h3>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--periwinkle-soft)" }}>
          {photo
            ? "Select pieces from your closet, then generate the look."
            : "Add a photo of yourself so outfits can be shown on you."}
        </p>
      </div>

      {!photo && !cameraOn && (
        <button onClick={startCamera} className="btn-glass" style={{ width: "100%" }}>
          📷 Turn on camera
        </button>
      )}

      {!photo && cameraOn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              position: "relative",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid var(--glass-border)",
              background: "rgba(255,255,255,0.05)",
              aspectRatio: "3 / 4"
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImage}
              alt={outfitImage ? "Outfit preview" : "You"}
              style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
            />
            {outfitLoading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(15,19,48,0.55)",
                  color: "var(--cream)",
                  fontSize: "0.85rem",
                  textAlign: "center",
                  padding: "0 20px"
                }}
              >
                Weaving the magic…
              </div>
            )}
          </div>

          {outfitError && <p style={{ margin: 0, color: "var(--blush)", fontSize: "0.8rem" }}>{outfitError}</p>}

          <button onClick={onRetake} className="btn-glass" style={{ fontSize: "0.75rem", padding: "8px 12px" }}>
            Retake photo
          </button>
        </div>
      )}

      <canvas ref={canvasRef} hidden />
    </section>
  );
}
