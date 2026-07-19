import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { getUserByAuth0Id } from "../../../../../models/users";
import { getClosetItemById, getSimilarItems } from "../../../../../models/closetItems";
import { hasGeminiKey, generateJson } from "../../../../../lib/gemini";
import { nearestColorName } from "../../../../../lib/colorNames";

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

// A same-day upload has idleDays === 0 — "0 days unworn" reads like a typo,
// not a stat, so it gets its own phrase instead of the numeric punchline.
function idleStat(idleDays) {
  return idleDays > 0 ? `${idleDays} days unworn` : "Never worn yet";
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

  const { id } = await params;
  const item = await getClosetItemById(id, user._id);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const idleDays = daysSince(item.last_worn_at || item.created_at);
  const similar = await getSimilarItems(user._id, item);
  const target = describeItem(item);
  const siblings = similar.map(describeItem);
  const favoriteSibling = siblings.length
    ? siblings.reduce((best, s) => (s.wearCount > best.wearCount ? s : best), siblings[0])
    : null;

  const stat = idleStat(idleDays);
  const fallback = {
    explanation: favoriteSibling && favoriteSibling.wearCount > 0
      ? `${stat} — you reach for the ${favoriteSibling.fit || "other"} one instead.`
      : similar.length > 0
      ? `${stat}, ${similar.length} similar piece${similar.length === 1 ? "" : "s"} already in rotation.`
      : `${stat}.`,
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

Write ONE short, punchy sentence (under 14 words) explaining why this item might be worth donating. Lead with the idle days as a number, not a full clause — UNLESS idleDays is 0, in which case say "Never worn yet" instead of "0 days unworn" (a same-day upload isn't idle, it just hasn't been worn). If mostWornSimilarItem is given, punch up the fact they reach for that one instead (mention its fit if provided). Otherwise if similarItemCount > 0, mention the count. Skip filler words like "hasn't been worn" or "it's been sitting" — state it tersely, like a stat. Examples of the tone wanted: "428 days unworn — you always grab the oversized one instead." / "60 days idle, 3 similar tops already in rotation." / "Never worn yet, and 2 similar tops are already in rotation." Do not use double quotation marks inside the reply text. Respond with ONLY JSON: {"explanation": "...", "recommendation": "donate" | "sell" | "keep"}. Use "keep" only if idleDays is under 90 and there are no similar items.`;

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
