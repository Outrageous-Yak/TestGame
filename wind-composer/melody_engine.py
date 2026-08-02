"""Melody generation responding to wind and gusts."""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import List, Optional

from config import MAX_MELODY_NOTES_PER_SEC
from scale_engine import ScaleEngine
from utils import clamp


@dataclass
class MelodyNote:
    midi: int
    velocity: float
    duration_sec: float


class MelodyEngine:
    """Stepwise melodies with gust accents; max 4 notes/sec."""

    def __init__(self, scale_engine: ScaleEngine) -> None:
        self.scale_engine = scale_engine
        self._current_midi: Optional[int] = None
        self._active_notes: List[MelodyNote] = []
        self._last_note_time = 0.0
        self._recent: List[int] = []

    def reset(self) -> None:
        self._current_midi = None
        self._active_notes.clear()
        self._last_note_time = 0.0
        self._recent.clear()

    def update(
        self,
        wind_energy: float,
        melody_activity: float,
        gust: bool,
        chord_tones: List[int],
    ) -> List[MelodyNote]:
        now = time.monotonic()
        min_interval = 1.0 / MAX_MELODY_NOTES_PER_SEC

        # Expire old notes
        self._active_notes = [n for n in self._active_notes if now - self._last_note_time < n.duration_sec]

        if self._current_midi is None:
            mid = self.scale_engine.midi_notes[len(self.scale_engine.midi_notes) // 2]
            self._current_midi = mid

        new_notes: List[MelodyNote] = []

        activity = clamp(wind_energy * melody_activity)
        if gust:
            activity = clamp(activity + 0.45)

        if (now - self._last_note_time) < min_interval:
            return new_notes

        if random.random() > activity * 0.35 + 0.05:
            return new_notes

        # Prefer stepwise motion; occasional leap on gust
        direction = random.choice([-1, 1])
        allow_leap = gust and random.random() < 0.35
        next_midi = self.scale_engine.step_note(self._current_midi, direction, allow_leap)

        # Avoid immediate repeats
        if next_midi in self._recent[-2:] and len(self.scale_engine.midi_notes) > 3:
            next_midi = self.scale_engine.step_note(next_midi, -direction)

        # Occasionally lean toward chord tones
        if chord_tones and random.random() < 0.4:
            next_midi = random.choice(chord_tones)

        velocity = clamp(0.35 + wind_energy * 0.5 + (0.25 if gust else 0.0))
        duration = random.uniform(0.25, 0.9) if not gust else random.uniform(0.15, 0.5)

        note = MelodyNote(midi=next_midi, velocity=velocity, duration_sec=duration)
        new_notes.append(note)
        self._active_notes.append(note)
        self._current_midi = next_midi
        self._last_note_time = now
        self._recent.append(next_midi)
        if len(self._recent) > 8:
            self._recent.pop(0)

        return new_notes

    @property
    def current_notes(self) -> List[int]:
        return [n.midi for n in self._active_notes]
