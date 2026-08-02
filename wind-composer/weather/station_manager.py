"""Manage multiple active weather stations and blend weights."""

from __future__ import annotations

import threading
import uuid
from typing import Callable, List, Optional

from weather.models import ActiveStation, GeoLocation, WeatherSnapshot, WeatherStation


class StationManager:
    """Track multiple live stations with adjustable mix sliders."""

    def __init__(self) -> None:
        self._stations: List[ActiveStation] = []
        self._lock = threading.Lock()
        self._on_change: Optional[Callable[[], None]] = None

    def set_on_change(self, callback: Callable[[], None]) -> None:
        self._on_change = callback

    def _notify(self) -> None:
        if self._on_change:
            self._on_change()

    def add_location(self, location: GeoLocation, mix: float = 1.0) -> ActiveStation:
        station = WeatherStation(
            location=location,
            station_name=location.label(),
        )
        active = ActiveStation(station=station, mix=mix)
        with self._lock:
            # Avoid duplicate same coordinates
            for s in self._stations:
                if abs(s.station.location.latitude - location.latitude) < 0.01 and \
                   abs(s.station.location.longitude - location.longitude) < 0.01:
                    return s
            self._stations.append(active)
        self._notify()
        return active

    def remove_at(self, index: int) -> None:
        with self._lock:
            if 0 <= index < len(self._stations):
                self._stations.pop(index)
        self._notify()

    def clear(self) -> None:
        with self._lock:
            self._stations.clear()
        self._notify()

    def set_mix(self, index: int, mix: float) -> None:
        with self._lock:
            if 0 <= index < len(self._stations):
                self._stations[index].mix = max(0.0, min(1.0, mix))
        self._notify()

    def set_enabled(self, index: int, enabled: bool) -> None:
        with self._lock:
            if 0 <= index < len(self._stations):
                self._stations[index].enabled = enabled
        self._notify()

    def update_weather(self, index: int, weather: WeatherSnapshot) -> None:
        with self._lock:
            if 0 <= index < len(self._stations):
                self._stations[index].weather = weather
                self._stations[index].station.last_update = weather.timestamp

    def list_active(self) -> List[ActiveStation]:
        with self._lock:
            return [ActiveStation(
                station=s.station,
                mix=s.mix,
                weather=s.weather,
                enabled=s.enabled,
            ) for s in self._stations]

    def count(self) -> int:
        with self._lock:
            return len(self._stations)
