"""Phase 6 tempo smoothing — max 1 BPM per bar, gust boost decay."""

from __future__ import annotations

from utils import clamp


class TempoEngine:
    def __init__(self) -> None:
        self._current_bpm = 100.0
        self._gust_boost = 0.0
        self._last_bar = -1

    @property
    def current_bpm(self) -> float:
        return self._current_bpm

    def reset(self, bpm: float) -> None:
        self._current_bpm = bpm
        self._gust_boost = 0.0
        self._last_bar = -1

    def update(
        self,
        target_bpm: float,
        bpm_min: float,
        bpm_max: float,
        measure: int,
        gust: bool,
    ) -> float:
        clamped_target = clamp(target_bpm, bpm_min, bpm_max)
        if gust:
            self._gust_boost = min(2.0, self._gust_boost + 2.0)

        if measure != self._last_bar and measure >= 0:
            self._last_bar = measure
            goal = clamp(clamped_target + self._gust_boost, bpm_min, bpm_max + 2.0)
            diff = goal - self._current_bpm
            if abs(diff) > 0.001:
                self._current_bpm += clamp(diff, -1.0, 1.0)
            self._gust_boost *= 0.55
            if self._gust_boost < 0.05:
                self._gust_boost = 0.0

        return clamp(self._current_bpm, bpm_min, bpm_max + 2.0)


def wind_to_target_bpm(
    wind_kmh: float,
    bpm_min: float,
    bpm_max: float,
    trend_wind_delta: float = 0.0,
    storm_likelihood: float = 0.0,
) -> float:
    trend_wind = wind_kmh + trend_wind_delta * 0.35
    factor = clamp(trend_wind / 45.0)
    return bpm_min + factor * (bpm_max - bpm_min) + storm_likelihood * 4.0
