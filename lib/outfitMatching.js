// Multi-factor pairing engine for the "Pairs well with…" tag. Started as
// pure color matching (a fixed pairing chart); this scores each candidate
// item against the outfit-in-progress across several independent factors —
// color harmony, occasion, material, style, and silhouette — the same way
// a stylist would reason about it, not just by hue.
//
// Scoped to what the closet data actually supports today. Gemini already
// extracts occasion/material/fit/silhouette per item (see
// analyzeClosetPhoto in lib/gemini.js) and style hashtags, so those feed in
// directly. Season and weather aren't modeled as separate factors — color
// temperature (warm/cool, via HSL) already captures most of what a season
// palette would — and true weather-range data, personal style learning, and
// trend awareness aren't in the data model, so they're left as future work
// rather than faked.
import { nearestColorName } from "./colorNames";

const GOOD_THRESHOLD = 72;
const SOSO_THRESHOLD = 52;

// Color carries the pairing (it's the one factor every item always has);
// the rest nudge the score up or down when Gemini's attributes are present,
// and are skipped (not penalized) when an attribute is "unknown".
const WEIGHTS = {
  color: 0.5,
  occasion: 0.2,
  style: 0.12,
  silhouette: 0.1,
  material: 0.08
};

// ---- color science (HSL-based approximation, not true CIELAB/OKLab) ----

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hexToHsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

