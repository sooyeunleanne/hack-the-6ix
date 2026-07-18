import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { getUserByAuth0Id } from "../../../../../models/users";
import { getClosetItemById, getSimilarItems } from "../../../../../models/closetItems";
import { hasGeminiKey, generateJson } from "../../../../../lib/gemini";
import { nearestColorName } from "../../../../../lib/colorNames";

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function describeItem(item) {
  const color = (item.color_tags || [])[0];
  return {
    category: item.category,
    color: color ? nearestColorName(color) : "unknown color",
    fit: item.attributes?.fit && item.attributes.fit !== "unknown" ? item.attributes.fit : null,
    wearCount: item.wear_count || 0
  };
}

// GET /api/closet-items/:id/donation-recommendation
// Computes real facts (idle days, similar items, wear counts) server-side,
// then asks Gemini to phrase them into a specific, non-generic explanation —
// the prompt explicitly forbids inventing numbers not given to it.
export async function GET(request, { params }) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const item = await getClosetItemById(params.id, user._id);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const idleDays = daysSince(item.last_worn_at || item.created_at);
  const similar = await getSimilarItems(user._id, item);
  const target = describeItem(item);
  const siblings = similar.map(describeItem);
  const favoriteSibling = siblings.length
    ? siblings.reduce((best, s) => (s.wearCount > best.wearCount ? s : best), siblings[0])
    : null;

  const fallback = {
    explanation:
      similar.length > 0
        ? `Hasn't been worn in ${idleDays} days, and there are ${similar.length} similar item${similar.length === 1 ? "" : "s"} in the closet already.`
        : `Hasn't been worn in ${idleDays} days.`,
    recommendation: "donate"
  };

  if (!hasGeminiKey()) {
    return NextResponse.json({ ...fallback, mock: true });
  }

  const facts = {
    item: target,
    idleDays,
    similarItemCount: siblings.length,
    similarItems: siblings,
    mostWornSimilarItem: favoriteSibling && favoriteSibling.wearCount > 0 ? favoriteSibling : null
  };

  const prompt = `You are a warm, encouraging fairy-godmother personal stylist helping a user decide whether to donate a closet item they never wear. Use ONLY the facts given below — never invent a statistic, count, or detail that isn't provided.

Facts (JSON): ${JSON.stringify(facts)}

Write a short (2-3 sentence) explanation of why this item might be worth donating, specifically referencing the idle days and, if similarItemCount > 0, the fact that similar items exist — and if mostWornSimilarItem is given, that they consistently reach for that one instead (mention its fit if provided, e.g. "the oversized one"). Do not use double quotation marks inside the reply text. Respond with ONLY JSON: {"explanation": "...", "recommendation": "donate" | "sell" | "keep"}. Use "keep" only if idleDays is under 90 and there are no similar items.`;

  try {
    const result = await generateJson(prompt);
    if (!result.explanation) throw new Error("Gemini returned no explanation");
    return NextResponse.json({
      explanation: result.explanation,
      recommendation: result.recommendation || fallback.recommendation,
      mock: false
    });
  } catch (err) {
    return NextResponse.json({ ...fallback, mock: true, error: err.message });
  }
}
