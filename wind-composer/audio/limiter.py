"""Output limiter and safety."""

from __future__ import annotations

import numpy as np

from utils import clamp


class SafetyLimiter:
    def __init__(self, ceiling: float = 0.92) -> None:
        self.ceiling = ceiling
        self.active = False
        self.peak = 0.0

    def process(self, left: np.ndarray, right: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        stereo = np.column_stack([left, right])
        peak = float(np.max(np.abs(stereo)))
        self.peak = peak
        if not np.isfinite(peak) or peak > 1e6:
            return np.zeros_like(left), np.zeros_like(right)
        if peak > self.ceiling:
            self.active = True
            g = self.ceiling / peak
            left = left * g
            right = right * g
        else:
            self.active = False
        # NaN guard
        left = np.nan_to_num(left, nan=0.0, posinf=0.0, neginf=0.0)
        right = np.nan_to_num(right, nan=0.0, posinf=0.0, neginf=0.0)
        return left, right
