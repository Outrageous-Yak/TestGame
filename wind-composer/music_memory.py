"""Extended musical memory — avoid repetitive phrases, fills, bass."""

from __future__ import annotations

from collections import deque
from typing import Deque, List, Set


class MusicMemory:
    def __init__(self) -> None:
        self._phrases: Deque[int] = deque(maxlen=8)
        self._fills: Deque[str] = deque(maxlen=12)
        self._bass_patterns: Deque[tuple] = deque(maxlen=16)
        self._transitions: Deque[str] = deque(maxlen=6)
        self._sections: Deque[str] = deque(maxlen=4)
        self._lead_motifs: Deque[tuple] = deque(maxlen=10)

    def remember_phrase(self, phrase_id: int) -> None:
        self._phrases.append(phrase_id)

    def phrase_recent(self, phrase_id: int) -> bool:
        return phrase_id in list(self._phrases)[-3:]

    def remember_fill(self, fill_type: str) -> None:
        self._fills.append(fill_type)

    def fill_overused(self, fill_type: str) -> bool:
        return sum(1 for f in self._fills if f == fill_type) >= 2

    def remember_bass(self, pattern: tuple) -> None:
        self._bass_patterns.append(pattern)

    def bass_overused(self, pattern: tuple) -> bool:
        return pattern in list(self._bass_patterns)[-4:]

    def remember_transition(self, fx: str) -> None:
        self._transitions.append(fx)

    def transition_recent(self, fx: str) -> bool:
        return fx in list(self._transitions)[-2:]

    def remember_section(self, section: str) -> None:
        self._sections.append(section)

    def remember_motif(self, motif: tuple) -> None:
        self._lead_motifs.append(motif)

    def motif_overused(self, motif: tuple) -> bool:
        return motif in list(self._lead_motifs)[-3:]

    def reset(self) -> None:
        self._phrases.clear()
        self._fills.clear()
        self._bass_patterns.clear()
        self._transitions.clear()
        self._sections.clear()
        self._lead_motifs.clear()
