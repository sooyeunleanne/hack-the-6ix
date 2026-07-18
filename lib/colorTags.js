function toHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function colorDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getSamplingBounds(width, height) {
  const padding = 0.15;
  const cropWidth = Math.max(1, Math.floor(width * (1 - padding * 2)));
  const cropHeight = Math.max(1, Math.floor(height * (1 - padding * 2)));
  const startX = Math.floor((width - cropWidth) / 2);
  const startY = Math.floor((height - cropHeight) / 2);
  return { startX, startY, endX: startX + cropWidth, endY: startY + cropHeight };
}

// Product photos are almost always shot against a plain backdrop, so the
// outermost ring of pixels is a reliable sample of the backdrop color(s)
// even when the garment isn't perfectly centered or fills most of the frame.
function detectBackgroundColors(pixelData, width, height) {
  const counts = new Map();
  const borderThickness = Math.max(1, Math.floor(Math.min(width, height) * 0.04));

  function sample(x, y) {
    const i = (y * width + x) * 4;
    if (pixelData[i + 3] < 128) return;
    const key = `${pixelData[i]},${pixelData[i + 1]},${pixelData[i + 2]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (let x = 0; x < width; x += 1) {
    for (let t = 0; t < borderThickness; t += 1) {
      sample(x, t);
      sample(x, height - 1 - t);
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let t = 0; t < borderThickness; t += 1) {
      sample(t, y);
      sample(width - 1 - t, y);
    }
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0) || 1;
  return [...counts.entries()]
    .filter(([, count]) => count / total > 0.02) // drop rare noise (buttons, shadows caught at the edge)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key.split(",").map(Number));
}

const BACKGROUND_MATCH_THRESHOLD = 28;

function countForegroundColors(pixelData, width, height, backgroundColors, { startX, startY, endX, endY }) {
  const counts = new Map();
  for (let y = startY; y < endY; y += 1) {
    const rowOffset = y * width * 4;
    for (let x = startX; x < endX; x += 1) {
      const i = rowOffset + x * 4;
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];

      if (a < 128) continue;
      if (backgroundColors.some((bg) => colorDistance(bg, [r, g, b]) < BACKGROUND_MATCH_THRESHOLD)) continue;

      const hex = toHex(r, g, b);
      counts.set(hex, (counts.get(hex) || 0) + 1);
    }
  }
  return counts;
}

function luma(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function weightedMedian(valuesAscending) {
  const total = valuesAscending.reduce((sum, [, weight]) => sum + weight, 0);
  let cumulative = 0;
  for (const [value, weight] of valuesAscending) {
    cumulative += weight;
    if (cumulative >= total / 2) return value;
  }
  return valuesAscending.length ? valuesAscending[valuesAscending.length - 1][0] : 0;
}

// Garment fabric under normal lighting shows a spread of shades from the
// same base color — folds read darker (shadow), raised weave reads lighter
// (highlight/sheen). A person calls that one color, not several, so instead
// of returning the top-N raw pixel hexes (which mostly just enumerates those
// shades) we collapse to a single representative value: drop pixels far from
// the pixel-weighted median lightness (the shadow/highlight extremes), then
// average the RGB of what's left.
const MIDTONE_LUMA_BAND = 40; // out of 255

function pickDominantColor(counts) {
  const entries = [...counts.entries()].map(([hex, count]) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b, count, luma: luma(r, g, b) };
  });

  const medianLuma = weightedMedian(entries.map((e) => [e.luma, e.count]).sort((a, b) => a[0] - b[0]));
  const midtones = entries.filter((e) => Math.abs(e.luma - medianLuma) <= MIDTONE_LUMA_BAND);
  const pool = midtones.length > 0 ? midtones : entries;

  const totalWeight = pool.reduce((sum, e) => sum + e.count, 0);
  const avg = pool.reduce(
    (acc, e) => ({
      r: acc.r + e.r * e.count,
      g: acc.g + e.g * e.count,
      b: acc.b + e.b * e.count
    }),
    { r: 0, g: 0, b: 0 }
  );

  return toHex(Math.round(avg.r / totalWeight), Math.round(avg.g / totalWeight), Math.round(avg.b / totalWeight));
}

// Returns a single-element array with the garment's one dominant color —
// see pickDominantColor for how shadow/highlight shading gets folded in
// rather than reported as separate colors.
export function extractColorTagsFromPixelData(pixelData, width, height) {
  const bounds = getSamplingBounds(width, height);
  const backgroundColors = detectBackgroundColors(pixelData, width, height);

  let counts = countForegroundColors(pixelData, width, height, backgroundColors, bounds);

  // Every sampled pixel matched the backdrop (e.g. garment is mostly the
  // same tone as the background) — fall back to the raw center crop rather
  // than returning nothing.
  if (counts.size === 0) {
    counts = countForegroundColors(pixelData, width, height, [], bounds);
  }

  if (counts.size === 0) return [];
  return [pickDominantColor(counts)];
}
