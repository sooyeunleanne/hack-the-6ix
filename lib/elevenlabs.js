export function hasElevenLabsKey() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
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
