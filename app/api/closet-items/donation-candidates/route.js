import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { getUserByAuth0Id } from "../../../../models/users";
import { getDonationCandidates } from "../../../../models/closetItems";

// GET /api/closet-items/donation-candidates — never-worn items older than the
// stale cutoff, surfaced as donate/share nudges (sustainability goal).
export async function GET() {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = await getUserByAuth0Id(session.user.sub);
  if (!user) return NextResponse.json({ error: "User not synced" }, { status: 404 });

  const items = await getDonationCandidates(user._id);
  return NextResponse.json({ items });
}
