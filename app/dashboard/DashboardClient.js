"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SparkleField from "../components/SparkleField";
import ClosetGrid, { CATEGORY_ORDER, LEAST_WORN_COUNT } from "../components/ClosetGrid";
import UploadModal from "../components/UploadModal";
import FairyGodmotherChat from "../components/FairyGodmotherChat";
import FairyGodmother from "../components/FairyGodmother";
import TryOnPanel from "../components/TryOnPanel";
import { getWeatherByCoords, getWeatherByCity } from "../../lib/weather";

const DONATE_STALE_DAYS = 45;

function sortByWear(items) {
  return [...items].sort((a, b) => a.wearCount - b.wearCount);
}

// Fire-and-forget — saves the resolved location so future visits can skip
// re-prompting for geolocation. location is { lat, lon } or { city }.
function persistLocation(location) {
  fetch("/api/users/location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location })
  }).catch(() => {});
}

export default function DashboardClient({ user, initialItems }) {
  const [showIntro, setShowIntro] = useState(true);
  const [items, setItems] = useState(sortByWear(initialItems));
  const [showUpload, setShowUpload] = useState(false);
  const [godmotherLine, setGodmotherLine] = useState(null);
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [closetCategory, setClosetCategory] = useState("All");
  const [leastWornOnly, setLeastWornOnly] = useState(false);
  const [outfitImage, setOutfitImage] = useState(null);
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [outfitError, setOutfitError] = useState(null);
  const [photo, setPhoto] = useState(user.fullBodyPhotoUrl);

  const categories = useMemo(
    () => ["All", "Outerwear", "Top", "Bottom", "Dress", "Shoes", "Accessory", "Bag", "Other"],
    []
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );

  // Mirrors ClosetGrid's own per-category grouping so "least worn" here
  // always matches the items actually badged "Least worn" on the tiles.
  const leastWornIds = useMemo(() => {
    const grouped = {};
    CATEGORY_ORDER.forEach((c) => (grouped[c] = []));
    items.forEach((item) => {
      const category = CATEGORY_ORDER.includes(item.category) ? item.category : "Other";
      grouped[category].push(item);
    });
    const ids = new Set();
    CATEGORY_ORDER.forEach((c) => {
      grouped[c].slice(0, LEAST_WORN_COUNT).forEach((item) => ids.add(item.id));
    });
    return ids;
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = closetCategory === "All" ? items : items.filter((item) => item.category === closetCategory);
    if (leastWornOnly) result = result.filter((item) => leastWornIds.has(item.id));
    return result;
  }, [items, closetCategory, leastWornOnly, leastWornIds]);

  function handleSelectToggle(itemId) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }

  async function handleGenerateOutfit(idsOverride) {
    const itemIds = idsOverride || selectedItemIds;
    if (itemIds.length === 0) return;

    setOutfitLoading(true);
    setOutfitError(null);
    setOutfitImage(null);

    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Looks like try-on failed.");
      setOutfitImage(data.generatedImageUrl);
    } catch (err) {
      setOutfitError(err.message);
    } finally {
      setOutfitLoading(false);
    }
  }

  function handleClearSelection() {
    setSelectedItemIds([]);
    setOutfitImage(null);
    setOutfitError(null);
  }

  // Suggested items from the fairy godmother chat replace the current
  // selection and try on immediately, so the Try It On panel updates
  // in place instead of requiring a manual "Generate" click.
  function handleSuggestItems(itemIds) {
    setSelectedItemIds(itemIds);
    if (photo) handleGenerateOutfit(itemIds);
  }

  async function handlePhotoCaptured(dataUrl) {
    setPhoto(dataUrl);
    try {
      const res = await fetch("/api/users/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: dataUrl })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.photoUrl) setPhoto(data.photoUrl);
      }
    } catch {
      /* photo stays local-only — non-fatal */
    }
  }

  function handleRetakePhoto() {
    setPhoto(null);
    setOutfitImage(null);
    setOutfitError(null);
  }

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // Fetched once here (not in FairyGodmotherChat) so both the header and
  // the chat share one result instead of triggering two geolocation prompts.
  // Saved location (from a previous visit) takes priority over a fresh
  // geolocation prompt; a freshly detected location gets persisted for next time.
  useEffect(() => {
    if (user.location) {
      (async () => {
        try {
          const w = user.location.city
            ? await getWeatherByCity(user.location.city)
            : await getWeatherByCoords(user.location.lat, user.location.lon);
          setWeather(w);
        } catch {
          setWeatherError("lookup-failed");
        }
      })();
      return;
    }

    if (!navigator.geolocation) {
      setWeatherError("no-geo");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const w = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          setWeather(w);
          persistLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        } catch {
          setWeatherError("lookup-failed");
        }
      },
      () => setWeatherError("denied"),
      { timeout: 8000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCityLookup(city) {
    if (!city.trim()) return;
    try {
      const w = await getWeatherByCity(city.trim());
      setWeather(w);
      setWeatherError(null);
      persistLocation({ city: city.trim() });
    } catch (err) {
      setWeatherError(err.message);
    }
  }

  // Closing the modal is UploadModal's own job now (it may be adding a
  // batch of items and needs to stay open until the whole batch finishes).
  function handleItemAdded(newItem) {
    setItems((prev) => sortByWear([...prev, newItem]));
  }

  async function handleWear(itemId) {
    const res = await fetch(`/api/closet-items/${itemId}/wear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    if (!res.ok) return;
    setItems((prev) =>
      sortByWear(
        prev.map((item) =>
          item.id === itemId
            ? { ...item, wearCount: item.wearCount + 1, lastWornAt: new Date().toISOString() }
            : item
        )
      )
    );
  }

  async function handleDelete(itemId) {
    const res = await fetch(`/api/closet-items/${itemId}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setGodmotherLine("Gone from the closet — poof! ✨");
  }

  return (
    <main style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <SparkleField count={30} />

      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle, rgba(240,200,90,0.25) 0%, var(--midnight-deep) 70%)"
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: [0, 1.4, 1], rotate: [0, 12, 0], opacity: 1 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
              style={{ fontSize: 96, filter: "drop-shadow(0 0 30px rgba(240,200,90,0.8))" }}
            >
              👠
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 0.7 }}
        style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "36px 24px 140px" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 18,
            marginBottom: 36
          }}
        >
          <div>
            <h1 className="gold-text" style={{ fontSize: "1.9rem", margin: 0 }}>
              Bibbity Bobbity Boo
            </h1>
            <p style={{ margin: "6px 0 0", color: "var(--periwinkle-soft)" }}>
              Welcome back, {user.name.split(" ")[0]}
            </p>
            {weather && (
              <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--periwinkle-soft)" }}>
                {weather.icon} Today&apos;s weather: {weather.temp}°{weather.unit}, {weather.condition}
                {weather.locationLabel ? ` in ${weather.locationLabel}` : ""}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button className="btn-gold" onClick={() => setShowUpload(true)}>
              + Add to Closet
            </button>
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                style={{ width: 42, height: 42, borderRadius: "50%", border: "2px solid var(--gold)" }}
              />
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "var(--periwinkle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  color: "var(--midnight-deep)"
                }}
              >
                {user.name[0]?.toUpperCase()}
              </div>
            )}
            <a href="/auth/logout" className="btn-glass" style={{ fontSize: 13, padding: "9px 18px" }}>
              Log out
            </a>
          </div>
        </header>

        <section className="dashboard-grid" style={{ marginTop: 32 }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", color: "var(--cream)", marginBottom: 6 }}>Your Closet</h2>
            <p style={{ margin: "0 0 16px", color: "var(--periwinkle-soft)", fontSize: "0.85rem" }}>
              Least-worn pieces step to the front — tap a photo to build an outfit.
            </p>

            <button
              type="button"
              onClick={() => setLeastWornOnly((v) => !v)}
              className={`least-worn-toggle${leastWornOnly ? " active" : ""}`}
              style={{ marginBottom: 16 }}
              aria-pressed={leastWornOnly}
            >
              {leastWornOnly ? "Showing least worn only" : "Least worn only"}
            </button>

            <div className="filter-row">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setClosetCategory(category)}
                  className={`filter-pill${closetCategory === category ? " active" : ""}`}
                >
                  {category}
                </button>
              ))}
            </div>

            <ClosetGrid
              items={filteredItems}
              onWear={handleWear}
              onDelete={handleDelete}
              selectedItemIds={selectedItemIds}
              onSelectToggle={handleSelectToggle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <TryOnPanel
              photo={photo}
              onPhotoCaptured={handlePhotoCaptured}
              onRetake={handleRetakePhoto}
              outfitImage={outfitImage}
              outfitLoading={outfitLoading}
              outfitError={outfitError}
            />
            <FairyGodmotherChat
              items={items}
              onSuggestion={setGodmotherLine}
              onSuggestItems={handleSuggestItems}
              weather={weather}
              weatherError={weatherError}
              onCityLookup={handleCityLookup}
            />
          </div>
        </section>
      </motion.div>

      <AnimatePresence>
        {selectedItemIds.length > 0 && (
          <motion.div
            key="outfit-tray"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            className="glass-panel outfit-tray"
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div className="outfit-tray-thumbs">
                {selectedItems.map((item) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={item.id} src={item.imageUrl} alt={item.category} className="outfit-tray-thumb" />
                ))}
              </div>
              <span style={{ fontSize: "0.78rem", color: "var(--periwinkle-soft)", whiteSpace: "nowrap" }}>
                {selectedItemIds.length} selected
              </span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleClearSelection}
                className="btn-glass"
                style={{ flex: 1, padding: "10px 14px", fontSize: "0.82rem" }}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleGenerateOutfit()}
                className="btn-gold"
                disabled={outfitLoading}
                style={{ flex: 2, padding: "10px 14px", fontSize: "0.82rem" }}
              >
                {outfitLoading ? "Generating…" : "Generate outfit"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAdded={handleItemAdded} />}
    </main>
  );
}