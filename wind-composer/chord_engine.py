"""Evolving chord progressions controlled by wind."""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import List, Optional

from config import CHORD_MAX_SEC, CHORD_MIN_SEC, ScaleName
from scale_engine import ScaleEngine
from utils import clamp


# Minor-style progressions as scale-degree indices (0=i, 5=VI, etc.)
MINOR_PROGRESSION = [0, 5, 2, 6]  # i, VI, III, VII
MAJOR_PROGRESSION = [0, 5, 3, 4]  # I, VI, IV, V


@dataclass
class ChordState:
    root_midi: int
    tones: List[int]
    name: str
    degree_index: int


class ChordEngine:
    """Change chords every 8–16 seconds with wind-influenced probability."""

    def __init__(self, scale_engine: ScaleEngine) -> None:
        self.scale_engine = scale_engine
        self._progression_idx = 0
        self._next_change = 0.0
        self._current: Optional[ChordState] = None
        self._schedule_next()

    def _schedule_next(self, wind_energy: float = 0.0) -> None:
        # Wind slightly shortens chord duration
        span = CHORD_MAX_SEC - CHORD_MIN_SEC
        duration = CHORD_MIN_SEC + span * (1.0 - wind_energy * 0.35)
        duration += random.uniform(-1.0, 1.5)
        self._next_change = time.monotonic() + max(CHORD_MIN_SEC, duration)

    def _progression_for_scale(self) -> List[int]:
        if self.scale_engine.scale in (ScaleName.MINOR, ScaleName.NATURAL_MINOR, ScaleName.DORIAN):
            return MINOR_PROGRESSION
        return MAJOR_PROGRESSION

    def update(self, wind_energy: float) -> ChordState:
        now = time.monotonic()
        if self._current is None or now >= self._next_change:
            prog = self._progression_for_scale()
            degree = prog[self._progression_idx % len(prog)]
            self._progression_idx += 1
            root = self.scale_engine.degree_root(degree)
            tones = self.scale_engine.chord_tones(root, 4)
            name = self._chord_name(degree)
            self._current = ChordState(root_midi=root, tones=tones, name=name, degree_index=degree)
            self._schedule_next(wind_energy)
        return self._current

    def _chord_name(self, degree: int) -> str:
        key = self.scale_engine.key
        roman = ["i", "ii", "iii", "iv", "v", "vi", "vii"]
        if self.scale_engine.scale in (ScaleName.MAJOR, ScaleName.MIXOLYDIAN):
            roman = ["I", "II", "III", "IV", "V", "VI", "VII"]
        deg = degree % 7
        return f"{key} {roman[deg]}"

    @property
    def current(self) -> Optional[ChordState]:
        return self._current

    def reset(self) -> None:
        self._progression_idx = 0
        self._current = None
        self._schedule_next()
