import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";
import { getUserByAuth0Id } from "../../../models/users";
import { createClosetItem, getClosetItemsByUser } from "../../../models/closetItems";

async function requireUser() {
  const session = await auth0.getSession();
  if (!session) return null;
  return getUserByAuth0Id(session.user.sub);
}

// GET /api/closet-items?sortByWear=true — sortByWear=true gives least-worn
// first, which is the "front of closet" ordering for the wear-reorder UI.
export async function GET(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sortByWear = request.nextUrl.searchParams.get("sortByWear") === "true";
  const items = await getClosetItemsByUser(user._id, { sortByWear });
  return NextResponse.json({ items });
}

// POST /api/closet-items — body: { imageUrl, category, colorTags }
// NOTE: this route only persists the item. Auto-tagging (color/category
// suggestion from the photo) is Leanne's Gemini call — run that first and
// pass the result in here.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { imageUrl, category, colorTags } = body;
  if (!imageUrl || !category) {
    return NextResponse.json({ error: "imageUrl and category are required" }, { status: 400 });
  }

  const item = await createClosetItem(user._id, { imageUrl, category, colorTags });
  return NextResponse.json({ item }, { status: 201 });
}
