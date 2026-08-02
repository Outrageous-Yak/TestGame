"""Bar-aligned drum fills."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional

from music_memory import MusicMemory
from rhythm_engine import RhythmEvent
from utils import clamp


@dataclass
class FillContext:
    bar: int
    phrase_length: int
    energy: float
    storm_likelihood: float
    fill_probability: float


class FillEngine:
  FILL_BARS = (4, 8, 16, 32, 64)

  def __init__(self, memory: MusicMemory) -> None:
    self._memory = memory

  def maybe_fill(self, ctx: FillContext) -> List[RhythmEvent]:
    if ctx.bar <= 0 or ctx.bar % 4 != 0:
      return []
    prob = ctx.fill_probability * (0.5 + ctx.energy * 0.5) + ctx.storm_likelihood * 0.2
    for fb in self.FILL_BARS:
      if ctx.bar % fb == 0:
        prob += 0.08
    if random.random() > prob:
      return []

    fill_type = random.choice(["tom_run", "hat_roll", "snare_build", "crash"])
    if self._memory.fill_overused(fill_type):
      fill_type = random.choice(["perc_burst", "kick_double"])

    self._memory.remember_fill(fill_type)
    strength = clamp(0.45 + ctx.energy * 0.4)
    events = [
      RhythmEvent(layer="snare", strength=strength, is_pulse=True),
      RhythmEvent(layer="percussion", strength=strength * 0.8, is_pulse=False),
    ]
    if fill_type == "crash":
      events.append(RhythmEvent(layer="percussion", strength=0.85, is_pulse=True))
    return events
