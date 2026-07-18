import { getDb } from "../lib/mongodb";

// Call this once per session (e.g. from /api/users/sync) to make sure every
// Auth0-authenticated person has a matching Mongo user doc.
export async function upsertUserByAuth0Id(auth0Id, { email } = {}) {
  const db = await getDb();
  const user = await db.collection("users").findOneAndUpdate(
    { auth0_id: auth0Id },
    {
      $setOnInsert: {
        auth0_id: auth0Id,
        email: email || null,
        full_body_photo_url: null,
        location: null,
        style_prefs: { vibes: [], favorite_colors: [] },
        created_at: new Date()
      }
    },
    { upsert: true, returnDocument: "after" }
  );
  // mongodb driver v6 returns the document directly (not wrapped in .value)
  return user;
}

export async function getUserByAuth0Id(auth0Id) {
  const db = await getDb();
  return db.collection("users").findOne({ auth0_id: auth0Id });
}

export async function updateFullBodyPhoto(auth0Id, photoUrl) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { auth0_id: auth0Id },
    { $set: { full_body_photo_url: photoUrl } }
  );
}

export async function updateStylePrefs(auth0Id, stylePrefs) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { auth0_id: auth0Id },
    { $set: { style_prefs: stylePrefs } }
  );
}

export async function updateLocation(auth0Id, location) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { auth0_id: auth0Id },
    { $set: { location } }
  );
}
