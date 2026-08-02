"""Real-time signal feature extraction."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.fft import rfft, rfftfreq

from config import BLOCK_SIZE, SAMPLE_RATE
from utils import ExponentialSmoother, clamp, safe_divide


@dataclass
class SignalFeatures:
    """Smoothed analysis features for one analysis frame."""

    rms: float = 0.0
    peak: float = 0.0
    dominant_freq: float = 0.0
    spectral_centroid: float = 0.0
    spectral_rolloff: float = 0.0
    spectral_bandwidth: float = 0.0
    noise_floor: float = 0.0
    zero_crossing_rate: float = 0.0
    short_energy: float = 0.0
    long_energy: float = 0.0
    spectral_flatness: float = 0.0
    harmonic_ratio: float = 0.0
    fft_magnitudes: np.ndarray = field(default_factory=lambda: np.zeros(BLOCK_SIZE // 2 + 1))


class SignalProcessor:
    """Compute and smooth microphone analysis features."""

    def __init__(self) -> None:
        self._smoothers = {name: ExponentialSmoother(0.0, 0.12) for name in [
            "rms", "peak", "dom_freq", "centroid", "rolloff", "bandwidth",
            "noise_floor", "zcr", "short_e", "long_e", "flatness", "harmonic",
        ]}
        self._last_fft = np.zeros(BLOCK_SIZE // 2 + 1)
        self._waveform = np.zeros(BLOCK_SIZE)

    @property
    def waveform(self) -> np.ndarray:
        return self._waveform.copy()

    @property
    def fft_magnitudes(self) -> np.ndarray:
        return self._last_fft.copy()

    def process(self, block: np.ndarray) -> SignalFeatures:
        x = block.astype(np.float64)
        if x.ndim > 1:
            x = x[:, 0]
        n = len(x)
        self._waveform = x.copy()

        rms = float(np.sqrt(np.mean(x * x)))
        peak = float(np.max(np.abs(x)))
        zcr = float(np.sum(np.abs(np.diff(np.signbit(x)))) / max(n - 1, 1))

        spectrum = rfft(x)
        magnitudes = np.abs(spectrum)
        freqs = rfftfreq(n, 1.0 / SAMPLE_RATE)
        power = magnitudes ** 2
        total_power = float(np.sum(power)) + 1e-12

        if total_power > 1e-12:
            centroid = float(np.sum(freqs * power) / total_power)
            cum = np.cumsum(power)
            rolloff_idx = int(np.searchsorted(cum, 0.85 * cum[-1]))
            rolloff = float(freqs[min(rolloff_idx, len(freqs) - 1)])
            bandwidth = float(np.sqrt(np.sum(((freqs - centroid) ** 2) * power) / total_power))
            dom_idx = int(np.argmax(magnitudes[1:]) + 1) if len(magnitudes) > 1 else 0
            dom_freq = float(freqs[dom_idx])
        else:
            centroid = rolloff = bandwidth = dom_freq = 0.0

        geo_mean = float(np.exp(np.mean(np.log(magnitudes + 1e-12))))
        arith_mean = float(np.mean(magnitudes)) + 1e-12
        flatness = clamp(geo_mean / arith_mean)

        # Harmonic energy ratio: peaks vs broadband
        harmonic_ratio = self._estimate_harmonic_ratio(magnitudes, freqs, dom_freq)

        noise_floor = float(np.percentile(magnitudes, 15))
        short_e = rms
        long_alpha = 0.02
        long_e = self._smoothers["long_e"].value + long_alpha * (short_e - self._smoothers["long_e"].value)

        self._last_fft = magnitudes / (np.max(magnitudes) + 1e-12)

        feats = SignalFeatures(
            rms=self._smoothers["rms"].update(rms),
            peak=self._smoothers["peak"].update(peak),
            dominant_freq=self._smoothers["dom_freq"].update(dom_freq),
            spectral_centroid=self._smoothers["centroid"].update(centroid),
            spectral_rolloff=self._smoothers["rolloff"].update(rolloff),
            spectral_bandwidth=self._smoothers["bandwidth"].update(bandwidth),
            noise_floor=self._smoothers["noise_floor"].update(noise_floor),
            zero_crossing_rate=self._smoothers["zcr"].update(zcr),
            short_energy=self._smoothers["short_e"].update(short_e),
            long_energy=self._smoothers["long_e"].update(long_e),
            spectral_flatness=self._smoothers["flatness"].update(flatness),
            harmonic_ratio=self._smoothers["harmonic"].update(harmonic_ratio),
            fft_magnitudes=self._last_fft.copy(),
        )
        return feats

    def _estimate_harmonic_ratio(
        self, magnitudes: np.ndarray, freqs: np.ndarray, fundamental: float,
    ) -> float:
        if fundamental < 40 or len(magnitudes) < 8:
            return 0.0
        harmonic_energy = 0.0
        for h in range(1, 6):
            target = fundamental * h
            idx = int(np.argmin(np.abs(freqs - target)))
            harmonic_energy += magnitudes[idx] ** 2
        total = float(np.sum(magnitudes ** 2)) + 1e-12
        return clamp(harmonic_energy / total)

    def reset(self) -> None:
        for s in self._smoothers.values():
            s.reset(0.0)
        self._last_fft.fill(0.0)
        self._waveform.fill(0.0)
