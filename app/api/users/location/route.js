import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { updateLocation } from "../../../../models/users";

// POST /api/users/location — body: { location }
// Persists the user's location (city string or { lat, lon }) so weather-based
// outfit suggestions can run without re-prompting for geolocation each session.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { location } = await request.json().catch(() => ({}));
  if (!location) return NextResponse.json({ error: "location required" }, { status: 400 });

  await updateLocation(session.user.sub, location);
  return NextResponse.json({ ok: true });
}
