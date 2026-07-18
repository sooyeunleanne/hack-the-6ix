import { MOCK_ITEMS, placeholderImage } from "./mockData";

const delay = (ms = 500 + Math.random() * 400) => new Promise((r) => setTimeout(r, ms));

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const MOCK_NOTES = [
  "This look is giving effortless main-character energy.",
  "A little sparkle for wherever the night takes you.",
  "Comfortable enough for a carriage ride, sharp enough for the ball."
];

const MOCK_SHOPPING_SUGGESTIONS = [
  { name: "White sneakers", category: "Shoes", colorTags: ["white"], reason: "A neutral shoe that pairs with almost everything already in the closet." },
  { name: "Beige trench coat", category: "Outerwear", colorTags: ["beige"], reason: "Closet is light on outerwear for in-between weather." },
  { name: "Dark wash denim", category: "Bottom", colorTags: ["blue", "denim"], reason: "A versatile bottom to balance out brighter tops." }
];

// Patches window.fetch so every panel's real API calls (closet-items,
// wear, outfit-suggestions, tryon, shopping-suggestions, voice) resolve
// with canned data instead of hitting Auth0/Mongo/Gemini/ElevenLabs.
// Returns a cleanup function that restores the original fetch.
export function installMockApi() {
  if (typeof window === "undefined") return () => {};
  if (window.__mockApiInstalled) return () => {};
  window.__mockApiInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const method = (init.method || "GET").toUpperCase();

    if (/^\/api\/closet-items\/[^/]+\/wear$/.test(url) && method === "POST") {
      await delay();
      return jsonResponse({ ok: true, outfitLogEntry: {} });
    }

    if (url === "/api/closet-items" && method === "POST") {
      await delay();
      const body = JSON.parse(init.body || "{}");
      return jsonResponse(
        {
          item: {
            _id: `mock-new-${Math.random().toString(36).slice(2, 8)}`,
            image_url: body.imageUrl,
            category: body.category,
            color_tags: body.colorTags || [],
            wear_count: 0,
            last_worn_at: null,
            created_at: new Date().toISOString()
          }
        },
        201
      );
    }

    if (url === "/api/outfit-suggestions" && method === "POST") {
      await delay();
      const body = JSON.parse(init.body || "{}");
      const shuffled = [...MOCK_ITEMS].sort(() => Math.random() - 0.5);
      const picks = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
      const weatherBit = body.weather ? ` It's ${body.weather.tempF}°F and ${body.weather.condition} out there —` : "";
      const line = MOCK_NOTES[Math.floor(Math.random() * MOCK_NOTES.length)];
      return jsonResponse({
        itemIds: picks.map((i) => i.id),
        reply: `${weatherBit} ${line}`.trim(),
        mock: true
      });
    }

    if (url === "/api/tryon" && method === "POST") {
      await delay(900);
      return jsonResponse({
        generatedImageUrl: placeholderImage("Try-on preview", "#2a3570"),
        cached: false,
        mock: true,
        note: "Preview mode — connect GEMINI_API_KEY and a full-body photo for a real try-on."
      });
    }

    if (url === "/api/shopping-suggestions/generate" && method === "POST") {
      await delay();
      return jsonResponse({
        suggestionId: "mock-suggestion",
        suggestedItems: MOCK_SHOPPING_SUGGESTIONS,
        mock: true
      });
    }

    if (url === "/api/voice" && method === "POST") {
      // Always fall through to the browser's speech synthesis in preview.
      return jsonResponse({ error: "Preview mode has no voice backend" }, 501);
    }

    if (url === "/api/users/photo" && method === "POST") {
      await delay();
      return jsonResponse({ ok: true });
    }

    return originalFetch(input, init);
  };

  return () => {
    window.fetch = originalFetch;
    window.__mockApiInstalled = false;
  };
}
