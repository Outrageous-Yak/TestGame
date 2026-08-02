"""Algorithmic stereo reverb."""

from __future__ import annotations

import numpy as np

from audio.smoothing import ParamSmoother
from config import SAMPLE_RATE
from utils import clamp


class StereoReverb:
    PROFILE_PARAMS = {
        "Small Air": (0.35, 0.55, 0.4, 0.02),
        "Soft Hall": (0.5, 0.72, 0.5, 0.03),
        "Vast Hall": (0.65, 0.82, 0.55, 0.045),
        "Frozen Space": (0.7, 0.88, 0.65, 0.05),
        "Storm Chamber": (0.55, 0.75, 0.45, 0.025),
        "Night Distance": (0.6, 0.9, 0.6, 0.06),
    }

    def __init__(self, profile: str = "Soft Hall") -> None:
        self.profile = profile
        self._wet = ParamSmoother(0.4, 0.2)
        self._delays_l = [1557, 2131, 2623]
        self._delays_r = [1617, 2197, 2683]
        self._bufs_l = [np.zeros(d) for d in self._delays_l]
        self._bufs_r = [np.zeros(d) for d in self._delays_r]
        self._pos_l = [0] * len(self._delays_l)
        self._pos_r = [0] * len(self._delays_r)
        self._fb = 0.68
        self._damp_z = 0.0
        self.set_profile(profile)

    def set_profile(self, profile: str) -> None:
        self.profile = profile
        p = self.PROFILE_PARAMS.get(profile, self.PROFILE_PARAMS["Soft Hall"])
        self._wet.set_target(p[0])
        self._fb = p[1]
        self._damp = p[2]
        self._spread = p[3]

    def set_wet(self, wet: float) -> None:
        self._wet.set_target(clamp(wet))

    def process(self, left: np.ndarray, right: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        wet_curve = self._wet.process_block(len(left))
        out_l = np.empty_like(left)
        out_r = np.empty_like(right)
        damp_z = self._damp_z
        for i in range(len(left)):
            wet = wet_curve[i]
            dry = 1.0 - wet
            mono = (left[i] + right[i]) * 0.5
            wl, wr = 0.0, 0.0
            for bi, d in enumerate(self._delays_l):
                buf = self._bufs_l[bi]
                pos = self._pos_l[bi]
                delayed = buf[pos]
                wl += delayed
                buf[pos] = mono + delayed * self._fb
                self._pos_l[bi] = (pos + 1) % d
            for bi, d in enumerate(self._delays_r):
                buf = self._bufs_r[bi]
                pos = self._pos_r[bi]
                delayed = buf[pos]
                wr += delayed
                buf[pos] = mono + delayed * self._fb * 0.95
                self._pos_r[bi] = (pos + 1) % d
            wl /= len(self._delays_l)
            wr /= len(self._delays_r)
            damp_z += 0.05 * (wl - damp_z)
            wl = wl * (1.0 - self._damp) + damp_z * self._damp
            wr = wr * (1.0 - self._damp) + damp_z * self._damp
            out_l[i] = left[i] * dry + wl * wet
            out_r[i] = right[i] * dry + wr * wet * (1.0 + self._spread)
        self._damp_z = damp_z
        return out_l, out_r
