"""Soft saturation."""

from __future__ import annotations

import numpy as np

from utils import clamp


def soft_saturate(x: np.ndarray, drive: float = 0.25) -> np.ndarray:
    d = clamp(drive)
    return np.tanh(x * (1.0 + d * 2.5)) / (1.0 + d * 0.5)
