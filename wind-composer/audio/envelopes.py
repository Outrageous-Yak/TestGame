"""ADSR and evolving envelopes."""

from __future__ import annotations

import numpy as np

from config import SAMPLE_RATE


class ADSREnvelope:
    """Sample-smooth ADSR amplitude envelope."""

    __slots__ = (
        "attack", "decay", "sustain", "release_sec",
        "stage", "level", "velocity", "_release_start",
    )

    def __init__(
        self,
        attack: float = 0.4,
        decay: float = 0.3,
        sustain: float = 0.7,
        release: float = 1.0,
    ) -> None:
        self.attack = attack
        self.decay = decay
        self.sustain = sustain
        self.release_sec = release
        self.stage = "idle"
        self.level = 0.0
        self.velocity = 1.0
        self._release_start = 0.0

    def trigger(self, velocity: float = 1.0) -> None:
        self.velocity = velocity
        self.stage = "attack"
        self._release_start = self.level

    def release(self) -> None:
        if self.stage != "idle":
            self.stage = "release"
            self._release_start = self.level

    def is_active(self) -> bool:
        return self.stage != "idle" or self.level > 1e-5

    def process_block(self, n: int) -> np.ndarray:
        out = np.zeros(n, dtype=np.float64)
        sr = SAMPLE_RATE
        atk = max(1, int(self.attack * sr))
        dec = max(1, int(self.decay * sr))
        rel = max(1, int(self.release_sec * sr))
        vel = self.velocity
        for i in range(n):
            if self.stage == "attack":
                self.level += 1.0 / atk
                if self.level >= 1.0:
                    self.stage = "decay"
                    self.level = 1.0
            elif self.stage == "decay":
                self.level -= (1.0 - self.sustain) / dec
                if self.level <= self.sustain:
                    self.stage = "sustain"
                    self.level = self.sustain
            elif self.stage == "sustain":
                pass
            elif self.stage == "release":
                self.level -= self._release_start / rel
                if self.level <= 0.0:
                    self.stage = "idle"
                    self.level = 0.0
            out[i] = self.level * vel
        return out


class SlowSwellEnvelope:
    """Long swell for pads and rare events."""

    def __init__(self, rise_sec: float = 3.0, fall_sec: float = 4.0) -> None:
        self.rise = rise_sec
        self.fall = fall_sec
        self.level = 0.0
        self.target = 0.0
        self.active = False

    def trigger(self, peak: float = 1.0) -> None:
        self.target = peak
        self.active = True

    def release(self) -> None:
        self.target = 0.0

    def process_block(self, n: int) -> np.ndarray:
        out = np.zeros(n)
        rise_coeff = 1.0 / max(1, int(self.rise * SAMPLE_RATE))
        fall_coeff = 1.0 / max(1, int(self.fall * SAMPLE_RATE))
        for i in range(n):
            if self.level < self.target:
                self.level = min(self.target, self.level + rise_coeff)
            else:
                self.level = max(self.target, self.level - fall_coeff)
            out[i] = self.level
        if self.level < 1e-5 and self.target < 1e-5:
            self.active = False
        return out
