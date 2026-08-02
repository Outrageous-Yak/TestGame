"""Background weather polling with retry and cache."""

from __future__ import annotations

import logging
import threading
import time
from typing import Callable, List, Optional

from weather.models import GeoLocation, WeatherSnapshot
from weather.provider_base import WeatherProvider
from weather.station_manager import StationManager
from weather.weather_cache import WeatherCache

logger = logging.getLogger(__name__)


class WeatherFetcher:
    """Poll active stations at a configurable interval."""

    def __init__(
        self,
        providers: List[WeatherProvider],
        station_manager: StationManager,
        cache: WeatherCache,
        on_update: Callable[[], None],
    ) -> None:
        self.providers = providers
        self.station_manager = station_manager
        self.cache = cache
        self.on_update = on_update
        self._interval_sec = 30.0
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._lock = threading.Lock()
        self._last_error: Optional[str] = None
        self._retry_delay = 5.0

    @property
    def interval_sec(self) -> float:
        return self._interval_sec

    def set_interval(self, seconds: float) -> None:
        self._interval_sec = max(10.0, seconds)

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, name="WeatherFetcher", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False

    def fetch_now(self) -> None:
        """Immediate fetch (e.g. after adding a station)."""
        self._fetch_all()

    def _loop(self) -> None:
        while self._running:
            self._fetch_all()
            # Sleep in small chunks so stop is responsive
            deadline = time.monotonic() + self._interval_sec
            while self._running and time.monotonic() < deadline:
                time.sleep(0.25)

    def _fetch_all(self) -> None:
        stations = self.station_manager.list_active()
        provider = self.providers[0] if self.providers else None
        if not provider:
            return

        for idx, active in enumerate(stations):
            if not active.enabled:
                continue
            loc = active.station.location
            cache_key = f"{loc.latitude:.4f},{loc.longitude:.4f}"
            cached = self.cache.get(cache_key)
            if cached is not None:
                self.station_manager.update_weather(idx, cached)
                continue

            weather = self._fetch_with_retry(provider, loc)
            if weather:
                ttl = max(8.0, self._interval_sec - 2.0)
                self.cache.set(cache_key, weather, ttl_sec=ttl)
                self.station_manager.update_weather(idx, weather)
                self._last_error = None

        try:
            self.on_update()
        except Exception as exc:
            logger.exception("Weather update callback failed: %s", exc)

    def _fetch_with_retry(self, provider: WeatherProvider, loc: GeoLocation) -> Optional[WeatherSnapshot]:
        for attempt in range(3):
            try:
                return provider.get_current_weather(loc)
            except Exception as exc:
                self._last_error = str(exc)
                logger.warning("Weather fetch attempt %d failed: %s", attempt + 1, exc)
                time.sleep(self._retry_delay * (attempt + 1))
        return None
