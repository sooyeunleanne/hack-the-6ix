"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

const CATEGORIES = ["Top", "Bottom", "Dress", "Outerwear", "Shoes", "Accessory", "Bag", "Other"];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadModal({ onClose, onAdded }) {
  const [preview, setPreview] = useState(null);
  const [dataUrl, setDataUrl] = useState(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [colorInput, setColorInput] = useState("");
  const [colorTags, setColorTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    setDataUrl(url);
    setPreview(url);
  }

  function addColorTag() {
    const tag = colorInput.trim().toLowerCase();
    if (tag && !colorTags.includes(tag)) {
      setColorTags([...colorTags, tag]);
    }
    setColorInput("");
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
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="text-input"
              placeholder="e.g. periwinkle"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addColorTag();
                }
              }}
            />
            <button type="button" onClick={addColorTag} className="btn-glass" style={{ padding: "8px 16px" }}>
              Add
            </button>
          </div>
          {colorTags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {colorTags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
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

        <button type="submit" className="btn-gold" disabled={submitting}>
          {submitting ? "Adding…" : "Add to Closet"}
        </button>
      </motion.form>
    </motion.div>
  );
}
