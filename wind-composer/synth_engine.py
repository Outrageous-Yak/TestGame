"""Synthesizer layers, oscillators, and ADSR envelopes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple

import numpy as np

from config import SAMPLE_RATE
from utils import clamp, midi_to_freq


@dataclass
class ADSR:
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
        self._release_start = self.level

    def release(self) -> None:
        if self.stage != "idle":
            self.stage = "release"
            self._release_start = self.level

    def process_block(self, n: int) -> np.ndarray:
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
                    self.level = self.sustain
            elif self.stage == "sustain":
                pass
            elif self.stage == "release":
                self.level -= self._release_start / max(1, int(self.release * sr))
                if self.level <= 0.0:
                    self.stage = "idle"
                    self.level = 0.0
            out[i] = self.level * getattr(self, "_velocity", 1.0)
        return out


@dataclass
class LayerVoice:
    name: str
    osc_types: Tuple[str, str] = ("sine", "triangle")
    freq: float = 220.0
    target_gain: float = 0.0
    pan: float = 0.0
    active: bool = False
    adsr: ADSR = field(default_factory=ADSR)
    phase1: float = 0.0
    phase2: float = 0.0
    noise_seed: int = 12345
    filter_cutoff: float = 2000.0
    _filter_z: float = 0.0

    def set_frequency(self, freq: float) -> None:
        self.freq = max(20.0, freq)

    def trigger(self, velocity: float = 0.7) -> None:
        self.active = True
        self.adsr.trigger(velocity)

    def render(self, n: int) -> np.ndarray:
        if not self.active and self.adsr.stage == "idle":
            return np.zeros(n)

        env = self.adsr.process_block(n)
        t = np.arange(n) / SAMPLE_RATE
        phase1 = self.phase1 + 2.0 * np.pi * self.freq * t
        phase2 = self.phase2 + 2.0 * np.pi * (self.freq * 1.005) * t

        s1 = self._render_osc(phase1, self.osc_types[0], n)
        s2 = self._render_osc(phase2, self.osc_types[1], n)
        raw = (s1 + s2) * 0.5 * env * self.target_gain

        # One-pole low-pass
        a = 2.0 * np.pi * self.filter_cutoff / SAMPLE_RATE
        alpha = a / (a + 1.0)
        out = np.zeros(n)
        z = self._filter_z
        for i, sample in enumerate(raw):
            z += alpha * (sample - z)
            out[i] = z
        self._filter_z = z

        self.phase1 = float(phase1[-1] % (2.0 * np.pi))
        self.phase2 = float(phase2[-1] % (2.0 * np.pi))

        if self.adsr.stage == "idle":
            self.active = False
        return out

    def _render_osc(self, phases: np.ndarray, kind: str, n: int) -> np.ndarray:
        if kind == "sine":
            return np.sin(phases)
        if kind == "triangle":
            return 2.0 * np.abs(2.0 * (phases / (2 * np.pi) - np.floor(phases / (2 * np.pi) + 0.5))) - 1.0
        if kind == "saw":
            return 2.0 * (phases / (2 * np.pi) - np.floor(phases / (2 * np.pi) + 0.5))
        if kind == "square":
            return np.sign(np.sin(phases))
        # noise
        rng = np.random.default_rng(self.noise_seed)
        return rng.uniform(-1.0, 1.0, n)


class SynthEngine:
    """Four-layer synthesizer: PAD, BASS, LEAD, ATMOSPHERE."""

    LAYERS = ("pad", "bass", "lead", "atmosphere")

    def __init__(self) -> None:
        self.layers: Dict[str, LayerVoice] = {
            "pad": LayerVoice("pad", ("sine", "triangle"), adsr=ADSR(1.2, 0.8, 0.7, 1.5)),
            "bass": LayerVoice("bass", ("triangle", "saw"), adsr=ADSR(0.15, 0.2, 0.5, 0.4)),
            "lead": LayerVoice("lead", ("sine", "saw"), adsr=ADSR(0.05, 0.15, 0.4, 0.3)),
            "atmosphere": LayerVoice("atmosphere", ("noise", "sine"), adsr=ADSR(2.0, 1.0, 0.8, 2.0)),
        }
        self.master_gain = 0.75

    def configure_osc(self, layer: str, osc_pair: Tuple[str, str]) -> None:
        if layer in self.layers:
            self.layers[layer].osc_types = osc_pair

    def set_master_gain(self, gain: float) -> None:
        self.master_gain = clamp(gain)

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

    def sustain_pad(self, midi_notes: List[int], wind_energy: float) -> None:
        pad = self.layers["pad"]
        if midi_notes:
            pad.set_frequency(midi_to_freq(midi_notes[0]))
        pad.target_gain = clamp(0.15 + wind_energy * 0.35)
        if pad.adsr.stage == "idle":
            pad.trigger(0.5 + wind_energy * 0.3)

    def sustain_atmosphere(self, wind_energy: float) -> None:
        atm = self.layers["atmosphere"]
        atm.target_gain = clamp(0.08 + wind_energy * 0.25)
        atm.set_frequency(80.0 + wind_energy * 40.0)
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
