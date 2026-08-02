"""Application configuration, modes, and persisted settings."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Dict, List, Tuple

SETTINGS_PATH = Path.home() / ".wind_composer_settings.json"

SAMPLE_RATE = 44100
BLOCK_SIZE = 1024
CHANNELS = 1

VIS_FPS = 30
VIS_INTERVAL_MS = int(1000 / VIS_FPS)

GUST_COOLDOWN_SEC = 1.0
MAX_MELODY_NOTES_PER_SEC = 4.0
CHORD_MIN_SEC = 8.0
CHORD_MAX_SEC = 16.0


class Mode(str, Enum):
    AMBIENT = "Ambient"
    DREAM = "Dream"
    ELECTRONIC = "Electronic"
    FOREST = "Forest"
    OCEAN = "Ocean"


class ScaleName(str, Enum):
    MAJOR = "Major"
    MINOR = "Minor"
    PENTATONIC = "Pentatonic"
    DORIAN = "Dorian"
    MIXOLYDIAN = "Mixolydian"
    NATURAL_MINOR = "Natural Minor"


KEYS: List[str] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

NOTE_TO_MIDI: Dict[str, int] = {k: i for i, k in enumerate(KEYS)}


@dataclass
class ModeProfile:
    """Per-mode synthesis and musical behaviour."""

    pad_osc: Tuple[str, str] = ("sine", "triangle")
    bass_osc: Tuple[str, str] = ("triangle", "saw")
    lead_osc: Tuple[str, str] = ("sine", "saw")
    atmosphere_osc: Tuple[str, str] = ("noise", "sine")
    reverb_mix: float = 0.45
    delay_mix: float = 0.15
    chorus_mix: float = 0.12
    lp_cutoff_base: float = 1200.0
    hp_cutoff: float = 80.0
    tempo_min: float = 48.0
    tempo_max: float = 72.0
    melody_activity: float = 0.55
    rhythm_density: float = 0.4
    brightness: float = 0.5


MODE_PROFILES: Dict[Mode, ModeProfile] = {
    Mode.AMBIENT: ModeProfile(
        pad_osc=("sine", "triangle"),
        bass_osc=("triangle", "sine"),
        lead_osc=("sine", "triangle"),
        atmosphere_osc=("noise", "sine"),
        reverb_mix=0.55,
        delay_mix=0.2,
        chorus_mix=0.15,
        lp_cutoff_base=900.0,
        tempo_min=40.0,
        tempo_max=60.0,
        melody_activity=0.45,
        rhythm_density=0.25,
        brightness=0.4,
    ),
    Mode.DREAM: ModeProfile(
        pad_osc=("sine", "triangle"),
        bass_osc=("sine", "triangle"),
        lead_osc=("sine", "saw"),
        atmosphere_osc=("noise", "sine"),
        reverb_mix=0.65,
        delay_mix=0.25,
        chorus_mix=0.2,
        lp_cutoff_base=1100.0,
        tempo_min=36.0,
        tempo_max=56.0,
        melody_activity=0.5,
        rhythm_density=0.2,
        brightness=0.35,
    ),
    Mode.ELECTRONIC: ModeProfile(
        pad_osc=("saw", "square"),
        bass_osc=("saw", "square"),
        lead_osc=("saw", "square"),
        atmosphere_osc=("noise", "saw"),
        reverb_mix=0.35,
        delay_mix=0.22,
        chorus_mix=0.08,
        lp_cutoff_base=1800.0,
        tempo_min=72.0,
        tempo_max=96.0,
        melody_activity=0.65,
        rhythm_density=0.55,
        brightness=0.7,
    ),
    Mode.FOREST: ModeProfile(
        pad_osc=("triangle", "sine"),
        bass_osc=("triangle", "noise"),
        lead_osc=("triangle", "sine"),
        atmosphere_osc=("noise", "triangle"),
        reverb_mix=0.5,
        delay_mix=0.18,
        chorus_mix=0.14,
        lp_cutoff_base=1000.0,
        hp_cutoff=120.0,
        tempo_min=44.0,
        tempo_max=68.0,
        melody_activity=0.5,
        rhythm_density=0.35,
        brightness=0.45,
    ),
    Mode.OCEAN: ModeProfile(
        pad_osc=("sine", "noise"),
        bass_osc=("sine", "triangle"),
        lead_osc=("sine", "triangle"),
        atmosphere_osc=("noise", "sine"),
        reverb_mix=0.6,
        delay_mix=0.3,
        chorus_mix=0.16,
        lp_cutoff_base=850.0,
        hp_cutoff=60.0,
        tempo_min=38.0,
        tempo_max=58.0,
        melody_activity=0.48,
        rhythm_density=0.3,
        brightness=0.42,
    ),
}


@dataclass
class AppSettings:
    microphone: str = ""
    mode: Mode = Mode.AMBIENT
    scale: ScaleName = ScaleName.MINOR
    key: str = "C"
    master_volume: float = 0.75
    sensitivity: float = 0.6
    window_width: int = 1000
    window_height: int = 700

    def save(self) -> None:
        data = asdict(self)
        data["mode"] = self.mode.value
        data["scale"] = self.scale.value
        SETTINGS_PATH.write_text(json.dumps(data, indent=2))

    @classmethod
    def load(cls) -> AppSettings:
        if not SETTINGS_PATH.exists():
            return cls()
        try:
            raw = json.loads(SETTINGS_PATH.read_text())
            return cls(
                microphone=raw.get("microphone", ""),
                mode=Mode(raw.get("mode", Mode.AMBIENT.value)),
                scale=ScaleName(raw.get("scale", ScaleName.MINOR.value)),
                key=raw.get("key", "C"),
                master_volume=float(raw.get("master_volume", 0.75)),
                sensitivity=float(raw.get("sensitivity", 0.6)),
                window_width=int(raw.get("window_width", 1000)),
                window_height=int(raw.get("window_height", 700)),
            )
        except (json.JSONDecodeError, ValueError, KeyError):
            return cls()
