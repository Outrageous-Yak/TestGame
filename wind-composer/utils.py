"""Shared utilities."""

from __future__ import annotations

import time
from typing import Optional


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def midi_to_freq(midi: int) -> float:
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


def exp_smooth(current: float, target: float, alpha: float) -> float:
    """Exponential smoothing; alpha in (0,1], higher = faster tracking."""
    return current + alpha * (target - current)


class ExponentialSmoother:
    """Tracks a smoothed value with configurable responsiveness."""

    def __init__(self, initial: float = 0.0, alpha: float = 0.08) -> None:
        self.value = initial
        self.alpha = alpha

    def update(self, target: float) -> float:
        self.value = exp_smooth(self.value, target, self.alpha)
        return self.value

    def reset(self, value: float = 0.0) -> None:
        self.value = value


class GustDetector:
    """Detect sudden energy increases with cooldown."""

    def __init__(self, cooldown_sec: float = 1.0, threshold: float = 0.18) -> None:
        self.cooldown_sec = cooldown_sec
        self.threshold = threshold
        self._last_gust_time: float = 0.0
        self._prev_energy: float = 0.0

    def update(self, energy: float) -> bool:
        now = time.monotonic()
        delta = energy - self._prev_energy
        self._prev_energy = energy
        if delta > self.threshold and (now - self._last_gust_time) >= self.cooldown_sec:
            self._last_gust_time = now
            return True
        return False

    def reset(self) -> None:
        self._last_gust_time = 0.0
        self._prev_energy = 0.0


def safe_divide(a: float, b: float, default: float = 0.0) -> float:
    return a / b if abs(b) > 1e-12 else default


def list_audio_input_devices() -> list[tuple[int, str]]:
    """Return (device_id, label) pairs for input devices."""
    import sounddevice as sd

    devices: list[tuple[int, str]] = []
    for i, dev in enumerate(sd.query_devices()):
        if dev["max_input_channels"] > 0:
            label = f"{dev['name']} ({i})"
            devices.append((i, label))
    return devices


def resolve_input_device(microphone_label: str) -> Optional[int]:
    """Parse device id from stored label or return default."""
    if not microphone_label:
        return None
    if "(" in microphone_label and microphone_label.endswith(")"):
        try:
            return int(microphone_label.rsplit("(", 1)[1].rstrip(")"))
        except ValueError:
            pass
    return None
