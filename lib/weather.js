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

export function describeWeatherCode(code) {
  return WEATHER_CODES[code] || "unpredictable weather";
}

export async function getWeatherByCoords(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
  );
  if (!res.ok) throw new Error(`Weather lookup failed (${res.status})`);
  const data = await res.json();
  return {
    tempF: Math.round(data.current.temperature_2m),
    condition: describeWeatherCode(data.current.weather_code)
  };
}

export async function getWeatherByCity(city) {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  if (!geoRes.ok) throw new Error(`Location lookup failed (${geoRes.status})`);
  const geoData = await geoRes.json();
  const place = geoData.results?.[0];
  if (!place) throw new Error(`Couldn't find "${city}"`);
  const weather = await getWeatherByCoords(place.latitude, place.longitude);
  return { ...weather, locationLabel: `${place.name}${place.admin1 ? ", " + place.admin1 : ""}` };
}
