"""Estimate wind probability and master wind energy from signal features."""

from __future__ import annotations

from dataclasses import dataclass

from signal_processing import SignalFeatures
from utils import ExponentialSmoother, clamp


@dataclass
class WindState:
    """Wind detection output."""

    probability: float = 0.0
    energy: float = 0.0
    is_gust: bool = False
    non_wind_dominance: float = 0.0


class WindDetector:
    """
    Estimate wind probability from broadband noise characteristics.

    Wind tends to be broadband, slowly evolving, and weakly harmonic.
  Speech/music/TV show stronger harmonics or impulsive transients.
    """

    def __init__(self, sensitivity: float = 0.6) -> None:
        self.sensitivity = sensitivity
        self._prob_smoother = ExponentialSmoother(0.0, 0.1)
        self._energy_smoother = ExponentialSmoother(0.0, 0.08)
        self._non_wind_smoother = ExponentialSmoother(0.0, 0.15)

    def set_sensitivity(self, value: float) -> None:
        self.sensitivity = clamp(value)

    def analyse(self, feats: SignalFeatures, gust: bool) -> WindState:
        # Wind-like: high flatness, moderate bandwidth, low harmonic ratio
        flat_score = clamp(feats.spectral_flatness * 1.4)
        broadband = clamp(feats.spectral_bandwidth / 2500.0)
        low_harmonic = clamp(1.0 - feats.harmonic_ratio * 2.5)

        # Slow energy movement (not impulsive)
        energy_delta = abs(feats.short_energy - feats.long_energy)
        slow_motion = clamp(1.0 - energy_delta * 8.0)

        wind_score = (flat_score * 0.35 + broadband * 0.2 + low_harmonic * 0.3 + slow_motion * 0.15)

        # Non-wind dominance detectors
        speech_like = clamp(feats.harmonic_ratio * 2.0) * clamp(feats.spectral_centroid / 2000.0)
        music_like = clamp(feats.harmonic_ratio * 3.0 - 0.5)
        transient = clamp(feats.peak - feats.rms * 4.0) * clamp(feats.zero_crossing_rate * 3.0)
        non_wind = clamp(max(speech_like, music_like, transient))

        prob = self._prob_smoother.update(wind_score * (1.0 - non_wind * 0.85))

        # Raw energy from RMS scaled by sensitivity
        sens = max(0.15, self.sensitivity)
        raw_energy = clamp(feats.rms * 12.0 * sens)
        energy = self._energy_smoother.update(raw_energy * prob)

        non_wind_dom = self._non_wind_smoother.update(non_wind)

        # Reduce musical influence when non-wind dominates
        influence = energy * (1.0 - non_wind_dom * 0.75)

        return WindState(
            probability=prob,
            energy=influence,
            is_gust=gust,
            non_wind_dominance=non_wind_dom,
        )

    def reset(self) -> None:
        self._prob_smoother.reset(0.0)
        self._energy_smoother.reset(0.0)
        self._non_wind_smoother.reset(0.0)
