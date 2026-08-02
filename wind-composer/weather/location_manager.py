"""Location search orchestration across providers."""

from __future__ import annotations

import logging
from typing import List

from weather.models import GeoLocation
from weather.provider_base import WeatherProvider

logger = logging.getLogger(__name__)


class LocationManager:
    """Search cities, countries, GPS, airport codes, and station names."""

    def __init__(self, providers: List[WeatherProvider]) -> None:
        self.providers = providers

    def search(self, query: str, count: int = 12) -> List[GeoLocation]:
        query = query.strip()
        if not query:
            return []

        seen: set[str] = set()
        results: List[GeoLocation] = []

        for provider in self.providers:
            try:
                found = provider.search_locations(query, count=count)
            except Exception as exc:
                logger.warning("Search failed on %s: %s", provider.name, exc)
                continue
            for loc in found:
                key = f"{loc.latitude:.3f},{loc.longitude:.3f},{loc.name}"
                if key not in seen:
                    seen.add(key)
                    results.append(loc)
            if len(results) >= count:
                break

        return results[:count]

    def from_coordinates(self, latitude: float, longitude: float) -> GeoLocation:
        if self.providers:
            return self.providers[0].nearest_station(latitude, longitude)
        return GeoLocation(
            id=f"coord_{latitude}_{longitude}",
            name=f"{latitude:.2f}°, {longitude:.2f}°",
            country="",
            latitude=latitude,
            longitude=longitude,
        )
