const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
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
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Nano Banana image request failed (${res.status}): ${bodyText}`);
  }
  const data = await res.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!imagePart) throw new Error("Nano Banana returned no image");
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
}

// Isolates the person in a full-body photo onto a plain background, so the
// profile shot reads as "just the person" for try-on compositing.
export async function removeBackground({ mimeType, dataBase64 }) {
  return generateImage({
    prompt:
      "Remove the background from this photo entirely and replace it with a plain, seamless, neutral light-gray studio background. Keep the person — their pose, body, face, proportions, and clothing — exactly unchanged. Do not add, remove, or alter anything about the person themselves.",
    images: [{ mimeType, dataBase64 }]
  });
}
