"""Procedural bass line generation."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional

from melody_engine import MelodyNote
from music_memory import MusicMemory
from style_engine import StyleProfile
from utils import clamp


@dataclass
class BassContext:
    chord_tones: List[int]
    energy: float
    wind_direction: float
    pressure_trend: float
    bar_in_phrase: int
    style: StyleProfile


class BassEngine:
  def __init__(self, memory: MusicMemory) -> None:
    self._memory = memory
    self._pattern_idx = 0
    self._last_root: Optional[int] = None

  def on_bar(self, ctx: BassContext) -> List[MelodyNote]:
    if not ctx.chord_tones:
      return []
    root = ctx.chord_tones[0]
    fifth = ctx.chord_tones[min(2, len(ctx.chord_tones) - 1)]
    style = ctx.style.bass_style

    if style == "ambient":
      pattern = (root - 12,)
    elif style == "house":
      pattern = self._house_pattern(root, fifth, ctx)
    elif style == "trance":
      pattern = (root - 12, root - 5, root - 12, fifth - 12)
    elif style == "techno":
      pattern = (root - 12, root - 12, fifth - 12, root - 12)
    else:
      pattern = (root - 12, fifth - 12)

    if self._memory.bass_overused(pattern):
      pattern = tuple(reversed(pattern)) if len(pattern) > 1 else pattern

    self._memory.remember_bass(pattern)
    vel = clamp(0.35 + ctx.energy * 0.45)
    notes: List[MelodyNote] = []
    for i, midi in enumerate(pattern):
      notes.append(MelodyNote(midi=midi, velocity=vel * (0.9 + i * 0.02), duration_sec=0.35))
    return notes

  def _house_pattern(self, root: int, fifth: int, ctx: BassContext) -> tuple:
    if ctx.bar_in_phrase % 4 == 0:
      return (root - 12, root - 12, fifth - 12, root - 12)
    if random.random() < 0.35 + ctx.energy * 0.2:
      return (root - 12, root - 7, fifth - 12, root - 12)
    return (root - 12, root - 12, root - 12, fifth - 12)
