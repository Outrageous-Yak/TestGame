"""Map live weather fields to music drive parameters."""

from __future__ import annotations

import time
from typing import List, Optional

from utils import clamp
from weather.models import ActiveStation, MusicDriveParams, WeatherSnapshot


class WeatherMapper:
    """
    Map weather to music parameters.

    Wind speed → tempo & energy
    Gusts → accent notes
    Wind direction → stereo pan
    Temperature → instrument warmth
    Humidity → reverb
    Pressure → bass
    Rain → percussion
    Storms → atmosphere layers
    """

    def __init__(self) -> None:
        self._last_gust_time = 0.0
        self._prev_gust_kmh = 0.0
        self.gust_cooldown_sec = 1.0

    def map_snapshot(self, weather: WeatherSnapshot, tempo_min: float, tempo_max: float) -> MusicDriveParams:
        speed = weather.wind_speed_kmh
        gust = weather.wind_gust_kmh

        # Energy from wind speed (0–100+ km/h)
        energy = clamp(speed / 55.0)

        # Gust detection from gust delta vs sustained speed
        now = time.monotonic()
        gust_delta = gust - speed
        is_gust = False
        if gust_delta > 12.0 and (now - self._last_gust_time) >= self.gust_cooldown_sec:
            is_gust = True
            self._last_gust_time = now

        tempo = tempo_min + energy * (tempo_max - tempo_min)

        # Wind direction → stereo (-1 left, +1 right)
        pan = clamp((weather.wind_direction_deg / 180.0) - 1.0)

        # Humidity → reverb (40–100% maps to 0.25–0.85)
        reverb = clamp(0.25 + (weather.humidity_pct - 40.0) / 80.0)

        # Pressure → bass (980–1040 hPa)
        bass = clamp((weather.pressure_hpa - 980.0) / 60.0)

        # Rain/snow → percussion
        perc = clamp(weather.precipitation_mm / 8.0 + weather.snowfall_mm / 5.0)

        # Storm / high wind → extra atmosphere
        atmosphere = 0.15 + energy * 0.35
        if weather.is_storm():
            atmosphere = clamp(atmosphere + 0.35)
            perc = clamp(perc + 0.4)
            energy = clamp(energy + 0.2)

        # Temperature → warmth (cold bright, hot warm)
        warmth = clamp((weather.temperature_c + 10.0) / 50.0)

        # Calm weather → minimal pads
        if speed < 5.0 and weather.precipitation_mm < 0.1:
            energy = clamp(energy * 0.35)
            perc *= 0.2

        brightness = clamp(0.3 + (1.0 - warmth) * 0.5 + energy * 0.2)

        return MusicDriveParams(
            energy=energy,
            gust=is_gust,
            tempo_bpm=tempo,
            stereo_pan=pan,
            reverb_amount=reverb,
            bass_intensity=bass,
            percussion=perc,
            atmosphere_layers=atmosphere,
            brightness=brightness,
            instrument_warmth=warmth,
        )

    def blend_stations(
        self,
        stations: List[ActiveStation],
        tempo_min: float,
        tempo_max: float,
    ) -> Optional[MusicDriveParams]:
        enabled = [s for s in stations if s.enabled and s.weather is not None]
        if not enabled:
            return None

        total_mix = sum(s.mix for s in enabled)
        if total_mix <= 0:
            return None

        blended = MusicDriveParams()
        gust = False

        for s in enabled:
            w = s.mix / total_mix
            params = self.map_snapshot(s.weather, tempo_min, tempo_max)
            blended.energy += params.energy * w
            blended.tempo_bpm += params.tempo_bpm * w
            blended.stereo_pan += params.stereo_pan * w
            blended.reverb_amount += params.reverb_amount * w
            blended.bass_intensity += params.bass_intensity * w
            blended.percussion += params.percussion * w
            blended.atmosphere_layers += params.atmosphere_layers * w
            blended.brightness += params.brightness * w
            blended.instrument_warmth += params.instrument_warmth * w
            gust = gust or params.gust

        blended.gust = gust
        blended.energy = clamp(blended.energy)
        blended.stereo_pan = clamp(blended.stereo_pan)
        blended.reverb_amount = clamp(blended.reverb_amount)
        blended.bass_intensity = clamp(blended.bass_intensity)
        blended.percussion = clamp(blended.percussion)
        blended.atmosphere_layers = clamp(blended.atmosphere_layers)
        blended.brightness = clamp(blended.brightness)
        blended.instrument_warmth = clamp(blended.instrument_warmth)

        return blended
