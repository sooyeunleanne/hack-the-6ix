const STALE_MONTHS = 12;
// Don't flag an item as stale just because it's brand new — give it a
// month in the closet before "never worn" counts against it.
const MIN_AGE_DAYS_BEFORE_STALE_ELIGIBLE = 30;
// A wear beyond the first is treated as a "reuse event" — a moment you
// reached for something you already owned instead of buying new.
const UTILIZATION_TARGET_AVG_WEARS = 15;
// Rough, clearly-labeled averages (not per-item data we don't have) for
// the footprint/cost of a new garment, used only to estimate savings.
const AVG_CO2_PER_REUSE_KG = 8;
const AVG_COST_PER_REUSE_USD = 34;

const MS_PER_DAY = 86400000;

function daysBetween(a, b) {
  return (a - b) / MS_PER_DAY;
}

// items: [{ wearCount, lastWornAt, createdAt }] — see serializeItem in
// app/dashboard/page.js for the shape.
export function computeClosetHealth(items, now = new Date()) {
  const totalItems = items.length;

  if (totalItems === 0) {
    return {
      totalItems: 0,
      score: null,
      staleCount: 0,
      stalePercent: 0,
      avgWears: 0,
      totalWears: 0,
      reuseEvents: 0,
      co2SavedKg: 0,
      moneySavedUsd: 0
    };
  }

  const staleCutoff = new Date(now);
  staleCutoff.setMonth(staleCutoff.getMonth() - STALE_MONTHS);

  let staleCount = 0;
  let totalWears = 0;
  let reuseEvents = 0;

  items.forEach((item) => {
    const wearCount = item.wearCount || 0;
    totalWears += wearCount;
    reuseEvents += Math.max(0, wearCount - 1);

    const ageDays = item.createdAt ? daysBetween(now, new Date(item.createdAt)) : Infinity;
    const eligibleForStale = ageDays >= MIN_AGE_DAYS_BEFORE_STALE_ELIGIBLE;
    const lastWorn = item.lastWornAt ? new Date(item.lastWornAt) : null;
    const isStale = eligibleForStale && (!lastWorn || lastWorn < staleCutoff);
    if (isStale) staleCount += 1;
  });

  const avgWears = totalWears / totalItems;
  const utilizationScore = Math.min(1, avgWears / UTILIZATION_TARGET_AVG_WEARS) * 60;
  const freshnessScore = (1 - staleCount / totalItems) * 40;
  const score = Math.round(Math.max(0, Math.min(100, utilizationScore + freshnessScore)));

  return {
    totalItems,
    score,
    staleCount,
    stalePercent: Math.round((staleCount / totalItems) * 100),
    avgWears: Math.round(avgWears * 10) / 10,
    totalWears,
    reuseEvents,
    co2SavedKg: Math.round(reuseEvents * AVG_CO2_PER_REUSE_KG),
    moneySavedUsd: Math.round(reuseEvents * AVG_COST_PER_REUSE_USD)
  };
}
