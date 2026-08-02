"""TTL cache for weather API responses."""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Dict, Generic, Optional, TypeVar

T = TypeVar("T")


@dataclass
class CacheEntry(Generic[T]):
    value: T
    expires_at: float


class WeatherCache:
    """Thread-safe cache to reduce API calls."""

    def __init__(self, default_ttl_sec: float = 25.0) -> None:
        self.default_ttl_sec = default_ttl_sec
        self._store: Dict[str, CacheEntry] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[T]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if time.monotonic() > entry.expires_at:
                del self._store[key]
                return None
            return entry.value

    def set(self, key: str, value: T, ttl_sec: Optional[float] = None) -> None:
        ttl = ttl_sec if ttl_sec is not None else self.default_ttl_sec
        with self._lock:
            self._store[key] = CacheEntry(value=value, expires_at=time.monotonic() + ttl)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()
