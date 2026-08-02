"""Store weather history and compute atmospheric trends."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque, List, Optional

from weather.models import WeatherSnapshot


@dataclass
class WeatherTrend:
    pressure_delta: float = 0.0
    wind_delta: float = 0.0
    humidity_delta: float = 0.0
    storm_likelihood: float = 0.0
    calm_trend: bool = False
    accelerating_wind: bool = False


class WeatherMemory:
    """Rolling window of the last N weather snapshots."""

    def __init__(self, maxlen: int = 20) -> None:
        self._history: Deque[WeatherSnapshot] = deque(maxlen=maxlen)
        self._last: Optional[WeatherSnapshot] = None

    def push(self, snap: WeatherSnapshot) -> Optional[WeatherSnapshot]:
        prev = self._last
        self._history.append(snap)
        self._last = snap
        return prev

    def trend(self) -> WeatherTrend:
        if len(self._history) < 2:
            return WeatherTrend()
        recent = list(self._history)
        old = recent[0]
        new = recent[-1]
        n = len(recent)
        wind_vals = [s.wind_speed_kmh for s in recent]
        pressure_vals = [s.pressure_hpa for s in recent]
        humidity_vals = [s.humidity_pct for s in recent]

        wind_delta = new.wind_speed_kmh - old.wind_speed_kmh
        pressure_delta = new.pressure_hpa - old.pressure_hpa
        humidity_delta = new.humidity_pct - old.humidity_pct

        storm_likelihood = 0.0
        if pressure_delta < -3 and wind_delta > 5:
            storm_likelihood = clamp01((-pressure_delta / 10) + wind_delta / 30)
        if new.is_storm():
            storm_likelihood = max(storm_likelihood, 0.7)

        accelerating = wind_vals[-1] - wind_vals[max(0, n - 4)] > 8

        return WeatherTrend(
            pressure_delta=pressure_delta,
            wind_delta=wind_delta,
            humidity_delta=humidity_delta,
            storm_likelihood=storm_likelihood,
            calm_trend=wind_delta < -3 and pressure_delta > 2,
            accelerating_wind=accelerating,
        )

    def change_summary(self, prev: WeatherSnapshot, new: WeatherSnapshot) -> List[str]:
        lines: List[str] = []
        if abs(new.wind_speed_kmh - prev.wind_speed_kmh) >= 1:
            lines.append(
                f"Wind {prev.wind_speed_kmh:.0f} → {new.wind_speed_kmh:.0f} km/h"
            )
        if abs(new.humidity_pct - prev.humidity_pct) >= 2:
            lines.append(
                f"Humidity {prev.humidity_pct:.0f} → {new.humidity_pct:.0f}%"
            )
        if abs(new.pressure_hpa - prev.pressure_hpa) >= 1:
            lines.append(
                f"Pressure {prev.pressure_hpa:.0f} → {new.pressure_hpa:.0f} hPa"
            )
        return lines


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))
