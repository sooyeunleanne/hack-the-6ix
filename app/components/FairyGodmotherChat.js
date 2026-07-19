"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

// weather/weatherError/onCityLookup are lifted up to DashboardClient so the
// header and this chat share one geolocation lookup (and one saved-location
// persistence flow) instead of each prompting the browser separately.
// Photo capture and outfit rendering live in TryOnPanel (its own section) —
// this component stays focused on the conversation, and hands suggested
// item ids up via onSuggestItems for TryOnPanel to render.
export default function FairyGodmotherChat({ items, onSuggestion, onSuggestItems, weather, weatherError, onCityLookup }) {
  const [cityInput, setCityInput] = useState("");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef(null);

  // Voice in (ElevenLabs speech-to-text, falling back to the browser's own
  // SpeechRecognition if no key is configured) and voice out (whether chat
  // replies get spoken via the FairyGodmother widget, toggleable per user).
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const micRecorderRef = useRef(null);
  const micChunksRef = useRef([]);
  const micStreamRef = useRef(null);

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
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleCityLookup() {
    onCityLookup?.(cityInput);
  }

  // Browser-native speech recognition — used only when ElevenLabs isn't
  // configured (mirrors the speechSynthesis fallback pattern in FairyGodmother.js).
  function startBrowserSpeechRecognition() {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      alert("Voice input isn't supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript?.trim()) handleSend(transcript);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    setRecording(true);
    recognition.start();
  }

  async function transcribeAndSend(blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        if (data.text?.trim()) handleSend(data.text);
      } else {
        startBrowserSpeechRecognition();
      }
    } catch {
      startBrowserSpeechRecognition();
    } finally {
      setTranscribing(false);
    }
  }

  async function startVoiceInput() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      micChunksRef.current = [];
      recorder.ondataavailable = (e) => micChunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
        const blob = new Blob(micChunksRef.current, { type: "audio/webm" });
        transcribeAndSend(blob);
      };
      micRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Couldn't access your microphone - check browser permissions.");
    }
  }

  function handleMicClick() {
    if (recording) {
      micRecorderRef.current?.stop();
      setRecording(false);
    } else {
      startVoiceInput();
    }
  }

  async function handleSend(textOverride) {
    const text = (textOverride ?? input).trim();
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
      if (voiceReplyEnabled) onSuggestion?.(data.reply);

      if (data.itemIds?.length) {
        onSuggestItems?.(data.itemIds);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: nextId(), role: "godmother", text: `Oh dear - ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  function itemsFor(ids) {
    return items.filter((i) => ids?.includes(i.id));
  }

  return (
    <section className="glass-panel" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 style={{ margin: "0 0 6px", fontSize: "1.05rem", color: "var(--cream)" }}>
            🧚 Ask Your Fairy Godmother
          </h3>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--periwinkle-soft)" }}>
            Chat for weather-aware outfit picks from your closet.
          </p>
        </div>
        <button
          onClick={() => setVoiceReplyEnabled((v) => !v)}
          className="btn-glass"
          style={{ padding: "6px 10px", fontSize: "0.7rem", whiteSpace: "nowrap" }}
          title="Toggle whether the godmother speaks her replies aloud"
        >
          {voiceReplyEnabled ? "🔊 Talk back: on" : "🔇 Talk back: off"}
        </button>
      </div>

      <div
        ref={logRef}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 320,
          overflowY: "auto",
          paddingRight: 6
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
              padding: "10px 15px"
            }}
          >
            {m.mock && (
              <span className="chip" style={{ marginBottom: 6, padding: "1px 8px", fontSize: "0.62rem" }}>
                demo mode
              </span>
            )}
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cream)" }}>{m.text}</p>

            {m.itemIds && itemsFor(m.itemIds).length > 0 && (
              <>
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
                <p style={{ margin: "8px 0 0", fontSize: "0.7rem", color: "var(--periwinkle-soft)", fontStyle: "italic" }}>
                  See it on you in the Try It On panel ↑
                </p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleMicClick}
          className="btn-glass"
          disabled={transcribing || sending}
          title={recording ? "Stop recording" : "Speak your message"}
          style={{
            padding: "0 14px",
            borderColor: recording ? "var(--blush)" : undefined,
            background: recording ? "rgba(247,201,216,0.18)" : undefined
          }}
        >
          {transcribing ? "…" : recording ? "⏹️" : "🎙️"}
        </button>
        <input
          className="text-input"
          placeholder={recording ? "Listening…" : "Something cozy for tonight…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={sending}
        />
        <button onClick={() => handleSend()} className="btn-gold" disabled={sending || !input.trim()} style={{ whiteSpace: "nowrap" }}>
          {sending ? "…" : "Send"}
        </button>
      </div>
    </section>
  );
}
