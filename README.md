# hack-the-6ix

Next.js API routes + MongoDB Atlas + Auth0. This is the foundation — closet
item CRUD, wear tracking, auth, and a cache layer for try-on results are
wired up so Leanne and Claire can build against real endpoints from hour 1
instead of waiting on the backend.

## Setup (do this first)

1. **Install deps**

   ```
   npm install
   ```

2. **Create an Auth0 app**
   — In the [Auth0 Dashboard](https://manage.auth0.com), create an application of type **Regular Web Application**.
   — Add `http://localhost:3000/auth/callback` to **Allowed Callback URLs**.
   — Add `http://localhost:3000` to **Allowed Logout URLs**.
   — Grab the Domain, Client ID, and Client Secret.

3. **Create a MongoDB Atlas cluster**
   — Free tier (M0) is fine for this.
   — Create a database user + get your connection string.
   — Whitelist your IP (or `0.0.0.0/0` for hackathon speed — tighten later if you care).

4. **Set up env vars**

   ```
   cp .env.example .env.local
   ```

   Fill in `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `MONGODB_URI`.
   Generate `AUTH0_SECRET` with:

   ```
   openssl rand -hex 32
   ```

5. **Run migrations** (creates collections + indexes in Atlas)

   ```
   npm run migrate
   ```

6. **Seed demo data** (one demo user + 4 sample closet items — lets Claire/Leanne
   build UI and prompts against real documents without needing real photo uploads yet)

   ```
   npm run seed
   ```

7. **Run the dev server**
   ```
   npm run dev
   ```
   Visit `http://localhost:3000`, click "Log in" to confirm the Auth0 flow works end to end.

## How the pieces fit together

- **Auth0** handles identity (login/logout/session). `lib/auth0.js` exports
  the client; `middleware.js` wires it into every request.
- **MongoDB Atlas** holds all app data. `lib/mongodb.js` is a cached
  connection (important on serverless — don't create a new `MongoClient`
  per request, see the comment in that file).
- **The bridge**: every Mongo `users` doc is keyed by `auth0_id` (the Auth0
  `sub` claim). Call `POST /api/users/sync` once after login to make sure a
  user doc exists. Every other route looks up the current user via
  `getUserByAuth0Id(session.user.sub)`.
- **models/** are plain functions, not an ORM — one file per collection,
  each exporting the operations that collection needs. No Mongoose, kept
  intentionally thin.
- **migrations/** are idempotent — safe to re-run. Each one creates its
  collection (with a `$jsonSchema` validator set to `warn` not `error`, so
  a slightly-off document during a live demo doesn't hard-fail) and its
  indexes if they don't already exist.

## What's NOT here yet (by design — these are Leanne's and Claire's lanes)

- **No Gemini calls.** `GEMINI_API_KEY` is in `.env.example` so it's centralized,
  but no route calls the Gemini API. `POST /api/closet-items` just persists
  whatever `category`/`colorTags` it's given — Leanne's auto-tagging call
  happens before that, client-side or in a route she adds.
- **No Nano Banana calls.** `models/tryonCache.js` + `/api/tryon-cache` give
  you a check-cache-first / save-after-generating pattern to call around
  your Nano Banana request — the generation call itself isn't here.
- **No photo upload.** Atlas doesn't do file storage. Pick one:
  [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (zero-config if
  deploying to Vercel) or Cloudinary (free tier + built-in transforms). Env
  var slots for both are in `.env.example` — uncomment whichever you use.
- **No frontend.** `app/page.js` is a bare placeholder proving auth works —
  Claire owns the real UI.

## API routes

All routes except `/api/users/sync` expect the caller to already have a
synced user doc (401 if not logged in, 404 if not synced yet).

| Route                        | Methods            | Notes                                                             |
| ---------------------------- | ------------------ | ----------------------------------------------------------------- |
| `/api/users/sync`            | POST               | Call once after login                                             |
| `/api/closet-items`          | GET, POST          | `GET ?sortByWear=true` → least-worn first (front-of-closet order) |
| `/api/closet-items/:id`      | GET, PATCH, DELETE | PATCH body: `{ category?, colorTags? }`                           |
| `/api/closet-items/:id/wear` | POST               | The "wore this today" button. Body: `{ itemIds?, occasion? }`     |
| `/api/outfit-log`            | GET                | Wear history, most recent first                                   |
| `/api/tryon-cache`           | GET, POST          | `GET ?itemIds=id1,id2` checks cache; `POST` saves a new result    |
| `/api/shopping-suggestions`  | GET, POST          | Persists Gemini shopping suggestions — doesn't call Gemini        |

## Data model

See `migrations/00*.js` for the authoritative schema (each has a `$jsonSchema`
validator). Summary:

- **users** — `auth0_id` (unique), `email`, `full_body_photo_url`, `style_prefs`
- **closet_items** — `user_id`, `image_url`, `category`, `color_tags[]`, `wear_count`, `last_worn_at`
- **outfit_log** — `user_id`, `item_ids[]`, `worn_on`, `occasion`
- **tryon_cache** — `item_ids_hash` (unique), `item_ids[]`, `generated_image_url`
- **shopping_suggestions** — `user_id`, `outfit_context`, `suggested_items[]`

## Troubleshooting

- **`npm run build` prints "Critical dependency" / "Edge Runtime" warnings
  from `@auth0/nextjs-auth0` internals (jose, dpopUtils).** These are benign
  — known SDK warnings, not errors. The build still succeeds; ignore them.
- **Build logs a Mongo `querySrv ENOTFOUND` error.** This fires because
  `lib/mongodb.js` opens a connection at module-load time (the recommended
  caching pattern), and Next's build process loads the route modules to
  collect metadata. With a real `MONGODB_URI` in `.env.local` this resolves
  fine and the error disappears — it's only visible with a placeholder URI.

## Next.js 16 note

This scaffold uses `middleware.js` (Next.js 15 convention). If the project
gets upgraded to Next.js 16, rename it to `proxy.js` and rename the exported
`middleware` function to `proxy` — see the comment at the bottom of that file.
