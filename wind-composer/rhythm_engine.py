"""Rhythm patterns scaled by wind strength."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List

from utils import clamp


@dataclass
class RhythmEvent:
    layer: str
    strength: float
    is_pulse: bool


class RhythmEngine:
    """Calm wind = sparse; strong wind = gentle pulse."""

    def __init__(self) -> None:
        self._beat_counter = 0.0
        self._samples_per_beat = 0.0

    def set_tempo(self, tempo_bpm: float, sample_rate: int) -> None:
        self._samples_per_beat = (60.0 / max(tempo_bpm, 20.0)) * sample_rate

    def update(
        self,
        wind_energy: float,
        rhythm_density: float,
        sample_position: int,
    ) -> List[RhythmEvent]:
        if self._samples_per_beat <= 0:
            return []

        beat_idx = int(sample_position / self._samples_per_beat)
        if beat_idx == self._beat_counter:
            return []
        self._beat_counter = beat_idx

        events: List[RhythmEvent] = []
        density = clamp(wind_energy * rhythm_density)

        if density < 0.15:
            return events

        # Sparse pulse on quarter notes when medium wind
        if random.random() < density * 0.5:
            events.append(RhythmEvent(layer="bass", strength=density * 0.6, is_pulse=True))

        if density > 0.35 and random.random() < density * 0.35:
            events.append(RhythmEvent(layer="pad", strength=density * 0.3, is_pulse=False))

        if density > 0.55 and random.random() < density * 0.25:
            events.append(RhythmEvent(layer="lead", strength=density * 0.5, is_pulse=True))

        return events

    def reset(self) -> None:
        self._beat_counter = 0.0
