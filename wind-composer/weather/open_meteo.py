"""Open-Meteo free weather API provider (no API key required)."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, List

from weather.models import GeoLocation, WeatherSnapshot
from weather.provider_base import WeatherProvider

logger = logging.getLogger(__name__)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather code descriptions (subset)
WMO_CONDITIONS = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
}

REQUEST_TIMEOUT = 12


def _http_get_json(url: str) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "WindComposer/1.0"})
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


class OpenMeteoProvider(WeatherProvider):
    """Live forecast/current conditions via Open-Meteo."""

    @property
    def name(self) -> str:
        return "Open-Meteo"

    def search_locations(self, query: str, count: int = 10) -> List[GeoLocation]:
        q = query.strip()
        if not q:
            return []

        # GPS coordinates: "lat, lon" or "lat lon"
        parts = q.replace(",", " ").split()
        if len(parts) == 2:
            try:
                lat, lon = float(parts[0]), float(parts[1])
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    return [self.nearest_station(lat, lon)]
            except ValueError:
                pass

        params = urllib.parse.urlencode({"name": q, "count": count, "language": "en", "format": "json"})
        url = f"{GEOCODING_URL}?{params}"
        try:
            data = _http_get_json(url)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            logger.warning("Geocoding failed: %s", exc)
            return []

        results: List[GeoLocation] = []
        for item in data.get("results", []):
            loc = GeoLocation(
                id=str(item.get("id", f"{item.get('latitude')}_{item.get('longitude')}")),
                name=item.get("name", "Unknown"),
                country=item.get("country", item.get("country_code", "")),
                latitude=float(item["latitude"]),
                longitude=float(item["longitude"]),
                elevation_m=item.get("elevation"),
                timezone=item.get("timezone"),
                feature_code=item.get("feature_code"),
            )
            results.append(loc)
        return results

    def get_current_weather(self, location: GeoLocation) -> WeatherSnapshot:
        current_vars = ",".join([
            "wind_speed_10m",
            "wind_gusts_10m",
            "wind_direction_10m",
            "temperature_2m",
            "relative_humidity_2m",
            "surface_pressure",
            "cloud_cover",
            "precipitation",
            "snowfall",
            "weather_code",
        ])
        params = urllib.parse.urlencode({
            "latitude": location.latitude,
            "longitude": location.longitude,
            "current": current_vars,
            "timezone": "auto",
            "wind_speed_unit": "kmh",
        })
        url = f"{FORECAST_URL}?{params}"
        try:
            data = _http_get_json(url)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            logger.error("Forecast failed for %s: %s", location.label(), exc)
            raise

        cur = data.get("current", {})
        code = int(cur.get("weather_code", 0))
        ts_str = cur.get("time")
        timestamp = None
        if ts_str:
            try:
                timestamp = datetime.fromisoformat(ts_str).replace(tzinfo=timezone.utc)
            except ValueError:
                timestamp = datetime.now(timezone.utc)

        return WeatherSnapshot(
            wind_speed_kmh=float(cur.get("wind_speed_10m", 0) or 0),
            wind_gust_kmh=float(cur.get("wind_gusts_10m", 0) or 0),
            wind_direction_deg=float(cur.get("wind_direction_10m", 0) or 0),
            temperature_c=float(cur.get("temperature_2m", 0) or 0),
            humidity_pct=float(cur.get("relative_humidity_2m", 0) or 0),
            pressure_hpa=float(cur.get("surface_pressure", 1013) or 1013),
            cloud_cover_pct=float(cur.get("cloud_cover", 0) or 0),
            precipitation_mm=float(cur.get("precipitation", 0) or 0),
            snowfall_mm=float(cur.get("snowfall", 0) or 0),
            weather_code=code,
            condition=WMO_CONDITIONS.get(code, f"Code {code}"),
            timestamp=timestamp,
            source=self.name,
            is_live=True,
        )
