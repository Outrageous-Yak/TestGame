"""Maps CompositionPlan to layer orchestration and presets."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set

from composition_engine import CompositionPlan, MusicalState, RareEvent, RhythmMode
from audio.preset_manager import PresetManager, SOUNDSCAPE_PRESETS


@dataclass
class OrchestrationTargets:
    layer_gains: Dict[str, float] = field(default_factory=dict)
    layer_presets: Dict[str, str] = field(default_factory=dict)
    active_layers: Set[str] = field(default_factory=set)
    reverb_wet: float = 0.45
    delay_wet: float = 0.12
    width: float = 0.35
    brightness: float = 0.5
    warmth: float = 0.5
    stereo_pan: float = 0.0
    reverb_profile: str = "Soft Hall"
    delay_division: str = "1/8"
    trigger_impact: Optional[RareEvent] = None


SOUNDSCAPE_MAP = {
    "Natural Ambient": {"reverb": "Soft Hall", "warmth": 0.55, "width": 0.35},
    "Deep Space": {"reverb": "Vast Hall", "warmth": 0.35, "width": 0.55},
    "Frozen World": {"reverb": "Frozen Space", "warmth": 0.4, "width": 0.4},
    "Cinematic Storm": {"reverb": "Storm Chamber", "warmth": 0.45, "width": 0.45},
    "Dreaming Earth": {"reverb": "Night Distance", "warmth": 0.6, "width": 0.4},
    "Minimal Air": {"reverb": "Small Air", "warmth": 0.5, "width": 0.25},
    "Dark Horizon": {"reverb": "Night Distance", "warmth": 0.35, "width": 0.5},
    "Luminous Sky": {"reverb": "Vast Hall", "warmth": 0.65, "width": 0.45},
}

STATE_LAYERS: Dict[MusicalState, Dict[str, float]] = {
    MusicalState.STILLNESS: {
        "main_pad": 0.35, "atmosphere": 0.15, "bell": 0.08,
    },
    MusicalState.GENTLE_MOTION: {
        "main_pad": 0.4, "secondary_pad": 0.2, "lead": 0.15, "atmosphere": 0.2,
    },
    MusicalState.FLOW: {
        "main_pad": 0.45, "secondary_pad": 0.25, "soft_bass": 0.25, "arpeggio": 0.2, "atmosphere": 0.22,
    },
    MusicalState.BUILDING: {
        "main_pad": 0.5, "secondary_pad": 0.3, "soft_bass": 0.35, "lead": 0.25, "atmosphere": 0.28,
    },
    MusicalState.POWER: {
        "main_pad": 0.55, "secondary_pad": 0.35, "sub_bass": 0.4, "lead": 0.35, "atmosphere": 0.3, "choir": 0.2,
    },
    MusicalState.STORM: {
        "main_pad": 0.5, "sub_bass": 0.45, "noise_atmo": 0.3, "percussion": 0.25, "impact": 0.0,
    },
    MusicalState.RECOVERY: {
        "main_pad": 0.38, "atmosphere": 0.25, "lead": 0.12,
    },
    MusicalState.SUNRISE: {
        "main_pad": 0.45, "bell": 0.2, "lead": 0.25, "atmosphere": 0.25,
    },
    MusicalState.SUNSET: {
        "main_pad": 0.42, "secondary_pad": 0.28, "lead": 0.2, "atmosphere": 0.3,
    },
    MusicalState.NIGHT: {
        "main_pad": 0.35, "atmosphere": 0.28, "sub_bass": 0.12, "lead": 0.1,
    },
}

MOOD_PRESET_BIAS = {
    "Storm": ("Storm Bed", "Dark Drone Bass", "Electrical Storm"),
    "Light Rain": ("Rain Mist", "Muted Pluck", "Soft Pulse"),
    "Snow": ("Snow Dust", "Frozen Glass", "Glass Bell"),
    "Sunny Calm": ("Soft Aurora", "Warm Horizon", "Air Flute"),
    "Peaceful": ("Warm Horizon", "Ocean Air", "Distant Signal"),
    "Strong Wind": ("Deep Cloud", "Soft Analog Bass", "Wind Haze"),
}


class Orchestrator:
    def __init__(self, presets: PresetManager) -> None:
        self.presets = presets
        self.soundscape = "Natural Ambient"
        self._prev_gains: Dict[str, float] = {}

    def map_plan(self, plan: CompositionPlan) -> OrchestrationTargets:
        t = OrchestrationTargets()
        state_map = STATE_LAYERS.get(plan.musical_state, STATE_LAYERS[MusicalState.GENTLE_MOTION])
        # typo fix - MusicalState
        energy = plan.energy_curve

        for layer, base in state_map.items():
            gain = base * (0.65 + energy * 0.5)
            # smooth from previous
            prev = self._prev_gains.get(layer, gain)
            gain = prev + 0.08 * (gain - prev)
            t.layer_gains[layer] = gain
            if gain > 0.05:
                t.active_layers.add(layer)
        self._prev_gains = dict(t.layer_gains)

        # Mood-based preset selection
        mood_key = plan.mood.split("·")[0].strip()
        for key, presets in MOOD_PRESET_BIAS.items():
            if key in mood_key or key in plan.mood:
                if "main_pad" in t.active_layers:
                    t.layer_presets["main_pad"] = presets[0]
                if "sub_bass" in t.active_layers or "soft_bass" in t.active_layers:
                    t.layer_presets["sub_bass"] = presets[1]
                if "atmosphere" in t.active_layers:
                    t.layer_presets["atmosphere"] = presets[2]
                break
        else:
            t.layer_presets["main_pad"] = "Warm Horizon"
            t.layer_presets["atmosphere"] = "Wind Haze"
            t.layer_presets["lead"] = "Soft Pulse"
            t.layer_presets["sub_bass"] = "Sub Foundation"
            t.layer_presets["soft_bass"] = "Soft Analog Bass"
            t.layer_presets["bell"] = "Glass Bell"
            t.layer_presets["secondary_pad"] = "Soft Aurora"

        # Rhythm → percussion
        if plan.rhythm_mode == RhythmMode.STORM_PERC:
            t.layer_gains["percussion"] = max(t.layer_gains.get("percussion", 0), 0.2 + energy * 0.3)
            t.active_layers.add("percussion")
        elif plan.rhythm_mode == RhythmMode.NONE:
            t.layer_gains["percussion"] = t.layer_gains.get("percussion", 0) * 0.3

        t.reverb_wet = plan.reverb_amount
        t.stereo_pan = plan.stereo_pan
        t.brightness = plan.brightness
        t.warmth = 0.5
        t.trigger_impact = plan.rare_event

        sc = SOUNDSCAPE_MAP.get(self.soundscape, SOUNDSCAPE_MAP["Natural Ambient"])
        t.reverb_profile = sc["reverb"]
        t.warmth = sc.get("warmth", 0.5)
        t.width = sc.get("width", 0.35) * (0.8 + energy * 0.4)
        t.delay_wet = 0.08 + energy * 0.15
        if plan.rhythm_mode in (RhythmMode.ARPEGGIO, RhythmMode.ELECTRONIC_PULSE):
            t.delay_division = "1/8"
        return t
