"""Orchestrates weather data, music engine, and input sources."""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from config import InputSource, MODE_PROFILES, Mode
from music_engine import MusicEngine, VisualState
from weather.favourite_manager import FavouriteManager
from weather.location_manager import LocationManager
from weather.models import ActiveStation, GeoLocation, MusicDriveParams, WeatherSnapshot
from weather.open_meteo import OpenMeteoProvider
from weather.station_manager import StationManager
from weather.weather_cache import WeatherCache
from weather.weather_fetcher import WeatherFetcher
from weather.weather_mapper import WeatherMapper

logger = logging.getLogger(__name__)


@dataclass
class LiveInfoPanel:
    """Data for the live information panel."""

    location_label: str = "—"
    condition: str = "—"
    wind_speed_kmh: float = 0.0
    wind_direction_deg: float = 0.0
    temperature_c: float = 0.0
    station_update: str = "—"
    mode: str = "—"
    key: str = "—"
    chord: str = "—"
    tempo_bpm: float = 0.0
    input_source: str = "—"
    station_count: int = 0
    fetch_error: Optional[str] = None


class MusicController:
    """
    Bridge between weather providers and the music engine.

    Supports microphone, live weather, or blended input.
    """

    def __init__(self) -> None:
        self.engine = MusicEngine()
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
        self._input_source = InputSource.MICROPHONE
        self._lock = threading.Lock()
        self._live_info = LiveInfoPanel()
        self._last_weather_drive: Optional[MusicDriveParams] = None
        self._weather_tick_thread: Optional[threading.Thread] = None
        self._weather_tick_running = False

        self.station_manager.set_on_change(self._on_stations_changed)

    @property
    def input_source(self) -> InputSource:
        return self._input_source

    def set_input_source(self, source: InputSource) -> None:
        self._input_source = source

    def set_refresh_interval(self, seconds: float) -> None:
        self.fetcher.set_interval(seconds)

    def search_locations(self, query: str) -> List[GeoLocation]:
        return self.location_manager.search(query)

    def add_station(self, location: GeoLocation, mix: float = 1.0) -> None:
        self.station_manager.add_location(location, mix=mix)
        self.fetcher.fetch_now()

    def select_on_map(self, latitude: float, longitude: float) -> GeoLocation:
        loc = self.location_manager.from_coordinates(latitude, longitude)
        self.add_station(loc)
        return loc

    def fetch_now(self) -> None:
        self.fetcher.fetch_now()

    def get_live_info(self) -> LiveInfoPanel:
        with self._lock:
            vis = self.engine.get_visual_state()
            info = LiveInfoPanel(
                location_label=self._live_info.location_label,
                condition=self._live_info.condition,
                wind_speed_kmh=self._live_info.wind_speed_kmh,
                wind_direction_deg=self._live_info.wind_direction_deg,
                temperature_c=self._live_info.temperature_c,
                station_update=self._live_info.station_update,
                mode=self._live_info.mode,
                key=self._live_info.key,
                chord=vis.current_chord,
                tempo_bpm=vis.tempo_bpm,
                input_source=self._input_source.value,
                station_count=self.station_manager.count(),
                fetch_error=self.fetcher.last_error,
            )
            return info

    def start(self, mic_label: str = "") -> None:
        source = self._input_source
        use_mic = source in (InputSource.MICROPHONE, InputSource.BOTH)
        use_weather = source in (InputSource.LIVE_WEATHER, InputSource.BOTH)

        if use_weather and self.station_manager.count() == 0:
            raise ValueError("Add at least one weather location before starting in Live Weather mode.")

        if use_mic:
            self.engine.start_microphone(mic_label)
        else:
            self.engine.start_output_only()

        if use_weather:
            self.fetcher.start()
            self._start_weather_tick()

        with self._lock:
            self._live_info.input_source = source.value

    def stop(self) -> None:
        self._weather_tick_running = False
        self.fetcher.stop()
        self.engine.stop()

    def _start_weather_tick(self) -> None:
        if self._weather_tick_running:
            return
        self._weather_tick_running = True
        self._weather_tick_thread = threading.Thread(target=self._weather_tick_loop, daemon=True)
        self._weather_tick_thread.start()

    def _weather_tick_loop(self) -> None:
        while self._weather_tick_running and self.engine.is_running:
            self._apply_weather_drive()
            threading.Event().wait(0.35)

    def _on_stations_changed(self) -> None:
        self.fetcher.fetch_now()

    def _on_weather_updated(self) -> None:
        self._apply_weather_drive()
        self._update_live_info_panel()

    def _apply_weather_drive(self) -> None:
        profile = MODE_PROFILES[self.engine.mode]
        stations = self.station_manager.list_active()
        drive = self.mapper.blend_stations(stations, profile.tempo_min, profile.tempo_max)
        if drive is None:
            return

        self._last_weather_drive = drive

        if self._input_source in (InputSource.LIVE_WEATHER, InputSource.BOTH):
            mic_energy = None
            if self._input_source == InputSource.BOTH:
                mic_energy = self.engine.get_mic_energy()
                blended = MusicDriveParams(
                    energy=(drive.energy * 0.55 + mic_energy * 0.45),
                    gust=drive.gust or self.engine.get_mic_gust(),
                    tempo_bpm=drive.tempo_bpm,
                    stereo_pan=drive.stereo_pan,
                    reverb_amount=drive.reverb_amount,
                    bass_intensity=drive.bass_intensity,
                    percussion=drive.percussion,
                    atmosphere_layers=drive.atmosphere_layers,
                    brightness=drive.brightness,
                    instrument_warmth=drive.instrument_warmth,
                )
                self.engine.apply_drive(blended)
            else:
                self.engine.apply_drive(drive)

    def _update_live_info_panel(self) -> None:
        stations = self.station_manager.list_active()
        primary_weather = None
        primary_label = ""

        for s in stations:
            if s.enabled and s.weather:
                primary_weather = s.weather
                primary_label = s.station.display_name
                break

        self.engine.set_weather_snapshot(primary_weather)
        if primary_label:
            self.engine.set_location_label(primary_label)

        with self._lock:
            self._live_info.mode = self.engine.mode.value
            self._live_info.key = self.engine.scale_engine.key
            if primary_weather:
                w = primary_weather
                self._live_info.location_label = primary_label
                self._live_info.condition = w.condition
                self._live_info.wind_speed_kmh = w.wind_speed_kmh
                self._live_info.wind_direction_deg = w.wind_direction_deg
                self._live_info.temperature_c = w.temperature_c
                self._live_info.station_update = (
                    w.timestamp.isoformat() if w.timestamp else "—"
                )

    # Delegate common engine methods
    def set_mode(self, mode: Mode) -> None:
        self.engine.set_mode(mode)

    def set_scale(self, scale) -> None:
        self.engine.set_scale(scale)

    def set_key(self, key: str) -> None:
        self.engine.set_key(key)

    def set_master_volume(self, v: float) -> None:
        self.engine.set_master_volume(v)

    def set_sensitivity(self, s: float) -> None:
        self.engine.set_sensitivity(s)

    def get_visual_state(self) -> VisualState:
        return self.engine.get_visual_state()

    def start_recording(self) -> None:
        meta = self.engine.get_composition_metadata()
        if self._live_info.location_label:
            meta.location = self._live_info.location_label
        if self._live_info.condition:
            meta.weather = self._live_info.condition
        self.engine.start_recording(meta)

    def stop_recording(self) -> None:
        self.engine.stop_recording()

    def save_recording(self, path) -> Path:
        from pathlib import Path
        meta = self.engine.get_composition_metadata()
        return self.engine.recorder.save(Path(path), metadata=meta)

    @property
    def recorder(self):
        return self.engine.recorder

    @property
    def station_manager_ref(self) -> StationManager:
        return self.station_manager

    def get_primary_weather(self) -> Optional[WeatherSnapshot]:
        for s in self.station_manager.list_active():
            if s.enabled and s.weather:
                return s.weather
        return None
