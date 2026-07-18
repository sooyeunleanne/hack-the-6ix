import { auth0 } from "../lib/auth0";

// Placeholder page — proves the auth + DB scaffold works end to end.
// Claire: replace this with the real closet UI.
export default async function Home() {
  const session = await auth0.getSession();

  if (!session) {
    return (
      <main style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>Closet App</h1>
        <p>Backend scaffold is running. Log in to continue.</p>
        <a href="/auth/login">Log in</a>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Welcome, {session.user.name}</h1>
      <p>Backend scaffold is running — this page is a placeholder for Claire's UI.</p>
      <a href="/auth/logout">Log out</a>
    </main>
  );
}
