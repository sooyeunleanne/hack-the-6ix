// Curated named-color table for deriving a human-readable label from a hex
// value. Hex is the canonical stored color (see CLAUDE.md); names are display
// only, resolved by nearest RGB match.
const NAMED_COLORS = [
  { name: "black", hex: "#000000" },
  { name: "charcoal", hex: "#36454F" },
  { name: "gray", hex: "#808080" },
  { name: "silver", hex: "#C0C0C0" },
  { name: "white", hex: "#FFFFFF" },
  { name: "ivory", hex: "#FFFFF0" },
  { name: "cream", hex: "#FFFDD0" },
  { name: "beige", hex: "#E8DCC4" },
  { name: "tan", hex: "#D2B48C" },
  { name: "camel", hex: "#C19A6B" },
  { name: "brown", hex: "#8B5A2B" },
  { name: "chocolate", hex: "#5C4033" },
  { name: "red", hex: "#D0342C" },
  { name: "burgundy", hex: "#800020" },
  { name: "maroon", hex: "#5C1A1B" },
  { name: "pink", hex: "#FFC0CB" },
  { name: "blush", hex: "#DE9CA6" },
  { name: "hot pink", hex: "#FF69B4" },
  { name: "coral", hex: "#FF7F50" },
  { name: "orange", hex: "#ED8B00" },
  { name: "rust", hex: "#B7410E" },
  { name: "gold", hex: "#D4AF37" },
  { name: "yellow", hex: "#F4D03F" },
  { name: "mustard", hex: "#C9A227" },
  { name: "olive", hex: "#708238" },
  { name: "green", hex: "#3E8E41" },
  { name: "sage", hex: "#9CAF88" },
  { name: "forest green", hex: "#264D33" },
  { name: "mint", hex: "#98D8C8" },
  { name: "teal", hex: "#178582" },
  { name: "turquoise", hex: "#40E0D0" },
  { name: "sky blue", hex: "#87CEEB" },
  { name: "blue", hex: "#2C6BED" },
  { name: "denim blue", hex: "#4A6A8A" },
  { name: "navy", hex: "#1B263B" },
  { name: "periwinkle", hex: "#B0B7E6" },
  { name: "purple", hex: "#7A3E9D" },
  { name: "lavender", hex: "#B497BD" },
  { name: "plum", hex: "#673147" }
];

function hexToRgb(hex) {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(String(hex).trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

const NAMED_RGB = NAMED_COLORS.map((c) => ({ name: c.name, rgb: hexToRgb(c.hex) }));

export function nearestColorName(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return String(hex || "").trim();

  let best = null;
  let bestDist = Infinity;
  for (const c of NAMED_RGB) {
    const dr = rgb[0] - c.rgb[0];
    const dg = rgb[1] - c.rgb[1];
    const db = rgb[2] - c.rgb[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c.name;
    }
  }
  return best;
}
