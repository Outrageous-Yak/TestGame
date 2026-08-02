"""Oscillator waveform generation."""

from __future__ import annotations

import numpy as np

from config import SAMPLE_RATE


def polyblep_saw(phase: np.ndarray, phase_inc: float) -> np.ndarray:
    """Band-limited saw approximation via polyBLEP."""
    t = phase / (2.0 * np.pi)
    saw = 2.0 * (t - np.floor(t + 0.5))
    # Simple softening for prototype
    return np.tanh(saw * 0.85)


def render_osc(
    phases: np.ndarray,
    kind: str,
    n: int,
    pulse_width: float = 0.5,
    rng: np.random.Generator | None = None,
) -> np.ndarray:
    if kind == "sine":
        return np.sin(phases)
    if kind == "triangle":
        return 2.0 * np.abs(2.0 * (phases / (2 * np.pi) - np.floor(phases / (2 * np.pi) + 0.5))) - 1.0
    if kind == "saw":
        return polyblep_saw(phases, 2.0 * np.pi * 220.0 / SAMPLE_RATE)
    if kind == "square":
        return np.sign(np.sin(phases))
    if kind == "pulse":
        return np.where(np.sin(phases) > (pulse_width * 2 - 1), 1.0, -1.0)
    if kind == "pink_noise" or kind == "noise":
        gen = rng if rng is not None else np.random.default_rng(42)
        white = gen.standard_normal(n)
        if kind == "pink_noise":
            # lightweight 1-pole pink approximation
            out = np.zeros(n)
            b = 0.0
            for i, w in enumerate(white):
                b = 0.98 * b + 0.02 * w
                out[i] = b
            return out * 2.5
        return white
    return np.sin(phases)


def unison_mix(
    freq: float,
    phase_base: float,
    n: int,
    kinds: list[str],
    detunes: list[float],
    levels: list[float],
    rng: np.random.Generator,
) -> tuple[np.ndarray, float]:
    """Render detuned oscillator group; returns samples and final phase."""
    mix = np.zeros(n, dtype=np.float64)
    t = np.arange(n) / SAMPLE_RATE
    last_phase = phase_base
    total = sum(levels) + 1e-9
    for kind, det, lvl in zip(kinds, detunes, levels):
        f = freq * (1.0 + det)
        phases = phase_base + 2.0 * np.pi * f * t
        mix += render_osc(phases, kind, n, rng=rng) * (lvl / total)
        last_phase = float(phases[-1] % (2.0 * np.pi))
    return mix, last_phase
