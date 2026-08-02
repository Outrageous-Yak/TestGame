"""Audio effects: reverb, delay, filters, chorus, stereo width."""

from __future__ import annotations

import numpy as np

from config import SAMPLE_RATE
from utils import clamp


class BiquadFilter:
    """Simple one-pole low/high pass for efficiency."""

    def __init__(self, mode: str = "low", cutoff: float = 1000.0) -> None:
        self.mode = mode
        self.cutoff = cutoff
        self._z = 0.0
        self._alpha = 0.0
        self._update_alpha()

    def set_cutoff(self, cutoff: float) -> None:
        self.cutoff = max(20.0, cutoff)
        self._update_alpha()

    def _update_alpha(self) -> None:
        rc = 1.0 / (2.0 * np.pi * self.cutoff)
        dt = 1.0 / SAMPLE_RATE
        self._alpha = dt / (rc + dt)

    def process(self, x: np.ndarray) -> np.ndarray:
        out = np.empty_like(x)
        z = self._z
        a = self._alpha
        if self.mode == "low":
            for i, sample in enumerate(x):
                z = z + a * (sample - z)
                out[i] = z
        else:
            for i, sample in enumerate(x):
                z = z + a * (sample - z)
                out[i] = sample - z
        self._z = z
        return out


class DelayLine:
    def __init__(self, delay_sec: float = 0.35, mix: float = 0.2) -> None:
        self.max_samples = int(SAMPLE_RATE * 2.0)
        self.buffer = np.zeros(self.max_samples)
        self.pos = 0
        self.delay_samples = int(delay_sec * SAMPLE_RATE)
        self.mix = mix
        self.feedback = 0.35

    def set_mix(self, mix: float) -> None:
        self.mix = clamp(mix)

    def process(self, x: np.ndarray) -> np.ndarray:
        out = np.empty_like(x)
        for i, sample in enumerate(x):
            read_pos = (self.pos - self.delay_samples) % self.max_samples
            delayed = self.buffer[read_pos]
            out[i] = sample + delayed * self.mix
            self.buffer[self.pos] = sample + delayed * self.feedback
            self.pos = (self.pos + 1) % self.max_samples
        return out


class SimpleReverb:
    """Lightweight comb-filter reverb."""

    def __init__(self, mix: float = 0.4) -> None:
        self.mix = mix
        self.comb_delays = [1557, 1617, 1733, 1823]
        self.comb_bufs = [np.zeros(d) for d in self.comb_delays]
        self.comb_pos = [0] * len(self.comb_delays)
        self.feedback = 0.72

    def set_mix(self, mix: float) -> None:
        self.mix = clamp(mix)

    def process(self, x: np.ndarray) -> np.ndarray:
        wet = np.zeros_like(x)
        for ci, delay in enumerate(self.comb_delays):
            buf = self.comb_bufs[ci]
            pos = self.comb_pos[ci]
            for i, sample in enumerate(x):
                delayed = buf[pos]
                wet[i] += delayed
                buf[pos] = sample + delayed * self.feedback
                pos = (pos + 1) % delay
            self.comb_pos[ci] = pos
        wet /= len(self.comb_delays)
        return x * (1.0 - self.mix) + wet * self.mix


class Chorus:
    def __init__(self, mix: float = 0.12) -> None:
        self.mix = mix
        self.buffer = np.zeros(int(SAMPLE_RATE * 0.05))
        self.pos = 0
        self.phase = 0.0

    def set_mix(self, mix: float) -> None:
        self.mix = clamp(mix)

    def process(self, x: np.ndarray) -> np.ndarray:
        out = np.empty_like(x)
        rate = 0.8
        depth = int(SAMPLE_RATE * 0.002)
        buflen = len(self.buffer)
        for i, sample in enumerate(x):
            self.buffer[self.pos] = sample
            offset = int(depth * (0.5 + 0.5 * np.sin(self.phase)))
            read = (self.pos - offset) % buflen
            mod = self.buffer[read]
            out[i] = sample * (1.0 - self.mix) + mod * self.mix
            self.pos = (self.pos + 1) % buflen
            self.phase += 2.0 * np.pi * rate / SAMPLE_RATE
        return out


class EffectsChain:
    """Master effects controlled by wind strength."""

    def __init__(self) -> None:
        self.hp = BiquadFilter("high", 80.0)
        self.lp = BiquadFilter("low", 2000.0)
        self.delay = DelayLine(0.38, 0.15)
        self.reverb = SimpleReverb(0.4)
        self.chorus = Chorus(0.12)
        self.stereo_width = 0.35

    def configure(self, profile_mix: tuple[float, float, float], lp_base: float, hp_cut: float) -> None:
        self.reverb.set_mix(profile_mix[0])
        self.delay.set_mix(profile_mix[1])
        self.chorus.set_mix(profile_mix[2])
        self.hp.set_cutoff(hp_cut)
        self.lp.set_cutoff(lp_base)

    def set_wind_modulation(self, wind_energy: float, gust: bool) -> None:
        brightness = wind_energy + (0.25 if gust else 0.0)
        self.lp.set_cutoff(400.0 + brightness * 6000.0)
        self.reverb.set_mix(clamp(self.reverb.mix + wind_energy * 0.15 + (0.12 if gust else 0.0)))

    def process_mono_to_stereo(self, mono: np.ndarray) -> np.ndarray:
        x = self.hp.process(mono)
        x = self.lp.process(x)
        x = self.chorus.process(x)
        x = self.delay.process(x)
        x = self.reverb.process(x)

        width = self.stereo_width
        # Haas-effect stereo widening
        delay_samples = int(SAMPLE_RATE * 0.012)
        right = np.copy(x)
        if delay_samples < len(x):
            right[delay_samples:] = x[:-delay_samples]
            right[:delay_samples] = x[:delay_samples]
        left = x * (1.0 - width * 0.15)
        right = right * (1.0 + width * 0.15)

        stereo = np.column_stack([left, right])
        peak = np.max(np.abs(stereo)) + 1e-9
        if peak > 1.0:
            stereo /= peak
        return stereo.astype(np.float32)
