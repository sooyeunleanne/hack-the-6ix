// Open-Meteo is free and keyless — no env var to configure, works straight
// from the browser (CORS-friendly), good fit for a hackathon demo.
const WEATHER_CODES = {
  0: "clear sky",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "foggy",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  56: "freezing drizzle",
  57: "freezing drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "rain showers",
  81: "rain showers",
  82: "violent rain showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm with hail",
  99: "thunderstorm with hail"
};

const WEATHER_ICONS = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  56: "🌨️",
  57: "🌨️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  66: "🌨️",
  67: "🌨️",
  71: "🌨️",
  73: "❄️",
  75: "❄️",
  77: "🌨️",
  80: "🌦️",
  81: "🌧️",
  82: "⛈️",
  85: "🌨️",
  86: "❄️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️"
};

export function describeWeatherCode(code) {
  return WEATHER_CODES[code] || "unpredictable weather";
}

export function getWeatherIcon(code) {
  return WEATHER_ICONS[code] || "🌡️";
}

// Everyday temperature is reported in Fahrenheit in only a handful of
// countries — everywhere else uses Celsius.
const FAHRENHEIT_COUNTRY_CODES = new Set(["US", "BS", "KY", "LR", "PW", "FM", "MH", "BZ"]);

function unitForCountryCode(countryCode) {
  return FAHRENHEIT_COUNTRY_CODES.has((countryCode || "").toUpperCase()) ? "fahrenheit" : "celsius";
}

// Free, keyless, client-side reverse geocoding — resolves GPS coords to a
// country code (for temperature unit) and a human-readable location label
// (for trend-aware suggestions), in one call.
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const locationLabel = [data.city || data.locality, data.principalSubdivision].filter(Boolean).join(", ") || data.countryName || null;
    return { countryCode: data.countryCode || null, locationLabel };
  } catch {
    return null;
  }
}

async function fetchCurrentConditions(lat, lon, unit) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${unit}`
  );
  if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
  const data = await res.json();
  return {
    temp: Math.round(data.current.temperature_2m),
    unit: unit === "fahrenheit" ? "F" : "C",
    condition: describeWeatherCode(data.current.weather_code),
    icon: getWeatherIcon(data.current.weather_code)
  };
}

export async function getWeatherByCoords(lat, lon) {
  // Reverse-geocode lookup failing (offline, rate-limited) just falls back
  // to Celsius — the world default — rather than blocking the weather call.
  const geo = await reverseGeocode(lat, lon);
  const unit = unitForCountryCode(geo?.countryCode);
  const weather = await fetchCurrentConditions(lat, lon, unit);
  return geo?.locationLabel ? { ...weather, locationLabel: geo.locationLabel } : weather;
}

export async function getWeatherByCity(city) {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  if (!geoRes.ok) throw new Error(`Location lookup failed (${geoRes.status})`);
  const geoData = await geoRes.json();
  const place = geoData.results?.[0];
  if (!place) throw new Error(`Couldn't find "${city}"`);
  const unit = unitForCountryCode(place.country_code);
  const weather = await fetchCurrentConditions(place.latitude, place.longitude, unit);
  return { ...weather, locationLabel: `${place.name}${place.admin1 ? ", " + place.admin1 : ""}` };
}
