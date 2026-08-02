"""Song sections and layer arrangement."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, Set

from style_engine import SongSection, StyleProfile
from utils import clamp


@dataclass
class ArrangementState:
    section: SongSection = SongSection.FLOW
    bars_in_section: int = 0
    active_layers: Set[str] = field(default_factory=lambda: {"main_pad", "atmosphere"})
    section_energy: float = 0.5


class ArrangementEngine:
  SECTION_CYCLE = [
    SongSection.INTRO,
    SongSection.BUILD,
    SongSection.DROP,
    SongSection.BREAKDOWN,
    SongSection.RECOVERY,
    SongSection.FLOW,
  ]

  def __init__(self) -> None:
    self._state = ArrangementState()
    self._section_idx = 0

  @property
  def state(self) -> ArrangementState:
    return self._state

  def on_bar(self, measure: int, energy: float, storm: bool) -> SongSection:
    """Advance arrangement once per bar, not every composition tick."""
    if measure <= 0:
      self._state.section_energy = self._section_energy(energy)
      return self._state.section

    self._state.bars_in_section += 1
    if self._state.bars_in_section >= 32 or (storm and self._state.section != SongSection.DROP):
      self._section_idx = (self._section_idx + 1) % len(self.SECTION_CYCLE)
      if storm and random.random() < 0.6:
        self._state.section = SongSection.DROP
      else:
        self._state.section = self.SECTION_CYCLE[self._section_idx]
      self._state.bars_in_section = 0
    self._state.section_energy = self._section_energy(energy)
    self._state.active_layers = self._layers_for_section(self._state.section)
    return self._state.section

  def on_phrase(self, energy: float, storm: bool) -> SongSection:
    """Legacy alias — prefer on_bar with measure index."""
    return self.on_bar(1, energy, storm)

  def layer_gains(self, style: StyleProfile, energy: float) -> Dict[str, float]:
    s = self._state.section
    base = {
      "main_pad": style.pad_layers,
      "soft_bass": style.bass_layers * energy,
      "sub_bass": style.bass_layers * energy * 0.8,
      "lead": style.lead_layers * energy,
      "atmosphere": style.pad_layers * 0.5,
      "percussion": style.drum_density * energy,
    }
    if s == SongSection.INTRO:
      base["lead"] *= 0.3
      base["percussion"] *= 0.2
    elif s == SongSection.BUILD:
      base["percussion"] *= 1.2
      base["lead"] *= 0.7
    elif s == SongSection.DROP:
      base["percussion"] *= 1.4
      base["lead"] *= 1.2
      base["sub_bass"] *= 1.3
    elif s == SongSection.BREAKDOWN:
      base["percussion"] *= 0.15
      base["lead"] *= 0.4
    elif s == SongSection.OUTRO:
      base["percussion"] *= 0.1
      base["lead"] *= 0.2
    return {k: clamp(v) for k, v in base.items()}

  def _section_energy(self, energy: float) -> float:
    s = self._state.section
    if s == SongSection.DROP:
      return clamp(energy + 0.25)
    if s == SongSection.BREAKDOWN:
      return clamp(energy * 0.5)
    if s == SongSection.BUILD:
      return clamp(energy + 0.15)
    return clamp(energy)

  def _layers_for_section(self, section: SongSection) -> Set[str]:
    layers = {"main_pad", "atmosphere"}
    if section in (SongSection.BUILD, SongSection.DROP, SongSection.FLOW):
      layers |= {"soft_bass", "percussion", "lead"}
    if section == SongSection.DROP:
      layers |= {"sub_bass"}
    if section == SongSection.BREAKDOWN:
      layers = {"main_pad", "atmosphere", "choir"}
    return layers
