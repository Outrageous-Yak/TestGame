"""Headless composition + weather session (no desktop audio)."""

from __future__ import annotations

import logging
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from audio.orchestration import Orchestrator
from audio.preset_manager import PresetManager
from chord_engine import ChordEngine, ChordState
from composition_engine import CompositionContext, CompositionEngine
from config import InputSource, MODE_PROFILES, Mode, ScaleName, AppSettings
from scale_engine import ScaleEngine
from weather.favourite_manager import FavouriteManager
from weather.location_manager import LocationManager
from weather.models import GeoLocation, MusicDriveParams, WeatherSnapshot
from weather.open_meteo import OpenMeteoProvider
from weather.station_manager import StationManager
from weather.weather_cache import WeatherCache
from weather.weather_fetcher import WeatherFetcher
from weather.weather_mapper import WeatherMapper

from api.services.serialize import (
    geo_to_dict,
    plan_to_dict,
    station_to_dict,
    targets_to_dict,
    weather_to_dict,
)

logger = logging.getLogger(__name__)


@dataclass
class SessionState:
    mode: Mode = Mode.AMBIENT
    scale: ScaleName = ScaleName.MINOR
    key: str = "C"
    master_volume: float = 0.75
    sensitivity: float = 0.6
    input_source: InputSource = InputSource.MICROPHONE
    refresh_interval_sec: float = 30.0
    audio_quality: str = "Standard"
    soundscape_preset: str = "Natural Ambient"
    reverb_amount: float = 0.45
    width_amount: float = 0.35
    brightness_amount: float = 0.5
    warmth_amount: float = 0.5


