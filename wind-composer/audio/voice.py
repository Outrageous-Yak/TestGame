"""Polyphonic synth voice."""

from __future__ import annotations

import numpy as np

from audio.envelopes import ADSREnvelope
from audio.filters import OnePoleFilter
from audio.oscillators import unison_mix
from audio.preset_manager import InstrumentPreset
from config import SAMPLE_RATE
from utils import midi_to_freq


class SynthVoice:
    __slots__ = (
        "active", "note", "freq", "preset", "phase", "age",
        "env", "filter_l", "rng", "layer", "released",
    )

    def __init__(self, seed: int = 0) -> None:
        self.active = False
        self.note = 0
        self.freq = 220.0
        self.preset: InstrumentPreset | None = None
        self.phase = 0.0
        self.age = 0
        self.env = ADSREnvelope()
        self.filter_l = OnePoleFilter("low", 2000.0)
        self.rng = np.random.default_rng(seed)
        self.layer = ""
        self.released = False

    def start(self, note: int, velocity: float, preset: InstrumentPreset) -> None:
        self.active = True
        self.released = False
        self.note = note
        self.freq = midi_to_freq(note)
        self.preset = preset
        self.phase = 0.0
        self.age = 0
        self.layer = preset.layer
        self.env = ADSREnvelope(
            preset.envelope.attack,
            preset.envelope.decay,
            preset.envelope.sustain,
            preset.envelope.release,
        )
        self.filter_l = OnePoleFilter(preset.filter.mode, preset.filter.cutoff)
        self.env.trigger(velocity)

    def release(self) -> None:
        self.released = True
        self.env.release()

    def is_finished(self) -> bool:
        return self.active and self.released and not self.env.is_active()

    def render(self, n: int, mod_pitch: float = 0.0) -> np.ndarray:
        if not self.active or not self.preset:
            return np.zeros(n)
        p = self.preset
        freq = self.freq * (1.0 + mod_pitch)
        samples, self.phase = unison_mix(
            freq, self.phase, n, p.oscillators, p.detunes, p.levels, self.rng,
        )
        env = self.env.process_block(n)
        self.filter_l.set_cutoff(p.filter.cutoff)
        raw = samples * env * p.gain
        out = self.filter_l.process(raw)
        if self.env.stage == "idle" and self.released:
            self.active = False
        self.age += n
        return out


class VoiceAllocator:
    """Pool of voices with stealing."""

    def __init__(self, max_voices: int = 32) -> None:
        self.voices = [SynthVoice(i * 17 + 3) for i in range(max_voices)]
        self.max_voices = max_voices

    def allocate(self, note: int, velocity: float, preset: InstrumentPreset) -> SynthVoice:
        # Reuse same note
        for v in self.voices:
            if v.active and v.note == note and v.layer == preset.layer:
                v.start(note, velocity, preset)
                return v
        # Free voice
        for v in self.voices:
            if not v.active:
                v.start(note, velocity, preset)
                return v
        # Steal quietest / oldest releasing
        candidates = [v for v in self.voices if v.released or not v.env.is_active()]
        if not candidates:
            candidates = self.voices
        victim = min(candidates, key=lambda x: x.age)
        victim.start(note, velocity, preset)
        return victim

    def release_layer(self, layer: str) -> None:
        for v in self.voices:
            if v.active and v.layer == layer:
                v.release()

    def active_count(self) -> int:
        return sum(1 for v in self.voices if v.active)

    def render_layer(
        self, layer: str, n: int, mod_pitch: float = 0.0,
    ) -> np.ndarray:
        mix = np.zeros(n)
        for v in self.voices:
            if v.active and v.layer == layer:
                mix += v.render(n, mod_pitch)
        return mix
