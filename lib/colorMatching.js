// Live color-pairing suggestions, based on the "옷 색깔 조합" (clothing color
// combination) chart: for each main color, which colors pair well ("good")
// vs acceptably ("soso"). Hex is the source of truth for closet item colors
// (see CLAUDE.md), so we bucket each hex into one of the chart's colors via
// nearestColorName, then look up the relation.
import { nearestColorName } from "./colorNames";

export const COLOR_BUCKETS = {
  pink: { label: "pink", swatch: "#FFC0CB" },
  red: { label: "red", swatch: "#D0342C" },
  orange: { label: "orange", swatch: "#ED8B00" },
  beige: { label: "beige", swatch: "#E8DCC4" },
  yellow: { label: "yellow", swatch: "#F4D03F" },
  green: { label: "green", swatch: "#3E8E41" },
  lightblue: { label: "light blue", swatch: "#87CEEB" },
  navy: { label: "navy", swatch: "#1B263B" },
  purple: { label: "purple", swatch: "#7A3E9D" },
  brown: { label: "brown", swatch: "#8B5A2B" },
  gray: { label: "gray", swatch: "#808080" },
  black: { label: "black", swatch: "#000000" },
  white: { label: "white", swatch: "#FFFFFF" }
};

// Maps the fine-grained names from colorNames.js down to the chart's 13
// main colors.
const NAME_TO_BUCKET = {
  black: "black",
  charcoal: "gray",
  gray: "gray",
  silver: "gray",
  white: "white",
  ivory: "white",
  cream: "beige",
  beige: "beige",
  tan: "beige",
  camel: "beige",
  brown: "brown",
  chocolate: "brown",
  red: "red",
  burgundy: "red",
  maroon: "red",
  pink: "pink",
  blush: "pink",
  "hot pink": "pink",
  coral: "orange",
  orange: "orange",
  rust: "orange",
  gold: "yellow",
  yellow: "yellow",
  mustard: "yellow",
  olive: "green",
  green: "green",
  sage: "green",
  "forest green": "green",
  mint: "green",
  teal: "green",
  turquoise: "lightblue",
  "sky blue": "lightblue",
  blue: "lightblue",
  "denim blue": "lightblue",
  navy: "navy",
  periwinkle: "lightblue",
  purple: "purple",
  lavender: "purple",
  plum: "purple"
};

const ALL_BUCKETS = Object.keys(COLOR_BUCKETS);
const universalGood = (self) => ALL_BUCKETS.filter((b) => b !== self);

// Per chart row: "good" = highlighted GOOD-side dots, "soso" = the dots past
// the arrow toward SOSO. Black and white aren't rows on the chart, but they
// show up as a GOOD match on nearly every row, so they're modeled as
// universal neutrals that pair well with everything.
const COMPATIBILITY = {
  pink: { good: ["white", "gray", "beige", "red", "orange", "black"], soso: ["lightblue", "navy"] },
  red: { good: ["white", "pink", "beige", "brown", "gray", "black"], soso: ["lightblue"] },
  orange: { good: ["green", "white", "brown", "beige", "black"], soso: ["yellow", "lightblue", "gray"] },
  beige: { good: ["lightblue", "white", "brown", "navy", "black"], soso: ["orange", "yellow", "green"] },
  yellow: { good: ["white", "gray", "black", "beige"], soso: ["green", "brown"] },
  green: { good: ["white", "brown", "beige", "gray", "orange", "black"], soso: ["lightblue", "yellow"] },
  lightblue: { good: ["beige", "white", "brown", "gray", "navy", "black"], soso: ["orange", "pink"] },
  navy: { good: ["white", "brown", "beige", "lightblue", "gray", "black"], soso: ["yellow", "pink"] },
  purple: { good: ["gray", "white", "black", "beige"], soso: ["lightblue"] },
  brown: { good: ["beige", "white", "lightblue", "black", "navy"], soso: ["orange", "pink"] },
  gray: { good: ["black", "white", "lightblue", "pink", "red", "navy"], soso: ["purple"] },
  black: { good: universalGood("black"), soso: [] },
  white: { good: universalGood("white"), soso: [] }
};

export function hexToBucket(hex) {
  const name = nearestColorName(hex);
  return NAME_TO_BUCKET[name] || null;
}

// 'good' | 'soso' | null (no meaningful relation, e.g. same bucket or
// unrecognized color)
export function matchTier(hexA, hexB) {
  const a = hexToBucket(hexA);
  const b = hexToBucket(hexB);
  if (!a || !b || a === b) return null;
  const relation = COMPATIBILITY[a];
  if (relation.good.includes(b)) return "good";
  if (relation.soso.includes(b)) return "soso";
  return null;
}

// Dedupes an item list down to the distinct hex colors present, each
// annotated with a display label — the "anchor" colors a live suggestion
// pass checks other items against.
export function colorsFromItems(items) {
  const seen = new Map();
  for (const item of items) {
    for (const hex of item.colorTags || []) {
      if (seen.has(hex)) continue;
      const bucket = hexToBucket(hex);
      if (!bucket) continue;
      seen.set(hex, { hex, label: nearestColorName(hex), bucket });
    }
  }
  return [...seen.values()];
}

// Scores one candidate item against the current set of anchor colors and
// returns the strongest relation found, e.g. { tier: "good", hex, label }
// meaning the item pairs well with that anchor color. Returns null if none
// of the item's colors relate to any anchor color.
export function bestMatchForItem(item, anchorColors) {
  let best = null;
  for (const candidateHex of item.colorTags || []) {
    for (const anchor of anchorColors) {
      const tier = matchTier(anchor.hex, candidateHex);
      if (!tier) continue;
      if (!best || (tier === "good" && best.tier === "soso")) {
        best = { tier, hex: anchor.hex, label: anchor.label };
      }
    }
  }
  return best;
}

// Given the currently-selected outfit items, returns a Map of
// itemId -> bestMatchForItem(...) for every *other* candidate item that has
// a color relation to something already selected. Meant to be recomputed
// live (e.g. in a useMemo keyed on selection) so suggestions update as the
// user builds an outfit.
export function suggestColorMatches(selectedItems, candidateItems) {
  const anchorColors = colorsFromItems(selectedItems);
  const matches = new Map();
  if (anchorColors.length === 0) return matches;

  const selectedIds = new Set(selectedItems.map((item) => item.id));
  for (const item of candidateItems) {
    if (selectedIds.has(item.id)) continue;
    const match = bestMatchForItem(item, anchorColors);
    if (match) matches.set(item.id, match);
  }
  return matches;
}
