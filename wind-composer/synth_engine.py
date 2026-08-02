"""Main synthesis coordination — cinematic engine with legacy fallback."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

from audio.cinematic_engine import CinematicSynthEngine
from audio.orchestration import Orchestrator
from audio.preset_manager import PresetManager
from utils import clamp, midi_to_freq

logger = logging.getLogger(__name__)

# --- Legacy monophonic layer synth (fallback) ---

from dataclasses import dataclass, field  # noqa: E402


@dataclass
class _ADSR:
    attack: float = 0.4
    decay: float = 0.3
    sustain: float = 0.6
    release: float = 0.8
    stage: str = "idle"
    level: float = 0.0
    _release_start: float = 0.0

    def trigger(self, velocity: float = 1.0) -> None:
        self.stage = "attack"
        self._velocity = velocity

    def release(self) -> None:
        if self.stage != "idle":
            self.stage = "release"
            self._release_start = self.level

    def process_block(self, n: int) -> np.ndarray:
        from config import SAMPLE_RATE
        out = np.zeros(n)
        sr = SAMPLE_RATE
        for i in range(n):
            if self.stage == "attack":
                self.level += 1.0 / max(1, int(self.attack * sr))
                if self.level >= 1.0:
                    self.stage = "decay"
                    self.level = 1.0
            elif self.stage == "decay":
                self.level -= (1.0 - self.sustain) / max(1, int(self.decay * sr))
                if self.level <= self.sustain:
                    self.stage = "sustain"
            elif self.stage == "release":
                self.level -= self._release_start / max(1, int(self.release * sr))
                if self.level <= 0.0:
                    self.stage = "idle"
            out[i] = self.level * getattr(self, "_velocity", 1.0)
        return out


class _LegacyLayer:
    def __init__(self, osc_pair: Tuple[str, str], adsr: _ADSR) -> None:
        self.osc_types = osc_pair
        self.adsr = adsr
        self.freq = 220.0
        self.target_gain = 0.0
        self.phase1 = 0.0
        self.phase2 = 0.0
        self.filter_cutoff = 2000.0
        self._filter_z = 0.0
        self.active = False

    def set_frequency(self, freq: float) -> None:
        self.freq = max(20.0, freq)

    def trigger(self, velocity: float = 0.7) -> None:
        self.active = True
        self.adsr.trigger(velocity)

    def render(self, n: int) -> np.ndarray:
        from config import SAMPLE_RATE
        if not self.active and self.adsr.stage == "idle":
            return np.zeros(n)
        env = self.adsr.process_block(n)
        t = np.arange(n) / SAMPLE_RATE
        p1 = self.phase1 + 2.0 * np.pi * self.freq * t
        p2 = self.phase2 + 2.0 * np.pi * (self.freq * 1.005) * t
        s1 = np.sin(p1)
        s2 = np.sin(p2)
        raw = (s1 + s2) * 0.5 * env * self.target_gain
        a = 2.0 * np.pi * self.filter_cutoff / SAMPLE_RATE
        alpha = a / (a + 1.0)
        out = np.zeros(n)
        z = self._filter_z
        for i, sample in enumerate(raw):
            z += alpha * (sample - z)
            out[i] = z
        self._filter_z = z
        self.phase1 = float(p1[-1] % (2.0 * np.pi))
        self.phase2 = float(p2[-1] % (2.0 * np.pi))
        return out


class _LegacySynth:
    LAYERS = ("pad", "bass", "lead", "atmosphere")

    def __init__(self) -> None:
        self.layers: Dict[str, _LegacyLayer] = {
            "pad": _LegacyLayer(("sine", "triangle"), _ADSR(1.2, 0.8, 0.7, 1.5)),
            "bass": _LegacyLayer(("triangle", "saw"), _ADSR(0.15, 0.2, 0.5, 0.4)),
            "lead": _LegacyLayer(("sine", "saw"), _ADSR(0.05, 0.15, 0.4, 0.3)),
            "atmosphere": _LegacyLayer(("noise", "sine"), _ADSR(2.0, 1.0, 0.8, 2.0)),
        }
        self.master_gain = 0.75

    def configure_osc(self, layer: str, osc_pair: Tuple[str, str]) -> None:
        if layer in self.layers:
            self.layers[layer].osc_types = osc_pair

    def set_master_gain(self, g: float) -> None:
        self.master_gain = clamp(g)

    def set_layer_gain(self, layer: str, gain: float) -> None:
        if layer in self.layers:
            self.layers[layer].target_gain = clamp(gain)

    def set_layer_frequency(self, layer: str, midi: int) -> None:
        if layer in self.layers:
            self.layers[layer].set_frequency(midi_to_freq(midi))

    def set_filter_cutoff(self, layer: str, cutoff: float) -> None:
        if layer in self.layers:
            self.layers[layer].filter_cutoff = cutoff

    def trigger_layer(self, layer: str, velocity: float = 0.6) -> None:
        if layer in self.layers:
            self.layers[layer].trigger(velocity)

    def sustain_pad(self, midi_notes: List[int], energy: float) -> None:
        pad = self.layers["pad"]
        if midi_notes:
            pad.set_frequency(midi_to_freq(midi_notes[0]))
        pad.target_gain = clamp(0.15 + energy * 0.35)
        if pad.adsr.stage == "idle":
            pad.trigger(0.5 + energy * 0.3)

    def sustain_atmosphere(self, energy: float) -> None:
        atm = self.layers["atmosphere"]
        atm.target_gain = clamp(0.08 + energy * 0.25)
        atm.set_frequency(80.0 + energy * 40.0)
        if atm.adsr.stage == "idle":
            atm.trigger(0.4)

    def render(self, n: int) -> np.ndarray:
        mix = np.zeros(n)
        for voice in self.layers.values():
            mix += voice.render(n)
        mix *= self.master_gain
        peak = np.max(np.abs(mix)) + 1e-9
        if peak > 1.0:
            mix /= peak
        return mix.astype(np.float32)


class SynthEngine:
    """
    Coordinates cinematic polyphonic engine with legacy fallback.

    Interprets CompositionPlan via orchestration — does not compose independently.
    """

    LAYERS = _LegacySynth.LAYERS

    def __init__(self) -> None:
        self._cinematic = CinematicSynthEngine()
        self._legacy = _LegacySynth()
        self._use_cinematic = True
        self.layers = self._legacy.layers  # backward compat for music_engine refs

    @property
    def use_cinematic(self) -> bool:
        return self._use_cinematic

    @property
    def cinematic(self) -> CinematicSynthEngine:
        return self._cinematic

    def set_use_cinematic(self, enabled: bool) -> None:
        self._use_cinematic = enabled

    def configure_osc(self, layer: str, osc_pair: Tuple[str, str]) -> None:
        self._legacy.configure_osc(layer, osc_pair)

    def set_master_gain(self, gain: float) -> None:
        self._legacy.set_master_gain(gain)
        self._cinematic.set_master_gain(gain)

    def set_layer_gain(self, layer: str, gain: float) -> None:
        self._legacy.set_layer_gain(layer, gain)

    def set_layer_frequency(self, layer: str, midi: int) -> None:
        self._legacy.set_layer_frequency(layer, midi)

    def set_filter_cutoff(self, layer: str, cutoff: float) -> None:
        self._legacy.set_filter_cutoff(layer, cutoff)

    def trigger_layer(self, layer: str, velocity: float = 0.6) -> None:
        if self._use_cinematic:
            layer_map = {
                "bass": "soft_bass",
                "pad": "main_pad",
                "lead": "lead",
                "atmosphere": "atmosphere",
            }
            cl = layer_map.get(layer, layer)
            if cl in ("soft_bass", "sub_bass", "percussion") or layer == "bass":
                self._cinematic.trigger_perc(velocity)
            else:
                self._cinematic.note_on(cl, 60, velocity, "Soft Pulse")
        self._legacy.trigger_layer(layer, velocity)

    def trigger_rhythm(self, layer: str, strength: float) -> None:
        """Composition-scheduled percussion pulse."""
        if self._use_cinematic:
            self._cinematic.trigger_perc(strength)
        else:
            mapped = "bass" if layer in ("bass", "pad", "lead") else layer
            self._legacy.trigger_layer(mapped, strength)

    def sustain_pad(self, midi_notes: List[int], energy: float) -> None:
        if self._use_cinematic and midi_notes:
            self._cinematic.sustain_chord(
                "main_pad", midi_notes, 0.4 + energy * 0.35, "Warm Horizon",
            )
        self._legacy.sustain_pad(midi_notes, energy)

    def sustain_atmosphere(self, energy: float) -> None:
        if self._use_cinematic:
            self._cinematic.sustain_chord(
                "atmosphere", [36], 0.25 + energy * 0.2, "Wind Haze",
            )
        self._legacy.sustain_atmosphere(energy)

    def apply_composition_plan(self, plan, orchestrator: Optional[Orchestrator] = None) -> None:
        """Translate CompositionPlan into orchestration targets."""
        if not self._use_cinematic:
            return
        orch = orchestrator or self._cinematic.orchestrator
        targets = orch.map_plan(plan)
        self._cinematic.apply_orchestration(targets, plan.tempo_bpm)

        if plan.chord and plan.chord.tones:
            main_gain = targets.layer_gains.get("main_pad", 0.35 + plan.energy_curve * 0.4)
            self._cinematic.sustain_chord(
                "main_pad",
                plan.chord.tones,
                main_gain,
                targets.layer_presets.get("main_pad", "Warm Horizon"),
            )
            if targets.layer_gains.get("secondary_pad", 0) > 0.05:
                self._cinematic.sustain_chord(
                    "secondary_pad",
                    plan.chord.tones,
                    targets.layer_gains["secondary_pad"],
                    targets.layer_presets.get("secondary_pad", "Soft Aurora"),
                )
            if targets.layer_gains.get("choir", 0) > 0.05:
                self._cinematic.sustain_chord(
                    "choir",
                    plan.chord.tones,
                    targets.layer_gains["choir"],
                    targets.layer_presets.get("choir", "Distant Choir"),
                )
            bass_layer = (
                "sub_bass"
                if targets.layer_gains.get("sub_bass", 0) > targets.layer_gains.get("soft_bass", 0)
                else "soft_bass"
            )
            if targets.layer_gains.get(bass_layer, 0) > 0.05:
                bass_midi = plan.chord.tones[0] - 12
                self._cinematic.sustain_chord(
                    bass_layer,
                    [bass_midi],
                    targets.layer_gains[bass_layer],
                    targets.layer_presets.get(bass_layer, "Sub Foundation"),
                )

        if targets.layer_gains.get("atmosphere", 0) > 0.05:
            self._cinematic.sustain_chord(
                "atmosphere",
                [36],
                targets.layer_gains["atmosphere"],
                targets.layer_presets.get("atmosphere", "Wind Haze"),
            )

        if targets.layer_gains.get("noise_atmo", 0) > 0.05:
            self._cinematic.sustain_chord(
                "noise_atmo",
                [40],
                targets.layer_gains["noise_atmo"],
                targets.layer_presets.get("noise_atmo", "Electrical Storm"),
            )

        for note in plan.melody_notes:
            layer = "bell" if targets.layer_gains.get("bell", 0) > targets.layer_gains.get("lead", 0) else "lead"
            preset = targets.layer_presets.get(layer, "Soft Pulse")
            self._cinematic.note_on(layer, note.midi, note.velocity, preset)

        if plan.gust_accent and plan.chord and plan.chord.tones:
            self._cinematic.note_on("lead", plan.chord.tones[-1], 0.75, "Glass Bell")

    def render(self, n: int) -> np.ndarray:
        if self._use_cinematic:
            return self._cinematic.render(n)
        return self._legacy.render(n)
