import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { updateFullBodyPhoto } from "../../../../models/users";
import { hasGeminiKey } from "../../../../lib/gemini";
import { removeBackground } from "../../../../lib/nanoBanana";
import { dataUrlToInlineImage } from "../../../../lib/imageUtils";

// POST /api/users/photo — body: { photoUrl } (data URL from the client)
// Saves the full-body reference photo used for Nano Banana try-on. When a
// Gemini key is configured, the background is stripped first so the saved
// reference shows just the person — a cleaner base for outfit compositing.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { photoUrl } = await request.json().catch(() => ({}));
  if (!photoUrl) return NextResponse.json({ error: "photoUrl required" }, { status: 400 });

  let finalPhotoUrl = photoUrl;
  if (hasGeminiKey()) {
    const inlineImage = dataUrlToInlineImage(photoUrl);
    if (inlineImage) {
      try {
        finalPhotoUrl = await removeBackground(inlineImage);
      } catch {
        // Background removal is best-effort — fall back to the original photo.
      }
    }
  }

  await updateFullBodyPhoto(session.user.sub, finalPhotoUrl);
  return NextResponse.json({ ok: true, photoUrl: finalPhotoUrl });
}
