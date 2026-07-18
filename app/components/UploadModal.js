"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { extractColorTagsFromPixelData } from "../../lib/colorTags";
import { nearestColorName } from "../../lib/colorNames";

const CATEGORIES = ["Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessory", "Bag", "Other"];

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

export default function UploadModal({ onClose, onAdded }) {
  const [preview, setPreview] = useState(null);
  const [dataUrl, setDataUrl] = useState(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [colorInput, setColorInput] = useState("");
  const [colorTags, setColorTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [analysisSummary, setAnalysisSummary] = useState(null);
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setError(null);
    setAnalysisSummary(null);
    const url = await readFileAsDataUrl(file);
    setDataUrl(url);
    setPreview(url);

    let fallbackColorTags = [];
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
      fallbackColorTags = extractColorTagsFromPixelData(pixelData, width, height);
      setColorTags(fallbackColorTags);
    } catch (err) {
      fallbackColorTags = [];
    }

    setProcessing(true);
    try {
      const res = await fetch("/api/closet-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, category: CATEGORIES[0], colorTags: fallbackColorTags })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Image analysis failed");
      }
      const { item, analysisNote } = await res.json();
      setCategory(item.category || CATEGORIES[0]);
      setColorTags(item.color_tags?.length ? item.color_tags : fallbackColorTags);
      setAnalysisSummary({
        category: item.category,
        colorTags: item.color_tags || [],
        styleTags: item.style_tags || [],
        attributes: item.attributes || {},
        note: analysisNote || null
      });
      onAdded({
        id: item._id,
        imageUrl: item.image_url,
        category: item.category,
        colorTags: item.color_tags || [],
        styleTags: item.style_tags || [],
        wearCount: item.wear_count || 0,
        lastWornAt: item.last_worn_at,
        createdAt: item.created_at
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }

  function addColorTag() {
    const tag = colorInput.trim().toUpperCase();
    if (/^#[0-9A-F]{6}$/.test(tag) && !colorTags.includes(tag)) {
      setColorTags([...colorTags, tag]);
    }
  }

  function removeColorTag(tag) {
    setColorTags(colorTags.filter((t) => t !== tag));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!dataUrl) {
      setError("Add a photo first, dear.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/closet-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl, category, colorTags })
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
        wearCount: item.wear_count || 0,
        lastWornAt: item.last_worn_at,
        createdAt: item.created_at
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

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
        style={{ width: "100%", maxWidth: 420, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}
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
            padding: preview ? 0 : 28,
            textAlign: "center",
            cursor: "pointer",
            overflow: "hidden",
            color: "var(--periwinkle-soft)"
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 260, objectFit: "contain" }} />
          ) : (
            <>📷 Tap to upload a photo</>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {processing && (
          <div style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(240,200,90,0.12)", color: "var(--gold)", fontSize: "0.9rem" }}>
            ✨ Processing your photo…
          </div>
        )}

        {analysisSummary && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.06)" }}>
            {analysisSummary.note && (
              <div style={{ fontSize: "0.8rem", color: "var(--blush)" }}>{analysisSummary.note}</div>
            )}
            <div style={{ fontSize: "0.85rem", color: "var(--cream)" }}>
              Detected: <strong>{analysisSummary.category}</strong>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(analysisSummary.colorTags || []).map((tag) => (
                <span key={tag} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: tag, border: "1px solid rgba(255,255,255,0.35)", flexShrink: 0 }} />
                  {nearestColorName(tag)}
                </span>
              ))}
              {(analysisSummary.styleTags || []).map((tag) => (
                <span key={tag} className="chip" style={{ background: "rgba(240,200,90,0.16)", color: "var(--gold)" }}>#{tag}</span>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: "0.78rem", color: "var(--periwinkle-soft)" }}>
              {analysisSummary.attributes?.sleeveLength && analysisSummary.attributes.sleeveLength !== "unknown" && <span>• {analysisSummary.attributes.sleeveLength}</span>}
              {analysisSummary.attributes?.fit && analysisSummary.attributes.fit !== "unknown" && <span>• {analysisSummary.attributes.fit}</span>}
              {analysisSummary.attributes?.silhouette && analysisSummary.attributes.silhouette !== "unknown" && <span>• {analysisSummary.attributes.silhouette}</span>}
              {analysisSummary.attributes?.occasion && analysisSummary.attributes.occasion !== "unknown" && <span>• {analysisSummary.attributes.occasion}</span>}
              {analysisSummary.attributes?.material && analysisSummary.attributes.material !== "unknown" && <span>• {analysisSummary.attributes.material}</span>}
            </div>
          </div>
        )}

        <div>
          <label className="field-label">Category</label>
          <select className="select-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Color tags</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(colorInput) ? colorInput : "#B0B7E6"}
              onChange={(e) => setColorInput(e.target.value)}
              style={{ width: 44, height: 40, padding: 0, border: "none", borderRadius: 10, background: "none", cursor: "pointer" }}
            />
            <button type="button" onClick={addColorTag} className="btn-glass" style={{ padding: "8px 16px" }}>
              Add color
            </button>
          </div>
          {colorTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {colorTags.map((tag) => (
                <span key={tag} className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: tag, border: "1px solid rgba(255,255,255,0.35)", flexShrink: 0 }} />
                  {nearestColorName(tag)}
                  <button
                    type="button"
                    onClick={() => removeColorTag(tag)}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p style={{ color: "var(--blush)", margin: 0, fontSize: "0.85rem" }}>{error}</p>}

        <button type="submit" className="btn-gold" disabled={submitting || processing}>
          {submitting ? "Adding…" : processing ? "Processing…" : "Add to Closet"}
        </button>
      </motion.form>
    </motion.div>
  );
}
