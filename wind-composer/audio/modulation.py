"""LFOs and modulation routing."""

from __future__ import annotations

import numpy as np

from config import SAMPLE_RATE


class LFO:
    def __init__(self, rate_hz: float = 0.1, kind: str = "sine") -> None:
        self.rate = rate_hz
        self.kind = kind
        self.phase = 0.0

    def process_block(self, n: int, depth: float = 1.0) -> np.ndarray:
        inc = 2.0 * np.pi * self.rate / SAMPLE_RATE
        phases = self.phase + inc * np.arange(n)
        if self.kind == "triangle":
            out = 2.0 * np.abs(2.0 * (phases / (2 * np.pi) - np.floor(phases / (2 * np.pi) + 0.5))) - 1.0
        else:
            out = np.sin(phases)
        self.phase = float(phases[-1] % (2.0 * np.pi))
        return out * depth


class SmoothRandom:
    """Slow random drift."""

    def __init__(self, rate_hz: float = 0.05) -> None:
        self.rate = rate_hz
        self.value = 0.0
        self.target = 0.0
        self._counter = 0

    def process_block(self, n: int, depth: float = 1.0) -> np.ndarray:
        out = np.empty(n)
        step = max(1, int(SAMPLE_RATE / max(self.rate, 0.01)))
        for i in range(n):
            if self._counter <= 0:
                self.target = np.random.uniform(-1.0, 1.0)
                self._counter = step
            self.value += 0.002 * (self.target - self.value)
            out[i] = self.value * depth
            self._counter -= 1
        return out