class HeadlessSession:
    """Per-client session mirroring MusicController without sounddevice."""

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.lock = threading.Lock()
        self.state = SessionState()
        self._sample_position = 0

        self._scale_engine = ScaleEngine()
        self.chord_engine = ChordEngine(self._scale_engine)
        self.composition_engine = CompositionEngine(self._scale_engine)
        self.presets = PresetManager()
        self.orchestrator = Orchestrator(self.presets)

        self.providers = [OpenMeteoProvider()]
        self.location_manager = LocationManager(self.providers)
        self.station_manager = StationManager()
        self.cache = WeatherCache(default_ttl_sec=25.0)
        self.mapper = WeatherMapper()
        self.favourites = FavouriteManager()
        self.fetcher = WeatherFetcher(
            self.providers,
            self.station_manager,
            self.cache,
            self._on_weather_updated,
        )
        self._last_drive: Optional[MusicDriveParams] = None
        self._weather_snapshot: Optional[WeatherSnapshot] = None
        self._location_label = ""
        self._last_plan_dict: Optional[dict] = None
        self._last_targets_dict: Optional[dict] = None
        self._fetch_error: Optional[str] = None

        self.station_manager.set_on_change(lambda: self.fetcher.fetch_now())

    def _on_weather_updated(self) -> None:
        for s in self.station_manager.list_active():
            if s.enabled and s.weather:
                self._weather_snapshot = s.weather
                self._location_label = s.station.display_name
                break

    def apply_settings(self, settings: AppSettings) -> None:
        with self.lock:
            self.state.mode = settings.mode
            self.state.scale = settings.scale
            self.state.key = settings.key
            self.state.master_volume = settings.master_volume
            self.state.sensitivity = settings.sensitivity
            self.state.input_source = settings.input_source
            self.state.refresh_interval_sec = settings.refresh_interval_sec
            self.state.audio_quality = settings.audio_quality
            self.state.soundscape_preset = settings.soundscape_preset
            self.state.reverb_amount = settings.reverb_amount
            self.state.width_amount = settings.width_amount
            self.state.brightness_amount = settings.brightness_amount
            self.state.warmth_amount = settings.warmth_amount
            self._scale_engine.set_scale(settings.scale)
            self._scale_engine.set_key(settings.key)
            self.orchestrator.soundscape = settings.soundscape_preset
            self.fetcher.set_interval(settings.refresh_interval_sec)

    def to_settings(self) -> AppSettings:
        s = self.state
        return AppSettings(
            mode=s.mode,
            scale=s.scale,
            key=s.key,
            master_volume=s.master_volume,
            sensitivity=s.sensitivity,
            input_source=s.input_source,
            refresh_interval_sec=s.refresh_interval_sec,
            audio_quality=s.audio_quality,
            soundscape_preset=s.soundscape_preset,
            reverb_amount=s.reverb_amount,
            width_amount=s.width_amount,
            brightness_amount=s.brightness_amount,
            warmth_amount=s.warmth_amount,
        )

    def search_locations(self, query: str) -> List[dict]:
        return [geo_to_dict(loc) for loc in self.location_manager.search(query)]

    def add_station(self, location_data: dict, mix: float = 1.0) -> dict:
        loc = GeoLocation(
            id=location_data.get("id", ""),
            name=location_data.get("name", ""),
            country=location_data.get("country", ""),
            latitude=float(location_data["latitude"]),
            longitude=float(location_data["longitude"]),
            elevation_m=location_data.get("elevation_m"),
            timezone=location_data.get("timezone"),
            feature_code=location_data.get("feature_code"),
        )
        self.station_manager.add_location(loc, mix=mix)
        self.fetcher.fetch_now()
        stations = self.list_stations()
        return stations[-1] if stations else {}

    def add_station_from_coords(self, lat: float, lon: float) -> dict:
        loc = self.location_manager.from_coordinates(lat, lon)
        return self.add_station(geo_to_dict(loc))

    def list_stations(self) -> List[dict]:
        return [station_to_dict(s) for s in self.station_manager.list_active()]

    def update_station_mix(self, station_id: str, mix: float) -> None:
        for i, s in enumerate(self.station_manager.list_active()):
            if s.station.location.id == station_id:
                self.station_manager.set_mix(i, mix)
                break
        self.fetcher.fetch_now()

    def remove_station(self, station_id: str) -> None:
        for i, s in enumerate(self.station_manager.list_active()):
            if s.station.location.id == station_id:
                self.station_manager.remove_at(i)
                break
        self.fetcher.fetch_now()

    def fetch_weather_now(self) -> None:
        self.fetcher.fetch_now()
        self._fetch_error = self.fetcher.last_error

    def start_weather_polling(self) -> None:
        self.fetcher.start()

    def stop_weather_polling(self) -> None:
        self.fetcher.stop()

    def _compute_energy(
        self,
        mic_energy: float,
        gust: bool,
    ) -> tuple[float, bool, Optional[float]]:
        """Blend mic and weather per input source."""
        src = self.state.input_source
        use_mic = src in (InputSource.MICROPHONE, InputSource.BOTH)
        use_weather = src in (InputSource.LIVE_WEATHER, InputSource.BOTH)

        profile = MODE_PROFILES[self.state.mode]
        drive = self.mapper.blend_stations(
            self.station_manager.list_active(),
            profile.tempo_min,
            profile.tempo_max,
        )

        energy = mic_energy
        g = gust
        tempo_override: Optional[float] = None

        if use_weather and drive:
            self._last_drive = drive
            if use_mic and src == InputSource.BOTH:
                energy = drive.energy * 0.55 + mic_energy * 0.45
                g = drive.gust or gust
            else:
                energy = drive.energy
                g = drive.gust
            tempo_override = drive.tempo_bpm

        return energy, g, tempo_override

    def tick(
        self,
        mic_energy: float = 0.0,
        gust: bool = False,
        sample_delta: int = 0,
        fft: Optional[List[float]] = None,
    ) -> dict:
        with self.lock:
            self._sample_position += sample_delta
            profile = MODE_PROFILES[self.state.mode]
            energy, gust_flag, tempo_override = self._compute_energy(mic_energy, gust)

            drive = self._last_drive
            ctx = CompositionContext(
                raw_energy=energy,
                gust=gust_flag,
                tempo_min=profile.tempo_min,
                tempo_max=profile.tempo_max,
                sample_position=self._sample_position,
                weather=self._weather_snapshot,
                drive=drive,
                stereo_pan=drive.stereo_pan if drive else 0.0,
                percussion=drive.percussion if drive else 0.0,
            )
            plan = self.composition_engine.tick(ctx)
            if tempo_override is not None:
                plan.tempo_bpm = tempo_override

            chord = plan.chord
            if chord is None:
                chord = self.chord_engine.update(plan.energy_curve)
                plan.chord = chord

            self.orchestrator.soundscape = self.state.soundscape_preset
            targets = self.orchestrator.map_plan(plan)

            plan_dict = plan_to_dict(plan)
            targets_dict = targets_to_dict(targets)
            self._last_plan_dict = plan_dict
            self._last_targets_dict = targets_dict

            return {
                "plan": plan_dict,
                "orchestration": targets_dict,
                "live_info": self._live_info_dict(plan),
                "settings": {
                    "mode": self.state.mode.value,
                    "scale": self.state.scale.value,
                    "key": self.state.key,
                    "master_volume": self.state.master_volume,
                    "sensitivity": self.state.sensitivity,
                    "input_source": self.state.input_source.value,
                    "audio_quality": self.state.audio_quality,
                    "soundscape_preset": self.state.soundscape_preset,
                    "reverb_amount": self.state.reverb_amount,
                    "width_amount": self.state.width_amount,
                    "brightness_amount": self.state.brightness_amount,
                    "warmth_amount": self.state.warmth_amount,
                },
                "sound_tweaks": {
                    "reverb": self.state.reverb_amount * (0.6 + plan.reverb_amount * 0.5),
                    "width": self.state.width_amount,
                    "brightness": self.state.brightness_amount * plan.brightness,
                    "warmth": self.state.warmth_amount,
                    "master": self.state.master_volume,
                    "quality": self.state.audio_quality,
                },
                "fft": fft or [],
            }

    def _live_info_dict(self, plan) -> dict:
        primary = None
        for s in self.station_manager.list_active():
            if s.enabled and s.weather:
                primary = s
                break
        w = primary.weather if primary else None
        return {
            "location_label": self._location_label or "—",
            "condition": w.condition if w else "—",
            "wind_speed_kmh": w.wind_speed_kmh if w else 0.0,
            "wind_direction_deg": w.wind_direction_deg if w else 0.0,
            "temperature_c": w.temperature_c if w else 0.0,
            "station_update": w.timestamp.isoformat() if w and w.timestamp else "—",
            "mode": self.state.mode.value,
            "key": self.state.key,
            "chord": plan.chord.name if plan.chord else "—",
            "tempo_bpm": plan.tempo_bpm,
            "input_source": self.state.input_source.value,
            "station_count": self.station_manager.count(),
            "composition_state": plan.musical_state.value,
            "mood": plan.mood,
            "phrase_number": plan.phrase_number,
            "fetch_error": self.fetcher.last_error,
        }

    def list_favourites(self) -> List[dict]:
        return [
            {
                "id": f.id,
                "label": f.label,
                "location": geo_to_dict(f.location),
            }
            for f in self.favourites.list()
        ]

    def add_favourite(self, label: str, location_data: dict) -> dict:
        loc = GeoLocation(
            id=location_data.get("id", ""),
            name=location_data.get("name", ""),
            country=location_data.get("country", ""),
            latitude=float(location_data["latitude"]),
            longitude=float(location_data["longitude"]),
            elevation_m=location_data.get("elevation_m"),
            timezone=location_data.get("timezone"),
            feature_code=location_data.get("feature_code"),
        )
        fav = self.favourites.add(label, loc)
        return {"id": fav.id, "label": fav.label, "location": geo_to_dict(fav.location)}

    def remove_favourite(self, fav_id: str) -> None:
        self.favourites.remove(fav_id)


class SessionManager:
    def __init__(self) -> None:
        self._sessions: Dict[str, HeadlessSession] = {}
        self._lock = threading.Lock()

    def create(self) -> HeadlessSession:
        sid = str(uuid.uuid4())
        session = HeadlessSession(sid)
        settings = AppSettings.load()
        session.apply_settings(settings)
        with self._lock:
            self._sessions[sid] = session
        return session

    def get(self, sid: str) -> Optional[HeadlessSession]:
        return self._sessions.get(sid)

    def destroy(self, sid: str) -> None:
        with self._lock:
            session = self._sessions.pop(sid, None)
        if session:
            session.stop_weather_polling()
