const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-flash-latest";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function analyzeClosetPhoto({ dataUrl, fallbackCategory = "Other", fallbackColorTags = [], fallbackStyleTags = [] }) {
  if (!hasGeminiKey()) {
    return {
      category: fallbackCategory,
      colorTags: fallbackColorTags,
      styleTags: fallbackStyleTags,
      note: "Gemini API key is not configured. Using basic defaults.",
      source: "fallback"
    };
  }

  const image = dataUrlToInlineImage(dataUrl);
  if (!image) {
    return {
      category: fallbackCategory,
      colorTags: fallbackColorTags,
      note: "Image data could not be read. Using basic defaults.",
      source: "fallback"
    };
  }

  const prompt = [
    "You are classifying a single front-facing clothing item for a wardrobe app.",
    "CRITICAL: The photo contains ONE clothing item placed on top of a background (a wall, floor, table, bedsheet, hanger, or plain studio backdrop). You must analyze ONLY the clothing item itself and completely disregard the background, no matter how much of the frame it occupies. Mentally segment the garment away from everything behind and around it before doing anything else.",
    "Return JSON only with keys: category, colorTags, styleTags, and attributes.",
    "category must be one of Top, Bottom, Dress, Outerwear, Shoes, Accessory, Bag, Other.",
    "colorTags: the colors of the GARMENT ONLY. Never include a color that comes from the background/backdrop/surface behind or under the item. For example, if a black shirt sits on a white bedsheet, colorTags is [\"black\"], NOT [\"black\", \"white\"]. Only report \"white\" if the garment fabric itself is white. Use short lowercase color names, 1-4 of them, ordered most dominant first.",
    "styleTags should be an array of concise wardrobe hashtags in lowercase, such as long_sleeve, short_sleeve, sleeveless, casual, formal, knit, linen, oversized, fitted, cropped, flowy, minimal, bold, patterned, solid, feminine, masculine, streetwear, officewear, denim, leather, satin, polyester, cotton, summer, winter.",
    "attributes should be an object with useful wardrobe details including sleeveLength, fit, silhouette, occasion, and material when obvious.",
    "sleeveLength must be one of sleeveless, short_sleeve, long_sleeve, unknown.",
    "fit must be one of fitted, relaxed, oversized, stretchy, unknown.",
    "silhouette must be one of straight, slim, wide, A_line, bodycon, oversized, unknown.",
    "occasion must be one of casual, formal, workwear, lounge, active, night_out, unknown.",
    "material must be one of cotton, linen, wool, denim, leather, satin, polyester, knit, mesh, silk, unknown.",
    "If uncertain, choose the closest category and 2-5 likely colors plus 3-6 relevant style tags."
  ].join(" ");

  const res = await fetch(`${BASE_URL}/${TEXT_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: image.mimeType, data: image.dataBase64 } }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!res.ok) {
    throw new Error(`Closet photo analysis failed (${res.status})`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no analysis");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }

  const normalizedColorTags = Array.isArray(parsed.colorTags) && parsed.colorTags.length > 0
    ? parsed.colorTags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
    : fallbackColorTags;

  const normalizedStyleTags = Array.isArray(parsed.styleTags) && parsed.styleTags.length > 0
    ? parsed.styleTags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
    : fallbackStyleTags;

  const attributes = parsed.attributes && typeof parsed.attributes === "object" ? parsed.attributes : {};
  const normalizedAttributes = {
    sleeveLength: typeof attributes.sleeveLength === "string" ? attributes.sleeveLength.toLowerCase() : "unknown",
    fit: typeof attributes.fit === "string" ? attributes.fit.toLowerCase() : "unknown",
    silhouette: typeof attributes.silhouette === "string" ? attributes.silhouette.toLowerCase() : "unknown",
    occasion: typeof attributes.occasion === "string" ? attributes.occasion.toLowerCase() : "unknown",
    material: typeof attributes.material === "string" ? attributes.material.toLowerCase() : "unknown"
  };

  return {
    category: parsed.category || fallbackCategory,
    colorTags: normalizedColorTags,
    styleTags: normalizedStyleTags,
    attributes: normalizedAttributes,
    note: null,
    source: "gemini"
  };
}

// Asks Gemini for a JSON object matching the shape described in the prompt.
export async function generateJson(prompt) {
  const res = await fetch(`${BASE_URL}/${TEXT_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });
  if (!res.ok) {
    throw new Error(`Gemini text request failed (${res.status})`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text);
}

// images: [{ mimeType, dataBase64 }] — reference photos passed alongside
// the prompt (nano banana / gemini image editing pattern).
export async function generateImage({ prompt, images = [] }) {
  const parts = [
    { text: prompt },
    ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.dataBase64 } }))
  ];
  const res = await fetch(`${BASE_URL}/${IMAGE_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] })
  });
  if (!res.ok) {
    throw new Error(`Gemini image request failed (${res.status})`);
  }
  const data = await res.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!imagePart) throw new Error("Gemini returned no image");
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

// data:image/png;base64,AAAA... -> { mimeType, dataBase64 }
export function dataUrlToInlineImage(dataUrl) {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl || "");
  if (!match) return null;
  return { mimeType: match[1], dataBase64: match[2] };
}
