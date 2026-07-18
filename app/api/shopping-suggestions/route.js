import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";
import { getUserByAuth0Id } from "../../../models/users";
import { saveSuggestion, getSuggestionsByUser } from "../../../models/shoppingSuggestions";

export async function GET() {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const suggestions = await getSuggestionsByUser(user._id);
  return NextResponse.json({ suggestions });
}

// POST body: { outfitContext, suggestedItems } — call this after Leanne's
// Gemini call returns structured JSON. This route only persists results,
// it doesn't call Gemini itself.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const { outfitContext, suggestedItems } = await request.json();
  const saved = await saveSuggestion(user._id, { outfitContext, suggestedItems });
  return NextResponse.json({ suggestion: saved }, { status: 201 });
}
