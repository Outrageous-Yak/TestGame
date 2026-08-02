"""Weather data models."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class GeoLocation:
    """A geographic point with metadata."""

    id: str
    name: str
    country: str
    latitude: float
    longitude: float
    elevation_m: Optional[float] = None
    timezone: Optional[str] = None
    feature_code: Optional[str] = None  # e.g. PPL, AIRP

    def label(self) -> str:
        parts = [self.name]
        if self.country:
            parts.append(self.country)
        return ", ".join(parts)


@dataclass
class WeatherStation:
    """Weather station or grid point used for live data."""

    location: GeoLocation
    provider_id: str = "open-meteo"
    station_name: str = ""
    last_update: Optional[datetime] = None

    @property
    def display_name(self) -> str:
        return self.station_name or self.location.label()


@dataclass
class WeatherSnapshot:
    """Normalized live weather reading."""

    wind_speed_kmh: float = 0.0
    wind_gust_kmh: float = 0.0
    wind_direction_deg: float = 0.0
    temperature_c: float = 0.0
    humidity_pct: float = 0.0
    pressure_hpa: float = 1013.0
    cloud_cover_pct: float = 0.0
    precipitation_mm: float = 0.0
    snowfall_mm: float = 0.0
    weather_code: int = 0
    condition: str = "Unknown"
    timestamp: Optional[datetime] = None
    source: str = "open-meteo"
    is_live: bool = True

    def is_storm(self) -> bool:
        return self.wind_speed_kmh > 60 or self.weather_code in (95, 96, 99)


@dataclass
class ActiveStation:
    """Station actively contributing to the musical blend."""

    station: WeatherStation
    mix: float = 1.0
    weather: Optional[WeatherSnapshot] = None
    enabled: bool = True


@dataclass
class MusicDriveParams:
    """Weather-mapped parameters driving the music engine."""

    energy: float = 0.0
    gust: bool = False
    tempo_bpm: float = 60.0
    stereo_pan: float = 0.0
    reverb_amount: float = 0.45
    bass_intensity: float = 0.0
    percussion: float = 0.0
    atmosphere_layers: float = 0.0
    brightness: float = 0.5
    instrument_warmth: float = 0.5  # cold=bright, hot=warm


@dataclass
class FavouriteLocation:
    """Saved favourite place."""

    id: str
    label: str
    location: GeoLocation
