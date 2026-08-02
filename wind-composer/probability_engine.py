"""Weighted probability decisions for generative music."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from utils import clamp


@dataclass
class WeightedChoice:
    label: str
    weight: float


def weighted_choice(options: List[WeightedChoice], rng: random.Random | None = None) -> str:
    r = rng or random
    total = sum(max(0, o.weight) for o in options)
    if total <= 0:
        return options[0].label if options else ""
    pick = r.uniform(0, total)
    acc = 0.0
    for o in options:
        acc += max(0, o.weight)
        if pick <= acc:
            return o.label
    return options[-1].label


@dataclass
class GustDecisionTable:
    """Wind gust → musical action weights."""

    bass_variation: float = 0.25
    fill: float = 0.3
    lead_flourish: float = 0.2
    reverse_fx: float = 0.1
    riser: float = 0.1
    crash: float = 0.15


def gust_action_weights(wind_speed: float, gust_delta: float, energy: float) -> Dict[str, float]:
    strength = clamp((gust_delta / 25.0) + energy * 0.3 + wind_speed / 80.0)
    base = GustDecisionTable()
    return {
        "bass_variation": base.bass_variation * strength,
        "fill": base.fill * strength,
        "lead_flourish": base.lead_flourish * strength,
        "reverse_fx": base.reverse_fx * strength * 0.5,
        "riser": base.riser * strength,
        "crash": base.crash * strength,
    }


def pick_gust_action(weights: Dict[str, float], rng: random.Random | None = None) -> str:
    opts = [WeightedChoice(k, w) for k, w in weights.items()]
    return weighted_choice(opts, rng)


def beat_micro_decision(energy: float, rng: random.Random | None = None) -> str:
    """Small per-beat evolution."""
    r = rng or random
    p = r.random()
    if p < 0.02 * energy:
        return "hat_ghost"
    if p < 0.04 * energy:
        return "filter_tick"
    if p < 0.06 * energy:
        return "pan_drift"
    return "none"
