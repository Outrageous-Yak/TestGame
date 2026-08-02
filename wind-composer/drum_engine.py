"""Step-sequenced drum generation."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List

from rhythm_engine import RhythmEvent
from style_engine import StyleProfile
from utils import clamp


@dataclass
class DrumContext:
    beat: int
    bar: int
    energy: float
    precipitation: float
    snowfall: float
    style: StyleProfile
    section_energy: float


class DrumEngine:
  def __init__(self) -> None:
    self._hat_toggle = False

  def on_beat(self, ctx: DrumContext) -> List[RhythmEvent]:
    events: List[RhythmEvent] = []
    step = ctx.beat % 16
    pattern = ctx.style.kick_pattern
    density = ctx.style.drum_density * (0.5 + ctx.energy * 0.5) * ctx.section_energy

    if pattern[step] and random.random() < 0.95:
      events.append(RhythmEvent(layer="kick", strength=clamp(0.5 + ctx.energy * 0.35), is_pulse=True))

    if density > 0.25 and step % 2 == 1:
      hat_str = clamp(density * 0.35 + random.uniform(0, 0.15))
      events.append(RhythmEvent(layer="hat", strength=hat_str, is_pulse=False))

    if density > 0.45 and step in (4, 12) and random.random() < density:
      events.append(RhythmEvent(layer="snare", strength=clamp(0.4 + ctx.energy * 0.3), is_pulse=True))

    if ctx.precipitation > 0.5 and step % 4 == 2:
      events.append(RhythmEvent(layer="percussion", strength=clamp(ctx.precipitation * 0.25), is_pulse=False))

    if ctx.snowfall > 0.2 and step % 8 == 0:
      events.append(RhythmEvent(layer="bell", strength=0.2, is_pulse=False))

    return events
