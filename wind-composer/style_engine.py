"""Musical style profiles for Phase 5 electronic composition."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Tuple


class MusicalStyle(str, Enum):
    AMBIENT = "Ambient"
    CHILLOUT = "Chillout"
    DEEP_HOUSE = "Deep House"
    MELODIC_HOUSE = "Melodic House"
    PROGRESSIVE_HOUSE = "Progressive House"
    MELODIC_TECHNO = "Melodic Techno"
    TRANCE = "Trance"
    SYNTHWAVE = "Synthwave"
    DOWNTEMPO = "Downtempo"
    ELECTRONIC_ORCHESTRA = "Electronic Orchestra"


class SongSection(str, Enum):
    INTRO = "Intro"
    BUILD = "Build"
    DROP = "Drop"
    BREAKDOWN = "Breakdown"
    RECOVERY = "Recovery"
    OUTRO = "Outro"
    FLOW = "Flow"


@dataclass
class StyleProfile:
    """Per-style composition parameters — extend here for new styles."""

    name: MusicalStyle
    bpm_min: float
    bpm_max: float
    kick_pattern: List[int]  # 16-step grid, 1 = hit
    bass_style: str  # house, trance, ambient, progressive, techno
    chord_density: float
    lead_activity: float
    drum_density: float
    fill_probability: float
    transition_probability: float
    swing: float
    pad_layers: float
    bass_layers: float
    lead_layers: float
    hat_layers: float
    choir_layers: float
    energy_curve_power: float = 1.0
    instrument_warmth_bias: float = 0.5


KICK_FOUR = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
KICK_HOUSE = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0]
KICK_MINIMAL = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
KICK_TRANCE = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0]


STYLE_PROFILES: Dict[MusicalStyle, StyleProfile] = {
    MusicalStyle.AMBIENT: StyleProfile(
        MusicalStyle.AMBIENT, 40, 68, KICK_MINIMAL, "ambient", 0.35, 0.2, 0.1, 0.08, 0.05,
        0.0, 0.7, 0.15, 0.15, 0.05, 0.2, 0.85,
    ),
    MusicalStyle.CHILLOUT: StyleProfile(
        MusicalStyle.CHILLOUT, 72, 96, KICK_FOUR, "house", 0.45, 0.35, 0.35, 0.15, 0.1,
        0.08, 0.55, 0.35, 0.3, 0.25, 0.15, 0.9,
    ),
    MusicalStyle.DEEP_HOUSE: StyleProfile(
        MusicalStyle.DEEP_HOUSE, 118, 124, KICK_HOUSE, "house", 0.5, 0.4, 0.55, 0.22, 0.12,
        0.12, 0.45, 0.5, 0.35, 0.4, 0.1, 0.75,
    ),
    MusicalStyle.MELODIC_HOUSE: StyleProfile(
        MusicalStyle.MELODIC_HOUSE, 120, 126, KICK_HOUSE, "house", 0.55, 0.55, 0.6, 0.25, 0.15,
        0.1, 0.5, 0.45, 0.5, 0.45, 0.15, 0.8,
    ),
    MusicalStyle.PROGRESSIVE_HOUSE: StyleProfile(
        MusicalStyle.PROGRESSIVE_HOUSE, 124, 128, KICK_FOUR, "progressive", 0.6, 0.5, 0.5, 0.2, 0.18,
        0.05, 0.55, 0.45, 0.45, 0.35, 0.2, 0.85,
    ),
    MusicalStyle.MELODIC_TECHNO: StyleProfile(
        MusicalStyle.MELODIC_TECHNO, 124, 132, KICK_FOUR, "techno", 0.45, 0.5, 0.65, 0.28, 0.2,
        0.02, 0.4, 0.55, 0.5, 0.5, 0.05, 0.6,
    ),
    MusicalStyle.TRANCE: StyleProfile(
        MusicalStyle.TRANCE, 132, 140, KICK_TRANCE, "trance", 0.55, 0.65, 0.7, 0.3, 0.22,
        0.0, 0.45, 0.5, 0.6, 0.55, 0.25, 0.9,
    ),
    MusicalStyle.SYNTHWAVE: StyleProfile(
        MusicalStyle.SYNTHWAVE, 95, 110, KICK_FOUR, "house", 0.5, 0.45, 0.45, 0.18, 0.12,
        0.06, 0.5, 0.4, 0.45, 0.3, 0.1, 0.7,
    ),
    MusicalStyle.DOWNTEMPO: StyleProfile(
        MusicalStyle.DOWNTEMPO, 80, 100, KICK_MINIMAL, "ambient", 0.4, 0.3, 0.25, 0.12, 0.08,
        0.1, 0.6, 0.3, 0.25, 0.2, 0.15, 0.95,
    ),
    MusicalStyle.ELECTRONIC_ORCHESTRA: StyleProfile(
        MusicalStyle.ELECTRONIC_ORCHESTRA, 60, 90, KICK_MINIMAL, "progressive", 0.65, 0.55, 0.2, 0.1, 0.15,
        0.0, 0.55, 0.35, 0.45, 0.15, 0.45, 0.8,
    ),
}


def get_style(name: str) -> StyleProfile:
    for style in MusicalStyle:
        if style.value == name:
            return STYLE_PROFILES[style]
    return STYLE_PROFILES[MusicalStyle.AMBIENT]


def style_bpm_range(name: str) -> Tuple[float, float]:
    p = get_style(name)
    return p.bpm_min, p.bpm_max


def all_style_names() -> List[str]:
    return [s.value for s in MusicalStyle]
