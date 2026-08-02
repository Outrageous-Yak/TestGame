"""Expressive lead melody with motifs and call-response."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional

from melody_engine import MelodyNote
from music_memory import MusicMemory
from scale_engine import ScaleEngine
from style_engine import StyleProfile
from utils import clamp


@dataclass
class LeadContext:
    chord_tones: List[int]
    energy: float
    hope: float
    bar: int
    gust: bool
    style: StyleProfile


class LeadEngine:
  def __init__(self, scale: ScaleEngine, memory: MusicMemory) -> None:
    self._scale = scale
    self._memory = memory
    self._motif: List[int] = []
    self._phrase_phase = 0

  def maybe_notes(self, ctx: LeadContext) -> List[MelodyNote]:
    activity = ctx.style.lead_activity * (0.4 + ctx.energy * 0.6) * ctx.hope
    if random.random() > activity * 0.35 + 0.05:
      return []

    if not ctx.chord_tones:
      return []

    if ctx.gust or random.random() < 0.15:
      return self._flourish(ctx)

    if self._phrase_phase == 0 or random.random() < 0.3:
      self._motif = self._build_motif(ctx)
      self._phrase_phase = 1
      motif_tuple = tuple(self._motif)
      if not self._memory.motif_overused(motif_tuple):
        self._memory.remember_motif(motif_tuple)
      else:
        self._motif = [ctx.chord_tones[random.randint(0, len(ctx.chord_tones) - 1)]]

    midi = self._motif[0]
    self._motif = self._motif[1:] + [midi]
    vel = clamp(0.3 + activity * 0.5)
    return [MelodyNote(midi=midi, velocity=vel, duration_sec=0.6 + random.uniform(0, 0.4))]

  def _build_motif(self, ctx: LeadContext) -> List[int]:
    tones = ctx.chord_tones
    motif = [random.choice(tones)]
    for _ in range(random.randint(2, 4)):
      step = random.choice([-2, -1, 1, 2])
      motif.append(self._scale.step_note(motif[-1], step, False))
    return motif

  def _flourish(self, ctx: LeadContext) -> List[MelodyNote]:
    top = max(ctx.chord_tones)
    return [MelodyNote(midi=top, velocity=0.75, duration_sec=0.35)]
