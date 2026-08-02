"""Subtle chorus processing."""

from __future__ import annotations

import numpy as np

from config import SAMPLE_RATE
from utils import clamp


class ChorusProcessor:
    def __init__(self, mix: float = 0.12) -> None:
        self.mix = mix
        self.buf = np.zeros(int(SAMPLE_RATE * 0.05))
        self.pos = 0
        self.phase = 0.0

    def set_mix(self, mix: float) -> None:
        self.mix = clamp(mix)

    def process(self, left: np.ndarray, right: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        if self.mix < 0.01:
            return left, right
        out_l = np.empty_like(left)
        out_r = np.empty_like(right)
        depth = int(SAMPLE_RATE * 0.0018)
        buflen = len(self.buf)
        m = self.mix
        for i in range(len(left)):
            self.buf[self.pos] = left[i]
            off = int(depth * (0.5 + 0.5 * np.sin(self.phase)))
            read = (self.pos - off) % buflen
            mod = self.buf[read]
            out_l[i] = left[i] * (1 - m) + mod * m
            out_r[i] = right[i] * (1 - m * 0.8) + mod * m * 0.9
            self.pos = (self.pos + 1) % buflen
            self.phase += 2.0 * np.pi * 0.6 / SAMPLE_RATE
        return out_l, out_r
