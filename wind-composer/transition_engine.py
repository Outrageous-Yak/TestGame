"""Section transitions and FX triggers."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Optional

from music_memory import MusicMemory
from utils import clamp


@dataclass
class TransitionContext:
    energy: float
    storm_likelihood: float
    section_change: bool
    transition_probability: float
    gust: bool


TRANSITIONS = [
    "filter_sweep",
    "noise_riser",
    "reverse_crash",
    "sub_drop",
    "impact",
    "reverb_tail",
    "delay_freeze",
]


class TransitionEngine:
  def __init__(self, memory: MusicMemory) -> None:
    self._memory = memory

  def maybe_transition(self, ctx: TransitionContext) -> Optional[str]:
    prob = ctx.transition_probability * (0.4 + ctx.energy * 0.4)
    if ctx.section_change:
      prob += 0.35
    if ctx.storm_likelihood > 0.5:
      prob += 0.15
    if ctx.gust:
      prob += 0.12
    if random.random() > clamp(prob):
      return None

    choices = [t for t in TRANSITIONS if not self._memory.transition_recent(t)]
    if not choices:
      choices = TRANSITIONS
    fx = random.choice(choices)
    self._memory.remember_transition(fx)
    return fx
