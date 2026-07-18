const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-flash-latest";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
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
