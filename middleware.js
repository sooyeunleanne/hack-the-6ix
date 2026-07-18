import { auth0 } from "./lib/auth0";

// Auth0 v4 mounts /auth/login, /auth/logout, /auth/callback, /auth/profile, etc.
// automatically via this middleware — no manual route handlers needed.
export async function middleware(request) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
  ]
};

// Note: if your team upgrades to Next.js 16, rename this file to proxy.js
// and rename the exported function to `proxy` — see README for details.
