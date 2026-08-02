"""Phase 5 intelligent electronic composer — orchestrates style, weather, engines."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from arrangement_engine import ArrangementEngine
from bass_engine import BassContext, BassEngine
from composition_engine import CompositionContext, CompositionPlan
from drum_engine import DrumContext, DrumEngine
from fill_engine import FillContext, FillEngine
from lead_engine import LeadContext, LeadEngine
from melody_engine import MelodyNote
from music_memory import MusicMemory
from probability_engine import beat_micro_decision, gust_action_weights, pick_gust_action
from rhythm_engine import RhythmEvent
from scale_engine import ScaleEngine
from style_engine import MusicalStyle, SongSection, get_style, style_bpm_range
from tempo_engine import TempoEngine, wind_to_target_bpm
from transition_engine import TransitionContext, TransitionEngine
from weather_memory import WeatherMemory, WeatherTrend
from weather.models import WeatherSnapshot
from utils import clamp


@dataclass
class WeatherChangeNotice:
    lines: List[str] = field(default_factory=list)
    musical_hints: List[str] = field(default_factory=list)
    timestamp: float = 0.0


class IntelligentComposer:
  """Extends composition plans with style-aware electronic arrangement."""

  def __init__(self, scale_engine: ScaleEngine) -> None:
    self._scale = scale_engine
    self._memory = MusicMemory()
    self._weather_memory = WeatherMemory(20)
    self._arrangement = ArrangementEngine()
    self._bass = BassEngine(self._memory)
    self._drums = DrumEngine()
    self._lead = LeadEngine(scale_engine, self._memory)
    self._fills = FillEngine(self._memory)
    self._transitions = TransitionEngine(self._memory)
    self._style_name = MusicalStyle.AMBIENT.value
    self._tempo = TempoEngine()
    self._last_notice: Optional[WeatherChangeNotice] = None
    self._local_time_str = ""
    self._rng = random.Random()

  @property
  def style_name(self) -> str:
    return self._style_name

  def set_style(self, name: str) -> None:
    self._style_name = name
    style = get_style(name)
    self._tempo.reset((style.bpm_min + style.bpm_max) / 2.0)

  def get_last_weather_notice(self) -> Optional[WeatherChangeNotice]:
    return self._last_notice

  def on_weather_updated(
    self,
    snap: WeatherSnapshot,
    local_time_str: str,
  ) -> Optional[WeatherChangeNotice]:
    prev = self._weather_memory.push(snap)
    self._local_time_str = local_time_str
    if prev is None:
      return None
    lines = self._weather_memory.change_summary(prev, snap)
    if not lines:
      return None
    trend = self._weather_memory.trend()
    hints: List[str] = ["New Phrase Generated"]
    if trend.storm_likelihood > 0.5:
      hints.append("Fill Probability Increased")
    if trend.accelerating_wind:
      hints.append("Bass Variation Added")
    if trend.pressure_delta < -2:
      hints.append("Tension Building")
    if abs(snap.wind_speed_kmh - prev.wind_speed_kmh) > 5:
      e_delta = (snap.wind_speed_kmh - prev.wind_speed_kmh) / 40.0
      hints.append(f"Energy {e_delta:+.0%}")
    notice = WeatherChangeNotice(lines=lines, musical_hints=hints, timestamp=datetime.now().timestamp())
    self._last_notice = notice
    return notice

  def enhance(
    self,
    ctx: CompositionContext,
    plan: CompositionPlan,
    beat: int,
    measure: int,
    personality_hope: float,
  ) -> CompositionPlan:
    style = get_style(self._style_name)
    bpm_min, bpm_max = style.bpm_min, style.bpm_max
    plan.musical_style = self._style_name

    trend = self._weather_memory.trend()
    w = ctx.weather

    wind_kmh = w.wind_speed_kmh if w else 0.0
    if w:
      wind_kmh = trend.avg_wind_kmh if hasattr(trend, "avg_wind_kmh") else w.wind_speed_kmh
      if hasattr(trend, "wind_delta"):
        wind_kmh += trend.wind_delta * 0.2

    target_bpm = wind_to_target_bpm(
      wind_kmh,
      bpm_min,
      bpm_max,
      trend.wind_delta,
      trend.storm_likelihood,
    )
    plan.tempo_bpm = self._tempo.update(
      target_bpm,
      bpm_min,
      bpm_max,
      measure,
      ctx.gust,
    )

    section = self._arrangement.on_phrase(plan.energy_curve, trend.storm_likelihood > 0.5)
    plan.song_section = section.value
    plan.local_time_str = self._local_time_str

    layer_gains = self._arrangement.layer_gains(style, plan.energy_curve)
    plan.active_instruments = self._arrangement.state.active_layers

    extra_rhythm: List[RhythmEvent] = list(plan.rhythm_events)
    extra_melody: List[MelodyNote] = list(plan.melody_notes)

    # Beat-level drums and micro evolution
    if beat >= 0:
      drum_ctx = DrumContext(
        beat=beat,
        bar=measure,
        energy=plan.energy_curve,
        precipitation=w.precipitation_mm if w else 0,
        snowfall=w.snowfall_mm if w else 0,
        style=style,
        section_energy=self._arrangement.state.section_energy,
      )
      extra_rhythm.extend(self._drums.on_beat(drum_ctx))
      micro = beat_micro_decision(plan.energy_curve, self._rng)
      if micro == "hat_ghost":
        extra_rhythm.append(RhythmEvent("hat", 0.15, False))

    # Bar-level bass and fills
    if measure > 0 and beat % 4 == 0:
      tones = plan.chord.tones if plan.chord else []
      bass_ctx = BassContext(
        chord_tones=tones,
        energy=plan.energy_curve,
        wind_direction=w.wind_direction_deg if w else 0,
        pressure_trend=trend.pressure_delta,
        bar_in_phrase=measure,
        style=style,
      )
      extra_melody.extend(self._bass.on_bar(bass_ctx))

      fill_ctx = FillContext(
        bar=measure,
        phrase_length=plan.phrase_length_bars,
        energy=plan.energy_curve,
        storm_likelihood=trend.storm_likelihood,
        fill_probability=style.fill_probability,
      )
      extra_rhythm.extend(self._fills.maybe_fill(fill_ctx))

    # Lead flourishes
    if plan.chord and plan.chord.tones:
      lead_ctx = LeadContext(
        chord_tones=plan.chord.tones,
        energy=plan.energy_curve,
        hope=personality_hope,
        bar=measure,
        gust=ctx.gust,
        style=style,
      )
      extra_melody.extend(self._lead.maybe_notes(lead_ctx))

    # Gust-weighted actions
    if ctx.gust and w:
      gust_delta = w.wind_gust_kmh - w.wind_speed_kmh
      weights = gust_action_weights(w.wind_speed_kmh, gust_delta, plan.energy_curve)
      action = pick_gust_action(weights, self._rng)
      if action == "fill":
        extra_rhythm.append(RhythmEvent("percussion", 0.7, True))
      elif action == "lead_flourish" and plan.chord:
        extra_melody.append(MelodyNote(midi=plan.chord.tones[-1], velocity=0.8, duration_sec=0.4))
      elif action == "crash":
        extra_rhythm.append(RhythmEvent("percussion", 0.85, True))
      plan.weather_hints.append(f"Gust: {action}")

    # Transitions on section boundaries
    trans_ctx = TransitionContext(
      energy=plan.energy_curve,
      storm_likelihood=trend.storm_likelihood,
      section_change=self._arrangement.state.bars_in_section == 0,
      transition_probability=style.transition_probability,
      gust=ctx.gust,
    )
    fx = self._transitions.maybe_transition(trans_ctx)
    if fx:
      plan.transition_fx = fx
      if fx in ("crash", "impact", "reverse_crash"):
        extra_rhythm.append(RhythmEvent("percussion", 0.75, True))

    # Weather modifiers on harmony density
    if w:
      if w.snowfall_mm > 0.1:
        plan.atmosphere_gain = clamp(plan.atmosphere_gain + 0.15)
        plan.lead_gain *= 0.6
      if w.precipitation_mm > 0.5:
        plan.percussion = max(plan.percussion, w.precipitation_mm / 8)
      if w.humidity_pct > 70:
        plan.reverb_amount = clamp(plan.reverb_amount + 0.12)
      if w.cloud_cover_pct > 80:
        plan.pad_gain = clamp(plan.pad_gain + 0.1)
      if w.temperature_c < 5:
        plan.brightness = clamp(plan.brightness * 0.85)
      if w.temperature_c > 25:
        plan.brightness = clamp(plan.brightness + 0.1)

    plan.rhythm_events = extra_rhythm
    plan.melody_notes = extra_melody[:6]
    plan.drum_events = [e for e in extra_rhythm if e.layer in ("kick", "snare", "hat", "percussion")]
    plan.bass_notes = [n for n in extra_melody if n.midi < 52]

    # Store hints for UI
    if trend.storm_likelihood > 0.4:
      plan.weather_hints.append("Storm tension")
    if trend.calm_trend:
      plan.weather_hints.append("Calming trend")

    return plan

  def reset(self) -> None:
    self._memory.reset()
    self._arrangement = ArrangementEngine()
