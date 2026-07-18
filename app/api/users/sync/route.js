import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { upsertUserByAuth0Id } from "../../../../models/users";

// Call this once after login (e.g. from the client right after auth
// succeeds) to make sure a Mongo user doc exists for this Auth0 identity.
export async function POST() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await upsertUserByAuth0Id(session.user.sub, { email: session.user.email });
  return NextResponse.json({ user });
}
