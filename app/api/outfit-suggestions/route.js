import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";
import { getUserByAuth0Id } from "../../../models/users";
import { getClosetItemsByUser } from "../../../models/closetItems";
import { hasGeminiKey, generateJson } from "../../../lib/gemini";
import { nearestColorName } from "../../../lib/colorNames";

function mockReply(items, message, weather) {
  const sorted = [...items].sort((a, b) => a.wear_count - b.wear_count);
  const picks = sorted.slice(0, Math.min(3, sorted.length));
  const weatherBit = weather ? ` It's ${weather.temp}°${weather.unit} and ${weather.condition} out there,` : "";
  return {
    itemIds: picks.map((i) => i._id.toString()),
    reply: `Demo mode (no GEMINI_API_KEY set):${weatherBit} so I pulled some of your least-worn pieces for you.`,
    mock: true
  };
}

// POST /api/outfit-suggestions — body: { message, weather?, history? }
// Chat-driven: Gemini reads the conversation + current weather and replies
// in character, picking 2-4 closet items to go with the reply. Falls back
// to a deterministic "least-worn" mock if no GEMINI_API_KEY is configured.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const { message, weather, history } = await request.json().catch(() => ({}));
  const items = await getClosetItemsByUser(user._id);

  if (items.length === 0) {
    return NextResponse.json({ error: "Closet is empty" }, { status: 400 });
  }

  if (!hasGeminiKey()) {
    return NextResponse.json(mockReply(items, message, weather));
  }

  const catalog = items.map((i) => ({
    id: i._id.toString(),
    category: i.category,
    colorTags: (i.color_tags || []).map((hex) => `${hex} (${nearestColorName(hex)})`)
  }));

  const historyText = (history || [])
    .slice(-6)
    .map((h) => `${h.role === "user" ? "User" : "You"}: ${h.text}`)
    .join("\n");

  const weatherText = weather ? `Current weather: ${weather.temp}°${weather.unit}, ${weather.condition}.` : "Weather unknown.";
  const locationText = weather?.locationLabel ? `Location: ${weather.locationLabel}.` : "";

  const prompt = `You are a warm, encouraging fairy-godmother personal stylist chatting with the user about what to wear.
${weatherText}
${locationText}
Closet catalog (JSON): ${JSON.stringify(catalog)}
${historyText ? `Conversation so far:\n${historyText}\n` : ""}The user just said: "${message}"

Pick 2 to 4 item ids from the catalog that fit what they asked for and the weather. Reply conversationally, in character, 1-3 sentences, naturally referencing the weather when relevant. If the user asks what's trending or in style right now, or seems unsure/lost about what to wear, name 1-2 fashion aesthetics or vibes currently popular for the season and location (e.g. clean girl, old money, coquette, quiet luxury, gorpcore, dark academia, y2k revival) and lean your item picks toward that vibe where the catalog allows. Do not use double quotation marks anywhere inside the reply text, including around trend names — write them in plain text instead. Respond with ONLY JSON: {"itemIds": ["..."], "reply": "..."}. Only use ids from the catalog.`;

  try {
    const result = await generateJson(prompt);
    const validIds = new Set(catalog.map((c) => c.id));
    const itemIds = (result.itemIds || []).filter((id) => validIds.has(id));
    if (itemIds.length === 0) throw new Error("No valid items chosen");
    return NextResponse.json({ itemIds, reply: result.reply || "Here's what I'd suggest.", mock: false });
  } catch (err) {
    console.error("outfit-suggestions: Gemini call failed, falling back to mock:", err.message);
    return NextResponse.json({ ...mockReply(items, message, weather), error: err.message });
  }
}
