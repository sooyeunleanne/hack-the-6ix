import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { getUserByAuth0Id } from "../../../../models/users";
import { getClosetItemsByUser } from "../../../../models/closetItems";
import { saveSuggestion } from "../../../../models/shoppingSuggestions";
import { hasGeminiKey, generateJson } from "../../../../lib/gemini";
import { nearestColorName } from "../../../../lib/colorNames";
import { checkRateLimit } from "../../../../lib/rateLimit";

const STARTER_SUGGESTIONS = [
  { name: "White sneakers", category: "Shoes", colorTags: ["white"], reason: "A neutral shoe that pairs with almost everything you own." },
  { name: "Beige trench coat", category: "Outerwear", colorTags: ["beige"], reason: "Your closet is light on outerwear for in-between weather." },
  { name: "Dark wash denim", category: "Bottom", colorTags: ["blue", "denim"], reason: "A versatile bottom to balance out your brighter tops." }
];

function mockSuggestions(items) {
  const categories = new Set(items.map((i) => i.category));
  const picks = STARTER_SUGGESTIONS.filter((s) => !categories.has(s.category));
  return { suggestedItems: (picks.length ? picks : STARTER_SUGGESTIONS).slice(0, 3), mock: true };
}

// POST /api/shopping-suggestions/generate — body: { vibe? }
// Text-first: asks Gemini to spot gaps in the closet (categories/colors
// that are missing or underrepresented) and suggest 3-5 items to buy.
// Deliberately no image generation here — if a shopper wants to see a
// suggestion on themselves, that reuses the existing /api/tryon flow
// (TryOnPanel) rather than a second image pipeline.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const { vibe } = await request.json().catch(() => ({}));
  const items = await getClosetItemsByUser(user._id);

  let result;
  if (!hasGeminiKey()) {
    result = mockSuggestions(items);
  } else if (!(await checkRateLimit(user._id, "shopping-suggestions", { limit: 15, windowSeconds: 600 })).allowed) {
    return NextResponse.json(
      { error: "Too many requests — please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  } else {
    const catalog = items.map((i) => ({
      category: i.category,
      colorTags: (i.color_tags || []).map((hex) => `${hex} (${nearestColorName(hex)})`)
    }));
    const prompt = `You are a fairy-godmother personal shopper. Here is the shopper's current closet catalog (JSON, category + colors only): ${JSON.stringify(
      catalog
    )}\nStyle preference / vibe: "${vibe || "versatile everyday"}".\nSpot 3 to 5 gaps — categories or colors that are missing or underrepresented — and suggest specific items to buy that would complete more outfits. Respond with ONLY JSON: {"suggestedItems": [{"name": "...", "category": "...", "colorTags": ["..."], "reason": "one short sentence"}]}.`;

    try {
      const parsed = await generateJson(prompt);
      const suggestedItems = Array.isArray(parsed.suggestedItems) ? parsed.suggestedItems.slice(0, 5) : [];
      if (suggestedItems.length === 0) throw new Error("No suggestions returned");
      result = { suggestedItems, mock: false };
    } catch (err) {
      result = { ...mockSuggestions(items), error: err.message };
    }
  }

  const saved = await saveSuggestion(user._id, {
    outfitContext: { vibe: vibe || null, mock: result.mock },
    suggestedItems: result.suggestedItems
  });

  return NextResponse.json({
    suggestionId: saved._id,
    suggestedItems: result.suggestedItems,
    mock: result.mock
  });
}
