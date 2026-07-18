import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { updateFullBodyPhoto } from "../../../../models/users";

// POST /api/users/photo — body: { photoUrl } (data URL from the client)
// Saves the full-body reference photo used for Nano Banana try-on.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { photoUrl } = await request.json().catch(() => ({}));
  if (!photoUrl) return NextResponse.json({ error: "photoUrl required" }, { status: 400 });

  await updateFullBodyPhoto(session.user.sub, photoUrl);
  return NextResponse.json({ ok: true });
}
