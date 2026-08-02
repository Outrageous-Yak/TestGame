"""Orchestrates weather data, music engine, and input sources."""

from __future__ import annotations

import logging
import threading
import time
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
    local_time: str = "—"
    next_update: str = "—"
    mode: str = "—"
    key: str = "—"
    chord: str = "—"
    tempo_bpm: float = 0.0
    input_source: str = "—"
    station_count: int = 0
    musical_style: str = "Ambient"
    song_section: str = "Flow"
    energy: float = 0.0
    fetch_error: Optional[str] = None
    weather_notice: str = ""


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
        self._refresh_adaptive = False
        self._next_fetch_deadline = 0.0
        self._last_fetch_time = time.time()
        self._weather_tick_thread: Optional[threading.Thread] = None
        self._weather_tick_running = False

        self.station_manager.set_on_change(self._on_stations_changed)

    @property
    def input_source(self) -> InputSource:
        return self._input_source

    def set_input_source(self, source: InputSource) -> None:
        self._input_source = source

    def set_refresh_interval(self, seconds: float, adaptive: bool = False) -> None:
        self._refresh_adaptive = adaptive
        if adaptive:
            self.fetcher.set_interval(self._adaptive_interval())
        else:
            self.fetcher.set_interval(seconds)

    def set_musical_style(self, name: str) -> None:
        self.engine.set_musical_style(name)

    def _adaptive_interval(self) -> float:
        drive = self._last_weather_drive
        if not drive:
            return 60.0
        if drive.energy > 0.7:
            return 10.0
        if drive.energy > 0.45:
            return 20.0
        if drive.energy < 0.15:
            return 300.0
        return 60.0

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
                local_time=self._live_info.local_time,
                next_update=self._live_info.next_update,
                mode=self._live_info.mode,
                key=self._live_info.key,
                chord=vis.current_chord,
                tempo_bpm=vis.tempo_bpm,
                input_source=self._input_source.value,
                station_count=self.station_manager.count(),
                musical_style=vis.musical_style,
                song_section=vis.song_section,
                energy=vis.wind_strength,
                fetch_error=self.fetcher.last_error,
                weather_notice=self._live_info.weather_notice,
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
        self._last_fetch_time = time.time()
        self._apply_weather_drive()
        self._notify_weather_snapshots()
        self._update_live_info_panel()
        if self._refresh_adaptive:
            self.fetcher.set_interval(self._adaptive_interval())

    def _notify_weather_snapshots(self) -> None:
        for active in self.station_manager.list_active():
            if active.enabled and active.weather:
                w = active.weather
                local = w.timestamp.strftime("%H:%M:%S") if w.timestamp else "—"
                self.engine.composition_engine.on_weather_snapshot(w, local)
                notice = self.engine.composition_engine.get_weather_notice()
                if notice:
                    with self._lock:
                        lines = ["Weather Updated", *notice.lines, *notice.musical_hints]
                        self._live_info.weather_notice = "\n".join(lines)
                break

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
                    w.timestamp.strftime("%H:%M:%S") if w.timestamp else "—"
                )
                self._live_info.local_time = self._live_info.station_update
                remaining = max(0, self.fetcher.interval_sec - (
                    time.time() - getattr(self, "_last_fetch_time", time.time())
                ))
                self._live_info.next_update = f"{int(remaining // 60):02d}:{int(remaining % 60):02d}"
                with self.engine.lock:
                    self.engine.visual.next_update_sec = remaining
                    self.engine.visual.local_time_str = self._live_info.local_time

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

    def set_audio_quality(self, level: str) -> None:
        self.engine.set_audio_quality(level)

    def set_soundscape(self, name: str) -> None:
        self.engine.set_soundscape(name)

    def set_sound_tweaks(
        self,
        reverb: float,
        width: float,
        brightness: float,
        warmth: float,
    ) -> None:
        self.engine.set_sound_tweaks(reverb, width, brightness, warmth)

    def get_audio_diagnostics(self) -> dict:
        return self.engine.get_audio_diagnostics()

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
