const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-preview-image-generation";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

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
    throw new Error(`Nano Banana image request failed (${res.status})`);
  }
  const data = await res.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!imagePart) throw new Error("Nano Banana returned no image");
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}
