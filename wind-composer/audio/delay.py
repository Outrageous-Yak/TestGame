"""Tempo-synced stereo delay."""

from __future__ import annotations

import numpy as np

from audio.smoothing import ParamSmoother
from config import SAMPLE_RATE
from utils import clamp


class StereoDelay:
    DIVISIONS = {"1/4": 1.0, "1/8": 0.5, "dotted_1/8": 0.75, "1/16": 0.25, "1/2": 2.0}

    def __init__(self, max_sec: float = 2.0) -> None:
        self.max_samples = int(SAMPLE_RATE * max_sec)
        self.buf_l = np.zeros(self.max_samples)
        self.buf_r = np.zeros(self.max_samples)
        self.pos = 0
        self._wet = ParamSmoother(0.15, 0.15)
        self._feedback = 0.32
        self._division = "1/8"
        self._tempo_bpm = 60.0

    def set_tempo(self, bpm: float) -> None:
        self._tempo_bpm = max(20.0, bpm)

    def set_division(self, div: str) -> None:
        if div in self.DIVISIONS:
            self._division = div

    def set_wet(self, wet: float) -> None:
        self._wet.set_target(clamp(wet))

    def set_feedback(self, feedback: float) -> None:
        self._feedback = clamp(feedback, 0.0, 0.72)

    def _delay_samples(self) -> int:
        beat_sec = 60.0 / self._tempo_bpm
        mult = self.DIVISIONS.get(self._division, 0.5)
        return int(min(self.max_samples - 1, beat_sec * mult * SAMPLE_RATE))

    def process(self, left: np.ndarray, right: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        d = self._delay_samples()
        wet_curve = self._wet.process_block(len(left))
        out_l = np.empty_like(left)
        out_r = np.empty_like(right)
        fb = self._feedback
        for i in range(len(left)):
            wet = wet_curve[i]
            read = (self.pos - d) % self.max_samples
            dl = self.buf_l[read]
            dr = self.buf_r[read]
            out_l[i] = left[i] + dl * wet
            out_r[i] = right[i] + dr * wet
            self.buf_l[self.pos] = left[i] + dl * fb
            self.buf_r[self.pos] = right[i] + dr * fb * 0.92
            self.pos = (self.pos + 1) % self.max_samples
        return out_l, out_r
