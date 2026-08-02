"""Audio event scheduling types."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class EventType(str, Enum):
    NOTE_ON = "note_on"
    NOTE_OFF = "note_off"
    CHORD = "chord"
    PERC = "percussion"
    RARE = "rare_event"
    LAYER_GAIN = "layer_gain"
    AUTOMATION = "automation"


@dataclass
class AudioEvent:
    event_type: EventType
    timestamp_samples: int = 0
    layer: str = "main_pad"
    note: int = 60
    velocity: float = 0.6
    duration_beats: float = 4.0
    preset: str = "Warm Horizon"
    value: float = 0.0
    meta: str = ""
