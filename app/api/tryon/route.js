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
    const itemList = itemsWithImages
      .map(({ item }, i) => {
        const colors = (item.color_tags || []).join(", ") || "unspecified color";
        return `  ${i + 2}. Reference photo ${i + 2}: ${item.category} (${colors})`;
      })
      .join("\n");

    const prompt = `You are compositing a virtual try-on photo. Reference photo 1 is the person; the rest are their exact closet items:
${itemList}

Task: show the person from reference photo 1 wearing ALL of the closet items from the other reference photos, combined into one realistic, full-body outfit photo.

Strict requirements:
- Person: keep the face, identity, skin tone, body shape/proportions, and pose EXACTLY as in reference photo 1. Do not beautify, resize, or restyle the person.
- Garments: reproduce each closet item's exact design — silhouette, cut, color, pattern, print, texture, fabric, logos, hardware, and trim — with zero alterations. Do not invent, substitute, recolor, or simplify any garment detail; every item must be visually traceable back to its reference photo.
- Fit: drape and scale each item naturally to the person's actual body so it fits like a real photo of them wearing it (correct proportions, realistic folds/shadows, no floating or misaligned clothing).
- Composition: single cohesive, well-lit, photorealistic full-body shot, plain neutral background, consistent lighting/shadows across the person and all garments.
- Do not add accessories, clothing, or props that are not shown in the reference photos.`;
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
