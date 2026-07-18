"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SparkleField from "../components/SparkleField";
import ClosetGrid from "../components/ClosetGrid";
import UploadModal from "../components/UploadModal";
import DonateNudges from "../components/DonateNudges";
import FairyGodmotherChat from "../components/FairyGodmotherChat";
import ShoppingListPanel from "../components/ShoppingListPanel";
import FairyGodmother from "../components/FairyGodmother";
import { getWeatherByCoords, getWeatherByCity } from "../../lib/weather";

const DONATE_STALE_DAYS = 45;

function sortByWear(items) {
  return [...items].sort((a, b) => a.wearCount - b.wearCount);
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
  const [outfitImage, setOutfitImage] = useState(null);
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [outfitError, setOutfitError] = useState(null);

  const categories = useMemo(
    () => ["All", "Outerwear", "Top", "Bottom", "Dress", "Shoes", "Accessory", "Bag", "Other"],
    []
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );

  const filteredItems = useMemo(
    () => (closetCategory === "All" ? items : items.filter((item) => item.category === closetCategory)),
    [items, closetCategory]
  );

  function handleSelectToggle(itemId) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }

  async function handleGenerateOutfit() {
    if (selectedItemIds.length === 0) return;

    setOutfitLoading(true);
    setOutfitError(null);
    setOutfitImage(null);

    try {
      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selectedItemIds })
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

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 1500);
    return () => clearTimeout(t);
  }, []);

  // Fetched once here (not in FairyGodmotherChat) so both the header and
  // the chat share one result instead of triggering two geolocation prompts.
  useEffect(() => {
    if (!navigator.geolocation) {
      setWeatherError("no-geo");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const w = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          setWeather(w);
        } catch {
          setWeatherError("lookup-failed");
        }
      },
      () => setWeatherError("denied"),
      { timeout: 8000 }
    );
  }, []);

  async function handleCityLookup(city) {
    if (!city.trim()) return;
    try {
      const w = await getWeatherByCity(city.trim());
      setWeather(w);
      setWeatherError(null);
    } catch (err) {
      setWeatherError(err.message);
    }
  }

  const donateCandidates = useMemo(() => {
    const cutoff = Date.now() - DONATE_STALE_DAYS * 24 * 60 * 60 * 1000;
    return items.filter(
      (item) => item.wearCount === 0 && item.createdAt && new Date(item.createdAt).getTime() < cutoff
    );
  }, [items]);

  function handleItemAdded(newItem) {
    setItems((prev) => sortByWear([...prev, newItem]));
    setShowUpload(false);
    setGodmotherLine(`A new piece joins the closet! ${newItem.category}, ready when you are.`);
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
    setGodmotherLine("Marked as worn — the closet reorders itself, like magic.");
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
        style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "28px 20px 120px" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 28
          }}
        >
          <div>
            <h1 className="gold-text" style={{ fontSize: "1.9rem", margin: 0 }}>
              Bibbity Bobbity Boo
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--periwinkle-soft)" }}>
              Welcome back, {user.name.split(" ")[0]} ✨
            </p>
            {weather && (
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--periwinkle-soft)" }}>
                {weather.icon} Today&apos;s weather: {weather.temp}°{weather.unit}, {weather.condition}
                {weather.locationLabel ? ` in ${weather.locationLabel}` : ""}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
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

        <DonateNudges candidates={donateCandidates} />

        <section className="dashboard-grid" style={{ marginTop: 24 }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", color: "var(--cream)", marginBottom: 12 }}>
              Your Closet <span style={{ color: "var(--periwinkle-soft)", fontWeight: 400, fontSize: "0.9rem" }}>— least-worn steps to the front</span>
            </h2>

            <section className="glass-panel" style={{ padding: 18, marginBottom: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setClosetCategory(category)}
                    className="btn-glass"
                    style={{
                      padding: "8px 12px",
                      fontSize: "0.78rem",
                      background: closetCategory === category ? "rgba(240,200,90,0.16)" : undefined,
                      borderColor: closetCategory === category ? "var(--gold)" : undefined
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <span style={{ color: "var(--periwinkle-soft)", fontSize: "0.85rem" }}>
                  {selectedItemIds.length} item{selectedItemIds.length === 1 ? "" : "s"} selected
                </span>
                <button
                  type="button"
                  onClick={handleGenerateOutfit}
                  className="btn-gold"
                  disabled={outfitLoading || selectedItemIds.length === 0}
                >
                  {outfitLoading ? "Generating outfit…" : "Generate outfit image"}
                </button>
                <button type="button" onClick={handleClearSelection} className="btn-glass" disabled={selectedItemIds.length === 0}>
                  Clear selection
                </button>
              </div>

              {selectedItems.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {selectedItems.map((item) => (
                    <span key={item.id} className="chip" style={{ fontSize: "0.72rem" }}>
                      {item.category}
                    </span>
                  ))}
                </div>
              )}

              {outfitError && (
                <p style={{ margin: 0, color: "var(--blush)", fontSize: "0.82rem" }}>{outfitError}</p>
              )}

              {outfitImage && (
                <div style={{ marginTop: 14, borderRadius: 16, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={outfitImage} alt="Final outfit" style={{ width: "100%", display: "block" }} />
                </div>
              )}
            </section>

            <ClosetGrid
              items={filteredItems}
              onWear={handleWear}
              onDelete={handleDelete}
              selectedItemIds={selectedItemIds}
              onSelectToggle={handleSelectToggle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <FairyGodmotherChat
              items={items}
              fullBodyPhotoUrl={user.fullBodyPhotoUrl}
              savedLocation={user.location} onSuggestion={setGodmotherLine}
              weather={weather}
              weatherError={weatherError}
              onCityLookup={handleCityLookup}
            />
            <ShoppingListPanel items={items} onSuggestion={setGodmotherLine} />
          </div>
        </section>
      </motion.div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAdded={handleItemAdded} />}

      <FairyGodmother line={godmotherLine} onLineConsumed={() => setGodmotherLine(null)} userName={user.name.split(" ")[0]} />
    </main>
  );
}
