import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import {
  getClosetItemById,
  updateClosetItemTags,
  deleteClosetItem
} from "../../../../models/closetItems";

export async function GET(request, { params }) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const item = await getClosetItemById(params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

// PATCH body: { category?, colorTags? } — e.g. user correcting an
// auto-tag suggestion.
export async function PATCH(request, { params }) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  await updateClosetItemTags(params.id, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await deleteClosetItem(params.id);
  return NextResponse.json({ ok: true });
}
