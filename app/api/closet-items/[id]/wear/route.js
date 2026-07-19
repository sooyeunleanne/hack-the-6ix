import { NextResponse } from "next/server";
import { auth0 } from "../../../../../lib/auth0";
import { getUserByAuth0Id } from "../../../../../models/users";
import { markWorn } from "../../../../../models/closetItems";
import { logOutfitWorn } from "../../../../../models/outfitLog";

// POST /api/closet-items/:id/wear — the "wore this today" button.
// Increments wear_count + sets last_worn_at on this item, and logs an
// outfit_log entry. Optional body: { itemIds: [...], occasion }
// to log the full outfit rather than just this one item.
export async function POST(request, { params }) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const { id } = await params;
  const worn = await markWorn(id, user._id);
  if (!worn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const itemIds = body.itemIds || [id];
  const entry = await logOutfitWorn(user._id, itemIds, { occasion: body.occasion });

  return NextResponse.json({ ok: true, outfitLogEntry: entry });
}
