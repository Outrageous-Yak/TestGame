"""Low-pass, high-pass and band-pass filters with smoothing."""

from __future__ import annotations

import numpy as np

from audio.smoothing import ParamSmoother
from config import SAMPLE_RATE


class OnePoleFilter:
    """Smoothed one-pole LP or HP."""

    def __init__(self, mode: str = "low", cutoff: float = 2000.0) -> None:
        self.mode = mode
        self._cutoff = ParamSmoother(cutoff, 0.08)
        self._z = 0.0

    def set_cutoff(self, cutoff: float) -> None:
        self._cutoff.set_target(max(30.0, min(16000.0, cutoff)))

    def process(self, x: np.ndarray) -> np.ndarray:
        coeffs = self._cutoff.process_block(len(x))
        out = np.empty_like(x)
        z = self._z
        sr = SAMPLE_RATE
        for i, sample in enumerate(x):
            fc = coeffs[i]
            a = 2.0 * np.pi * fc / sr
            alpha = a / (a + 1.0)
            if self.mode == "low":
                z += alpha * (sample - z)
                out[i] = z
            else:
                z += alpha * (sample - z)
                out[i] = sample - z
        self._z = z
        return out


class StateVariableFilter:
    """Gentle band-pass for atmosphere."""

    def __init__(self, cutoff: float = 800.0, q: float = 0.7) -> None:
        self._cutoff = ParamSmoother(cutoff, 0.1)
        self.q = q
        self._lp = 0.0
        self._bp = 0.0

    def set_cutoff(self, c: float) -> None:
        self._cutoff.set_target(c)

    def process(self, x: np.ndarray) -> np.ndarray:
        out = np.empty_like(x)
        lp, bp = self._lp, self._bp
        f = self._cutoff.process_block(len(x))
        sr = SAMPLE_RATE
        for i, sample in enumerate(x):
            fc = f[i]
            f_norm = min(0.25, fc / sr)
            q = max(0.5, self.q)
            lp += f_norm * bp
            hp = sample - lp - q * bp
            bp += f_norm * hp
            out[i] = bp
        self._lp, self._bp = lp, bp
        return out
