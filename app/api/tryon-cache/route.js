import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";
import { getCachedTryon, saveTryonResult } from "../../../models/tryonCache";

// GET /api/tryon-cache?itemIds=id1,id2 — check this BEFORE calling Nano
// Banana. If it returns a hit, skip the generation call entirely.
export async function GET(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const itemIdsParam = request.nextUrl.searchParams.get("itemIds") || "";
  const itemIds = itemIdsParam.split(",").filter(Boolean);
  if (itemIds.length === 0) {
    return NextResponse.json({ error: "itemIds query param required" }, { status: 400 });
  }

  const cached = await getCachedTryon(itemIds);
  return NextResponse.json({ cached: cached || null });
}

// POST /api/tryon-cache — body: { itemIds, generatedImageUrl }
// Call this right after a successful Nano Banana generation to cache it.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { itemIds, generatedImageUrl } = await request.json();
  if (!itemIds || !generatedImageUrl) {
    return NextResponse.json(
      { error: "itemIds and generatedImageUrl are required" },
      { status: 400 }
    );
  }

  await saveTryonResult(itemIds, generatedImageUrl);
  return NextResponse.json({ ok: true });
}
