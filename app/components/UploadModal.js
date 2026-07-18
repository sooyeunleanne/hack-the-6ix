"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { extractColorTagsFromPixelData } from "../../lib/colorTags";
import { nearestColorName } from "../../lib/colorNames";

const CATEGORIES = ["Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessory", "Bag", "Other"];

let draftIdCounter = 0;
const nextDraftId = () => `draft-${Date.now()}-${draftIdCounter++}`;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readImageBitmap(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function extractFallbackColorTags(file) {
  try {
    const img = await readImageBitmap(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width = Math.min(img.naturalWidth, 120);
    const height = Math.min(img.naturalHeight, 120);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    const pixelData = ctx.getImageData(0, 0, width, height).data;
    return extractColorTagsFromPixelData(pixelData, width, height);
  } catch {
    return [];
  }
}

// Each item goes through the same preview-analysis endpoint as before
// (client-side color fallback -> Gemini preview call), just per-draft now
// instead of for a single item, so cards resolve independently as each
// photo's analysis completes rather than blocking on the whole batch.
async function analyzeDraft(draftId, file, setDrafts) {
  const dataUrl = await readFileAsDataUrl(file);
  const fallbackColorTags = await extractFallbackColorTags(file);

  setDrafts((prev) =>
    prev.map((d) => (d.id === draftId ? { ...d, dataUrl, preview: dataUrl, colorTags: fallbackColorTags } : d))
  );

  try {
    const res = await fetch("/api/closet-items?preview=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: dataUrl, category: "Other", colorTags: fallbackColorTags })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Image analysis failed");
    }
    const { item, analysisNote } = await res.json();
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? {
              ...d,
              processing: false,
              category: item.category || "Other",
              colorTags: item.color_tags?.length ? item.color_tags : fallbackColorTags,
              analysisNote: analysisNote || null
            }
          : d
      )
    );
  } catch (err) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, processing: false, error: err.message } : d))
    );
  }
}

export default function UploadModal({ onClose, onAdded }) {
  const [drafts, setDrafts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileRef = useRef(null);

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setSubmitError(null);

    const newDrafts = files.map((file) => ({
      id: nextDraftId(),
      file,
      preview: null,
      dataUrl: null,
      category: "Other",
      colorTags: [],
      processing: true,
      error: null,
      analysisNote: null
    }));

    setDrafts((prev) => [...prev, ...newDrafts]);
    newDrafts.forEach((d) => analyzeDraft(d.id, d.file, setDrafts));
  }

  function updateDraft(id, patch) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function removeDraft(id) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function addColorTag(id, hex) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    const upper = hex.toUpperCase();
    setDrafts((prev) =>
      prev.map((d) => (d.id === id && !d.colorTags.includes(upper) ? { ...d, colorTags: [...d.colorTags, upper] } : d))
    );
  }

  function removeColorTag(id, tag) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, colorTags: d.colorTags.filter((t) => t !== tag) } : d)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ready = drafts.filter((d) => d.dataUrl && !d.processing);
    if (ready.length === 0) {
      setSubmitError("Add at least one photo first, dear.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const failures = [];
    for (const draft of ready) {
      try {
        const res = await fetch("/api/closet-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: draft.dataUrl, category: draft.category || "Other", colorTags: draft.colorTags })
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Something went wrong");
        }
        const { item } = await res.json();
        onAdded({
          id: item._id,
          imageUrl: item.image_url,
          category: item.category,
          colorTags: item.color_tags || [],
          styleTags: item.style_tags || [],
          attributes: item.attributes || {},
          wearCount: item.wear_count || 0,
          lastWornAt: item.last_worn_at,
          createdAt: item.created_at
        });
      } catch (err) {
        failures.push(`${draft.file.name}: ${err.message}`);
      }
    }

    setSubmitting(false);
    if (failures.length > 0) {
      setSubmitError(`${failures.length} item(s) failed to add — ${failures.join("; ")}`);
      setDrafts((prev) => prev.filter((d) => failures.some((f) => f.startsWith(d.file.name))));
    } else {
      onClose();
    }
  }

  const readyCount = drafts.filter((d) => d.dataUrl && !d.processing).length;
  const anyProcessing = drafts.some((d) => d.processing);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,19,48,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
        padding: 20
      }}
    >
      <motion.form
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="glass-panel"
        style={{ width: "100%", maxWidth: 560, maxHeight: "86vh", padding: 28, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", color: "var(--cream)" }}>Add to Closet</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--periwinkle-soft)", fontSize: 20, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: "1.5px dashed var(--glass-border)",
            borderRadius: 16,
            padding: 20,
            textAlign: "center",
            cursor: "pointer",
            color: "var(--periwinkle-soft)"
          }}
        >
          📷 Tap to upload one or more photos
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {drafts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", paddingRight: 4 }}>
            {drafts.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 10,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: d.error ? "1px solid var(--blush)" : "1px solid transparent"
                }}
              >
                <div style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.08)" }}>
                  {d.preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  {d.processing ? (
                    <span style={{ fontSize: "0.82rem", color: "var(--gold)" }}>✨ Processing…</span>
                  ) : d.error ? (
                    <span style={{ fontSize: "0.78rem", color: "var(--blush)" }}>{d.error}</span>
                  ) : (
                    <>
                      <select
                        className="select-input"
                        value={d.category}
                        onChange={(e) => updateDraft(d.id, { category: e.target.value })}
                        style={{ fontSize: "0.82rem", padding: "4px 8px" }}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                        {d.colorTags.map((tag) => (
                          <span key={tag} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.68rem", padding: "2px 6px" }}>
                            <span style={{ width: 9, height: 9, borderRadius: "50%", background: tag, border: "1px solid rgba(255,255,255,0.35)", flexShrink: 0 }} />
                            {nearestColorName(tag)}
                            <button
                              type="button"
                              onClick={() => removeColorTag(d.id, tag)}
                              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: "0.75rem" }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="color"
                          value="#B0B7E6"
                          onChange={(e) => addColorTag(d.id, e.target.value)}
                          title="Add a color"
                          style={{ width: 22, height: 22, padding: 0, border: "none", borderRadius: 6, background: "none", cursor: "pointer" }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeDraft(d.id)}
                  style={{ background: "none", border: "none", color: "var(--periwinkle-soft)", fontSize: 18, cursor: "pointer", alignSelf: "flex-start" }}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {submitError && <p style={{ color: "var(--blush)", margin: 0, fontSize: "0.85rem" }}>{submitError}</p>}

        <button type="submit" className="btn-gold" disabled={submitting || anyProcessing || readyCount === 0}>
          {submitting
            ? "Adding…"
            : anyProcessing
            ? "Processing…"
            : readyCount > 0
            ? `Add ${readyCount} Item${readyCount === 1 ? "" : "s"} to Closet`
            : "Add to Closet"}
        </button>
      </motion.form>
    </motion.div>
  );
}