function hueDistance(h1, h2) {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// Low saturation or near-black/near-white — reads as a neutral that
// safely pairs with anything, same role black/white/gray play in a
// traditional color-pairing chart.
function isNeutral({ s, l }) {
  return s <= 12 || l >= 92 || l <= 10;
}

function classifyHueRelation(hueDist) {
  if (hueDist <= 15) return { relation: "monochromatic tones", score: 82 };
  if (hueDist <= 45) return { relation: "analogous hues", score: 88 };
  if (Math.abs(hueDist - 120) <= 25) return { relation: "triadic hues", score: 80 };
  if (Math.abs(hueDist - 180) <= 30) return { relation: "complementary hues", score: 90 };
  // Between the recognized harmony families — the least predictable zone.
  return { relation: "clashing hues", score: 48 };
}

// Returns { score: 0-100, relation: string }
function colorHarmonyScore(hexA, hexB) {
  const a = hexToHsl(hexA);
  const b = hexToHsl(hexB);
  const neutralA = isNeutral(a);
  const neutralB = isNeutral(b);

  if (neutralA || neutralB) {
    return { score: neutralA && neutralB ? 86 : 91, relation: "neutral pairing" };
  }

  const hueDist = hueDistance(a.h, b.h);
  const { relation, score: baseScore } = classifyHueRelation(hueDist);

  // Two highly saturated colors far apart in hue read as loud/clashing
  // (e.g. neon green + bright red) even when the hue relationship itself
  // (triadic, here) would otherwise score fine.
  const bothVivid = a.s > 70 && b.s > 70;
  const vividPenalty = bothVivid ? Math.max(0, (a.s + b.s) / 2 - 55) * 0.7 : 0;

  const lightDiff = Math.abs(a.l - b.l);
  const contrastAdjustment = lightDiff > 30 ? 5 : lightDiff < 6 ? -4 : 0;

  const score = Math.max(0, Math.min(100, baseScore - vividPenalty + contrastAdjustment));
  return { score: Math.round(score), relation };
}

// ---- non-color factors (null when there's no usable attribute data) ----

const OCCASION_ADJACENCY = {
  casual: { casual: 100, lounge: 80, night_out: 65, workwear: 45, formal: 25, active: 55 },
  formal: { formal: 100, workwear: 75, night_out: 70, casual: 25, lounge: 15, active: 10 },
  workwear: { workwear: 100, formal: 75, casual: 45, night_out: 40, lounge: 20, active: 20 },
  lounge: { lounge: 100, casual: 80, active: 55, night_out: 20, formal: 15, workwear: 20 },
  active: { active: 100, lounge: 55, casual: 55, night_out: 15, workwear: 20, formal: 10 },
  night_out: { night_out: 100, casual: 65, formal: 70, workwear: 40, lounge: 20, active: 15 }
};

function occasionScore(occA, occB) {
  if (!occA || occA === "unknown" || !occB || occB === "unknown") return null;
  if (occA === occB) return 100;
  return OCCASION_ADJACENCY[occA]?.[occB] ?? 50;
}

// A short list of specifically-good material pairings (per common styling
// guidance); anything else with two known materials gets a neutral default
// rather than a guessed penalty.
const GOOD_MATERIAL_PAIRS = new Set([
  "denim+cotton",
  "linen+knit",
  "leather+wool",
  "silk+wool",
  "denim+knit",
  "cotton+linen"
]);

function materialScore(matA, matB) {
  if (!matA || matA === "unknown" || !matB || matB === "unknown") return null;
  if (matA === matB) return 85;
  const pair = [matA, matB].sort().join("+");
  return GOOD_MATERIAL_PAIRS.has(pair) ? 95 : 65;
}

function styleTagScore(tagsA, tagsB) {
  const a = new Set(tagsA || []);
  const b = new Set(tagsB || []);
  if (a.size === 0 || b.size === 0) return null;
  const shared = [...a].filter((tag) => b.has(tag));
  const union = new Set([...a, ...b]);
  return Math.round(40 + (shared.length / union.size) * 60);
}

const LOOSE_FITS = new Set(["oversized", "relaxed", "wide"]);
const TIGHT_FITS = new Set(["fitted", "slim", "bodycon", "stretchy"]);

function silhouetteScore(fitA, silA, fitB, silB) {
  const isLoose = (fit, sil) => LOOSE_FITS.has(fit) || sil === "wide" || sil === "oversized";
  const isTight = (fit, sil) => TIGHT_FITS.has(fit) || sil === "slim" || sil === "bodycon";

  const aLoose = isLoose(fitA, silA);
  const aTight = isTight(fitA, silA);
  const bLoose = isLoose(fitB, silB);
  const bTight = isTight(fitB, silB);

  if (!aLoose && !aTight && !bLoose && !bTight) return null;
  if ((aLoose && bTight) || (aTight && bLoose)) return 92; // balanced proportions
  if (aLoose && bLoose) return 55; // oversized + oversized — riskier
  if (aTight && bTight) return 60; // fitted + fitted — riskier
  return 75;
}

// Wears beyond ~8 stop adding anything — this is a rediscovery nudge, not
// the main signal, so it's kept as a small additive bonus rather than a
// weighted factor.
function rotationBonus(item) {
  return Math.max(0, 8 - (item.wearCount || 0));
}

const REASON_LABELS = {
  occasion: "matching occasion",
  material: "complementary materials",
  style: "similar style",
  silhouette: "balanced silhouette"
};

function buildReason(parts, colorRelation) {
  const strongFactors = parts
    .filter((p) => p.key !== "color" && p.score >= 75)
    .map((p) => REASON_LABELS[p.key])
    .filter(Boolean);
  return [colorRelation, ...strongFactors].slice(0, 3).join(" · ");
}

// Scores one candidate item against one anchor (already-selected) item.
// Returns null if there's no color data to compare (color is the one
// always-required factor).
function pairScore(anchor, candidate) {
  const anchorColors = anchor.colorTags || [];
  const candidateColors = candidate.colorTags || [];
  if (anchorColors.length === 0 || candidateColors.length === 0) return null;

  let bestColor = null;
  for (const anchorHex of anchorColors) {
    for (const candidateHex of candidateColors) {
      const result = colorHarmonyScore(anchorHex, candidateHex);
      if (!bestColor || result.score > bestColor.score) {
        bestColor = { ...result, anchorHex };
      }
    }
  }
  if (!bestColor) return null;

  const parts = [{ key: "color", score: bestColor.score, weight: WEIGHTS.color }];

  const occ = occasionScore(anchor.attributes?.occasion, candidate.attributes?.occasion);
  if (occ !== null) parts.push({ key: "occasion", score: occ, weight: WEIGHTS.occasion });

  const style = styleTagScore(anchor.styleTags, candidate.styleTags);
  if (style !== null) parts.push({ key: "style", score: style, weight: WEIGHTS.style });

  const sil = silhouetteScore(
    anchor.attributes?.fit,
    anchor.attributes?.silhouette,
    candidate.attributes?.fit,
    candidate.attributes?.silhouette
  );
  if (sil !== null) parts.push({ key: "silhouette", score: sil, weight: WEIGHTS.silhouette });

  const mat = materialScore(anchor.attributes?.material, candidate.attributes?.material);
  if (mat !== null) parts.push({ key: "material", score: mat, weight: WEIGHTS.material });

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const weightedAverage = parts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight;
  const score = Math.round(Math.max(0, Math.min(100, weightedAverage + rotationBonus(candidate))));

  return {
    score,
    anchorHex: bestColor.anchorHex,
    anchorLabel: nearestColorName(bestColor.anchorHex),
    reason: buildReason(parts, bestColor.relation)
  };
}

// Given the currently-selected outfit items, returns a Map of
// itemId -> { tier: "good" | "soso", score, hex, label, reason } for every
// *other* candidate item that scores above the "soso" floor against
// whichever selected item explains it best. Meant to be recomputed live
// (e.g. in a useMemo keyed on selection) so suggestions update as the user
// builds an outfit.
export function suggestOutfitMatches(selectedItems, candidateItems) {
  const matches = new Map();
  if (selectedItems.length === 0) return matches;

  const selectedIds = new Set(selectedItems.map((item) => item.id));
  for (const candidate of candidateItems) {
    if (selectedIds.has(candidate.id)) continue;

    let best = null;
    for (const anchor of selectedItems) {
      const result = pairScore(anchor, candidate);
      if (result && (!best || result.score > best.score)) best = result;
    }

    if (best && best.score >= SOSO_THRESHOLD) {
      matches.set(candidate.id, {
        tier: best.score >= GOOD_THRESHOLD ? "good" : "soso",
        score: best.score,
        hex: best.anchorHex,
        label: best.anchorLabel,
        reason: best.reason
      });
    }
  }
  return matches;
}
