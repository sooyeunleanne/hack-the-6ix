export function hasElevenLabsKey() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
}

// Speech-to-text only needs the API key, not a configured voice (that's TTS-only).
export function hasElevenLabsSttKey() {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

// audioBlob: a Blob/File (e.g. from MediaRecorder). Returns the transcribed text.
export async function speechToText(audioBlob) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const model = process.env.ELEVENLABS_STT_MODEL || "scribe_v1";

  const form = new FormData();
  form.append("model_id", model);
  form.append("file", audioBlob, "recording.webm");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs transcription error (${res.status})`);
  }

  const data = await res.json();
  return data.text || "";
}

// Returns audio/mpeg as an ArrayBuffer, or throws on failure.
export async function textToSpeech({ text, voiceId = process.env.ELEVENLABS_VOICE_ID }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

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
    throw new Error(`ElevenLabs error (${res.status})`);
  }

  return res.arrayBuffer();
}
