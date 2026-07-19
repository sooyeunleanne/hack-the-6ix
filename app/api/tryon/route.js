import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";
import { getUserByAuth0Id } from "../../../models/users";
import { getClosetItemById } from "../../../models/closetItems";
import { getCachedTryon, saveTryonResult } from "../../../models/tryonCache";
import { hasGeminiKey } from "../../../lib/gemini";
import { generateImage } from "../../../lib/nanoBanana";
import { dataUrlToInlineImage } from "../../../lib/imageUtils";

const PLACEHOLDER_SVG =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='520'><rect width='100%' height='100%' fill='#2a3570'/><text x='50%' y='45%' fill='#f0c85a' font-size='22' text-anchor='middle' font-family='sans-serif'>Try-on preview</text><text x='50%' y='55%' fill='#cfe0fb' font-size='14' text-anchor='middle' font-family='sans-serif'>(add GEMINI_API_KEY for real magic)</text></svg>`
  ).toString("base64");

// POST /api/tryon — body: { itemIds }
// Checks tryon_cache first, then calls Gemini's image model ("nano banana")
// with the user's full-body photo + selected item photos, and caches the
// result. Falls back to a placeholder if no photo/key is configured yet.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const { itemIds } = await request.json().catch(() => ({}));
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json({ error: "itemIds required" }, { status: 400 });
  }

  const cached = await getCachedTryon(itemIds);
  if (cached) {
    return NextResponse.json({ generatedImageUrl: cached.generated_image_url, cached: true });
  }

  if (!hasGeminiKey() || !user.full_body_photo_url) {
    return NextResponse.json({
      generatedImageUrl: PLACEHOLDER_SVG,
      cached: false,
      mock: true,
      note: !user.full_body_photo_url
        ? "Upload a full-body photo in your profile to try this on for real."
        : "Add GEMINI_API_KEY to generate a real try-on."
    });
  }

  // getClosetItemById is owner-scoped — pass user._id or every lookup 404s.
  const items = await Promise.all(itemIds.map((id) => getClosetItemById(id, user._id)));
  const validItems = items.filter(Boolean);

  const userPhoto = dataUrlToInlineImage(user.full_body_photo_url);
  const itemsWithImages = validItems
    .map((item) => ({ item, image: dataUrlToInlineImage(item.image_url) }))
    .filter((entry) => entry.image);
  const itemImages = itemsWithImages.map((entry) => entry.image);

  try {
    // Structured metadata per item (pulled from the Gemini tagging done at
    // upload time — see analyzeClosetPhoto in lib/gemini.js) so the model is
    // told the garment's exact hex/fit/material/silhouette instead of having
    // to infer them from the reference photo alone, which is what let it
    // drift into "close enough" redesigns.
    const itemList = itemsWithImages
      .map(({ item }, i) => {
        const refNum = i + 2;
        const hex = (item.color_tags || [])[0] || "unspecified";
        const attr = item.attributes || {};
        const fit = attr.fit && attr.fit !== "unknown" ? attr.fit : "unspecified";
        const material = attr.material && attr.material !== "unknown" ? attr.material : "unspecified";
        const silhouette = attr.silhouette && attr.silhouette !== "unknown" ? attr.silhouette : "unspecified";
        const sleeve = attr.sleeveLength && attr.sleeveLength !== "unknown" ? attr.sleeveLength.replace("_", " ") : null;
        const styleTags = (item.style_tags || []).slice(0, 4).join(", ") || "none";
        const details = [
          `primary color ${hex}`,
          `fit ${fit}`,
          `material ${material}`,
          `silhouette ${silhouette}`,
          sleeve ? `sleeve ${sleeve}` : null,
          `style tags: ${styleTags}`
        ].filter(Boolean).join(", ");
        return `  Reference photo ${refNum} — ${item.category}: ${details}`;
      })
      .join("\n");

    const prompt = `You are a high-precision virtual try-on system compositing an outfit photo. Reference photo 1 is the person; each other reference photo is one exact closet item they own, with its real attributes listed below:
${itemList}

Task: show the person from reference photo 1 wearing ALL of the closet items from the other reference photos, combined into one realistic, full-body outfit photo.

1. GARMENT DESIGN PRESERVATION — for every item, match its reference photo exactly: silhouette, neckline/collar, sleeve length and style, seams, buttons/zippers/pockets, logos, graphics, patterns, and the listed primary color hex. Do not invent, substitute, recolor, simplify, or "redesign" any garment detail — every item must be visually traceable back to its own reference photo, not a similar-looking alternative.

2. FIT AND BODY ALIGNMENT — drape and scale each item to the person's actual shoulder width, torso length, and body proportions from reference photo 1, matching the listed fit/silhouette (do not make an "oversized" item look fitted or vice versa). Render natural folds, fabric tension, and shadows at joints and seams. No floating, misaligned, or stretched-looking clothing.

3. IDENTITY AND SCENE — keep the person's face, hairstyle, skin tone, body proportions, and pose completely unchanged from reference photo 1. Keep the camera angle and perspective consistent so front panels align with the torso direction and left/right garment details stay correctly placed. Do not add accessories, clothing, or props absent from the reference photos.

4. MATERIAL REALISM — render each garment's listed material with appropriate physical behavior (e.g. cotton/knit soft and textured, denim structured and thick, satin/silk reflective, leather glossy with visible grain).

5. COMPOSITION — single cohesive, well-lit, photorealistic full-body shot on a plain neutral background, with consistent lighting and shadow direction across the person and every garment.

Before finalizing: check that every garment's color, silhouette, and design details match its reference photo exactly, with no hallucinated changes.`;
    const generatedImageUrl = await generateImage({
      prompt,
      images: [userPhoto, ...itemImages].filter(Boolean)
    });
    await saveTryonResult(itemIds, generatedImageUrl);
    return NextResponse.json({ generatedImageUrl, cached: false });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
