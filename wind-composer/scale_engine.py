"""Musical scales and key handling."""

from __future__ import annotations

from typing import Dict, List

from config import KEYS, NOTE_TO_MIDI, ScaleName


# Intervals from root within one octave (semitones)
SCALE_INTERVALS: Dict[ScaleName, List[int]] = {
    ScaleName.MAJOR: [0, 2, 4, 5, 7, 9, 11],
    ScaleName.MINOR: [0, 2, 3, 5, 7, 8, 10],
    ScaleName.NATURAL_MINOR: [0, 2, 3, 5, 7, 8, 10],
    ScaleName.PENTATONIC: [0, 2, 4, 7, 9],
    ScaleName.DORIAN: [0, 2, 3, 5, 7, 9, 10],
    ScaleName.MIXOLYDIAN: [0, 2, 4, 5, 7, 9, 10],
}


class ScaleEngine:
    """Build scale notes and frequencies for a key and scale."""

    def __init__(self, key: str = "C", scale: ScaleName = ScaleName.MINOR) -> None:
        self.key = key
        self.scale = scale
        self._midi_notes: List[int] = []
        self._rebuild()

    def set_key(self, key: str) -> None:
        if key in NOTE_TO_MIDI:
            self.key = key
            self._rebuild()

    def set_scale(self, scale: ScaleName) -> None:
        self.scale = scale
        self._rebuild()

    def _rebuild(self) -> None:
        root = NOTE_TO_MIDI.get(self.key, 0)
        intervals = SCALE_INTERVALS[self.scale]
        notes: List[int] = []
        for octave in range(-2, 4):
            for interval in intervals:
                midi = root + interval + octave * 12 + 48  # center around mid range
                if 36 <= midi <= 96:
                    notes.append(midi)
        self._midi_notes = sorted(set(notes))

    @property
    def midi_notes(self) -> List[int]:
        return list(self._midi_notes)

    def nearest_scale_note(self, midi: int) -> int:
        if not self._midi_notes:
            return midi
        return min(self._midi_notes, key=lambda n: abs(n - midi))

    def step_note(self, current: int, direction: int, allow_leap: bool = False) -> int:
        """Move by scale steps; rare leaps when allow_leap."""
        idx = self._midi_notes.index(current) if current in self._midi_notes else 0
        if allow_leap and direction != 0:
            step = direction * 2 if abs(direction) > 0 else direction
        else:
            step = 1 if direction >= 0 else -1
        new_idx = max(0, min(len(self._midi_notes) - 1, idx + step))
        return self._midi_notes[new_idx]

    def chord_tones(self, root_midi: int, num_notes: int = 3) -> List[int]:
        """Build chord from scale degrees starting at root."""
        root_idx = self._midi_notes.index(root_midi) if root_midi in self._midi_notes else 0
        tones: List[int] = []
        degree_steps = [0, 2, 4, 6, 4, 2]  # triad + extensions in scale steps
        for i in range(min(num_notes, len(degree_steps))):
            idx = root_idx + degree_steps[i]
            if idx < len(self._midi_notes):
                tones.append(self._midi_notes[idx])
        return tones

    def degree_root(self, degree_index: int) -> int:
        """Root midi for a scale degree (0 = root)."""
        intervals = SCALE_INTERVALS[self.scale]
        root = NOTE_TO_MIDI.get(self.key, 0) + 48
        semitone = intervals[degree_index % len(intervals)]
        octave_shift = (degree_index // len(intervals)) * 12
        return root + semitone + octave_shift

    def note_name(self, midi: int) -> str:
        name = KEYS[midi % 12]
        octave = (midi // 12) - 1
        return f"{name}{octave}"
