import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { getUserByAuth0Id } from "../../../../models/users";
import {
  getClosetItemById,
  updateClosetItemTags,
  deleteClosetItem
} from "../../../../models/closetItems";

async function requireUser() {
  const session = await auth0.getSession();
  if (!session) return null;
  return getUserByAuth0Id(session.user.sub);
}

export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const item = await getClosetItemById(params.id, user._id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

// PATCH body: { category?, colorTags? } — e.g. user correcting an
// auto-tag suggestion.
export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const updated = await updateClosetItemTags(params.id, user._id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const deleted = await deleteClosetItem(params.id, user._id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
