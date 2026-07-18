import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { hasElevenLabsSttKey, speechToText } from "../../../../lib/elevenlabs";

// POST /api/voice/transcribe — multipart/form-data body: { audio: Blob }
// Proxies ElevenLabs speech-to-text so the API key never reaches the
// client. Returns { text }. If no key is configured, returns 501 so the
// client can fall back to the browser's built-in SpeechRecognition.
export async function POST(request) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!hasElevenLabsSttKey()) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 501 });
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!audio) return NextResponse.json({ error: "audio required" }, { status: 400 });

  try {
    const text = await speechToText(audio);
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
