import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";
import { hasElevenLabsKey, textToSpeech } from "../../../lib/elevenlabs";

// POST /api/voice — body: { text }
// Proxies ElevenLabs text-to-speech so the API key never reaches the
// client. Returns audio/mpeg. If no key is configured, returns 501 so the
// client can fall back to the browser's built-in speech synthesis.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!hasElevenLabsKey()) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 501 });
  }

  const { text } = await request.json().catch(() => ({}));
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  try {
    const audio = await textToSpeech({ text });
    return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg" } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
