const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const WMO: Record<number, string> = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Rain showers", 95: "Thunderstorm", 96: "Thunderstorm with hail",
};

import type { GeoLocation, WeatherSnapshot } from "../types";

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  const q = query.trim();
  if (!q) return [];
  const parts = q.replace(",", " ").split(/\s+/);
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return [{
        id: `coord-${lat.toFixed(2)}-${lon.toFixed(2)}`,
        name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
        country: "",
        latitude: lat,
        longitude: lon,
      }];
    }
  }
  const url = `${GEO_URL}?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const results = data.results ?? [];
  return results.map((r: Record<string, unknown>) => ({
    id: String(r.id ?? `${r.name}-${r.latitude}`),
    name: String(r.name ?? ""),
    country: String(r.country ?? ""),
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    elevation_m: r.elevation != null ? Number(r.elevation) : undefined,
  }));
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      "temperature_2m", "relative_humidity_2m", "precipitation", "snowfall",
      "weather_code", "cloud_cover", "surface_pressure",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
    ].join(","),
    wind_speed_unit: "kmh",
    timezone: "auto",
  });
  const url = `${FORECAST_URL}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Forecast failed");
  const data = await res.json();
  const c = data.current ?? {};
  const code = Number(c.weather_code ?? 0);
  return {
    wind_speed_kmh: Number(c.wind_speed_10m ?? 0),
    wind_gust_kmh: Number(c.wind_gusts_10m ?? 0),
    wind_direction_deg: Number(c.wind_direction_10m ?? 0),
    temperature_c: Number(c.temperature_2m ?? 0),
    humidity_pct: Number(c.relative_humidity_2m ?? 0),
    pressure_hpa: Number(c.surface_pressure ?? 1013),
    precipitation_mm: Number(c.precipitation ?? 0),
    snowfall_mm: Number(c.snowfall ?? 0),
    cloud_cover_pct: Number(c.cloud_cover ?? 0),
    weather_code: code,
    condition: WMO[code] ?? "Unknown",
    timestamp: c.time ?? new Date().toISOString(),
  };
}

export function isStorm(w: WeatherSnapshot): boolean {
  return w.wind_speed_kmh > 60 || [95, 96, 99].includes(w.weather_code);
}
