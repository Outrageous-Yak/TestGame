"""Layer mixing and gain staging."""

from __future__ import annotations

from typing import Dict

import numpy as np

from audio.smoothing import ParamSmoother
from utils import clamp


LAYER_IDS = [
    "main_pad", "secondary_pad", "atmosphere", "sub_bass", "soft_bass",
    "lead", "bell", "arpeggio", "choir", "noise_atmo", "percussion", "impact",
]


class LayerBus:
    def __init__(self, name: str) -> None:
        self.name = name
        self.gain = ParamSmoother(0.0, 0.25)
        self.pan = ParamSmoother(0.0, 0.2)
        self.width = ParamSmoother(0.3, 0.2)
        self.reverb_send = ParamSmoother(0.4, 0.2)
        self.delay_send = ParamSmoother(0.1, 0.2)
        self.active = False

    def set_targets(self, gain: float, pan: float = 0.0, width: float = 0.3,
                    reverb: float = 0.4, delay: float = 0.1) -> None:
        self.gain.set_target(clamp(gain))
        self.pan.set_target(clamp(pan, -1, 1))
        self.width.set_target(clamp(width))
        self.reverb_send.set_target(clamp(reverb))
        self.delay_send.set_target(delay)
        self.active = gain > 0.01


class AudioMixer:
    def __init__(self) -> None:
        self.buses: Dict[str, LayerBus] = {lid: LayerBus(lid) for lid in LAYER_IDS}
        self._compensation = ParamSmoother(1.0, 0.3)

    def set_layer(self, layer: str, gain: float, **kwargs) -> None:
        if layer not in self.buses:
            return
        self.buses[layer].set_targets(gain, **kwargs)

    def mix_stereo(
        self,
        layer_audio: Dict[str, np.ndarray],
        n: int,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        left = np.zeros(n)
        right = np.zeros(n)
        rev_l = np.zeros(n)
        rev_r = np.zeros(n)
        dly_l = np.zeros(n)
        dly_r = np.zeros(n)
        active = 0
        for lid, bus in self.buses.items():
            if lid not in layer_audio:
                continue
            audio = layer_audio[lid]
            if audio is None or len(audio) < n:
                continue
            g_curve = bus.gain.process_block(n)
            if float(g_curve[-1]) < 0.001:
                continue
            active += 1
            pan_curve = bus.pan.process_block(n)
            w_curve = bus.width.process_block(n)
            rv = bus.reverb_send.process_block(n)
            dl = bus.delay_send.process_block(n)
            for i in range(n):
                s = audio[i] * g_curve[i]
                pan = pan_curve[i]
                w = w_curve[i]
                l = s * (0.5 - pan * 0.35) * (1.0 + w * 0.15)
                r = s * (0.5 + pan * 0.35) * (1.0 + w * 0.15)
                left[i] += l
                right[i] += r
                rev_l[i] += l * rv[i]
                rev_r[i] += r * rv[i]
                dly_l[i] += l * dl[i]
                dly_r[i] += r * dl[i]
        # Dynamic compensation
        comp = 1.0 / max(1.0, np.sqrt(active) * 0.85)
        self._compensation.set_target(comp)
        c = self._compensation.process_block(n)
        left *= c
        right *= c
        return left, right, rev_l, rev_r, dly_l, dly_r
