"""Abstract weather provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List, Optional

from weather.models import GeoLocation, WeatherSnapshot


class WeatherProvider(ABC):
    """Common interface for live weather data sources."""

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
    def search_locations(self, query: str, count: int = 10) -> List[GeoLocation]:
        ...

    @abstractmethod
    def get_current_weather(self, location: GeoLocation) -> WeatherSnapshot:
        ...

    def nearest_station(self, latitude: float, longitude: float) -> GeoLocation:
        """Return a location representing the nearest data point (grid for most APIs)."""
        return GeoLocation(
            id=f"grid_{latitude:.2f}_{longitude:.2f}",
            name=f"Grid {latitude:.2f}°, {longitude:.2f}°",
            country="",
            latitude=latitude,
            longitude=longitude,
        )
