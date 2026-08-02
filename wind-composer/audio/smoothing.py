"""Parameter smoothing for glitch-free audio."""

from __future__ import annotations

from typing import Optional

import numpy as np

from config import SAMPLE_RATE


class ParamSmoother:
    """Exponential smoothing for a single float parameter."""

    __slots__ = ("value", "target", "coeff")

    def __init__(self, initial: float = 0.0, time_sec: float = 0.15) -> None:
        self.value = initial
        self.target = initial
        self.coeff = self._coeff_from_time(time_sec)

    @staticmethod
    def _coeff_from_time(time_sec: float) -> float:
        if time_sec <= 0:
            return 1.0
        return 1.0 - np.exp(-1.0 / (time_sec * SAMPLE_RATE))

    def set_target(self, target: float, time_sec: Optional[float] = None) -> None:
        self.target = target
        if time_sec is not None:
            self.coeff = self._coeff_from_time(time_sec)

    def process_block(self, n: int) -> np.ndarray:
        out = np.empty(n, dtype=np.float64)
        v, t, c = self.value, self.target, self.coeff
        for i in range(n):
            v += c * (t - v)
            out[i] = v
        self.value = v
        return out

    def snap(self, value: float) -> None:
        self.value = self.target = value
