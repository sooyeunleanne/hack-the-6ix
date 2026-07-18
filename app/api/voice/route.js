import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";

// POST /api/voice — body: { text }
// Proxies ElevenLabs text-to-speech so the API key never reaches the
// client. Returns audio/mpeg. If no key is configured, returns 501 so the
// client can fall back to the browser's built-in speech synthesis.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 501 });
  }

  const { text } = await request.json().catch(() => ({}));
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      Accept: "audio/mpeg"
    },
    body: JSON.stringify({
      text: text.slice(0, 500),
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.8 }
    })
  });

  if (!res.ok) {
    return NextResponse.json({ error: `ElevenLabs error (${res.status})` }, { status: 502 });
  }

  const audio = await res.arrayBuffer();
  return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg" } });
}
