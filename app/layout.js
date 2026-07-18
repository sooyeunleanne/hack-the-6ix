import { auth0 } from "../lib/auth0";
import { upsertUserByAuth0Id } from "../models/users";

export const metadata = {
  title: "Closet App",
  description: "AI-powered closet styling app"
};

// Runs in the Node.js runtime on every request (unlike middleware.js, which
// runs on the Edge and can't use the mongodb driver). Keeping this here
// guarantees every Auth0-authenticated request has a synced Mongo user doc
// without relying on the frontend to call POST /api/users/sync.
export default async function RootLayout({ children }) {
  const session = await auth0.getSession();
  if (session) {
    await upsertUserByAuth0Id(session.user.sub, { email: session.user.email });
  }

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
