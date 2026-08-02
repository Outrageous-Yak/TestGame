"""Instrument preset definitions and loading."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class EnvelopeSpec:
    attack: float = 0.5
    decay: float = 0.4
    sustain: float = 0.7
    release: float = 1.5


@dataclass
class FilterSpec:
    mode: str = "low"
    cutoff: float = 1800.0
    resonance: float = 0.2
    env_amount: float = 0.3


@dataclass
class InstrumentPreset:
    name: str
    layer: str
    oscillators: List[str] = field(default_factory=lambda: ["sine", "triangle"])
    detunes: List[float] = field(default_factory=lambda: [0.0, 0.003])
    levels: List[float] = field(default_factory=lambda: [0.6, 0.4])
    envelope: EnvelopeSpec = field(default_factory=EnvelopeSpec)
    filter: FilterSpec = field(default_factory=FilterSpec)
    gain: float = 0.5
    pan: float = 0.0
    width: float = 0.3
    reverb_send: float = 0.45
    delay_send: float = 0.15
    mod_depth: float = 0.08
    depth: str = "midground"  # foreground, midground, background, distant
    energy_response: float = 0.5


SOUNDSCAPE_PRESETS = [
    "Natural Ambient", "Deep Space", "Frozen World", "Cinematic Storm",
    "Dreaming Earth", "Minimal Air", "Dark Horizon", "Luminous Sky",
]

REVERB_PROFILES = [
    "Small Air", "Soft Hall", "Vast Hall", "Frozen Space",
    "Storm Chamber", "Night Distance",
]


def _pad(name: str, **kw) -> InstrumentPreset:
    base = InstrumentPreset(name=name, layer="main_pad")
    for k, v in kw.items():
        if hasattr(base, k):
            setattr(base, k, v)
    return base


BUILTIN_PRESETS: Dict[str, InstrumentPreset] = {}


def _register(p: InstrumentPreset) -> None:
    BUILTIN_PRESETS[p.name] = p


# Pads
_register(_pad("Warm Horizon", oscillators=["sine", "triangle", "saw"], detunes=[0, 0.004, -0.003], levels=[0.45, 0.35, 0.2],
          envelope=EnvelopeSpec(1.8, 1.2, 0.75, 3.0), filter=FilterSpec("low", 1200, 0.15), reverb_send=0.55))
_register(_pad("Frozen Glass", oscillators=["sine", "triangle"], detunes=[0, 0.006], levels=[0.55, 0.45],
          envelope=EnvelopeSpec(2.5, 1.5, 0.65, 4.0), filter=FilterSpec("low", 900, 0.1), reverb_send=0.65, depth="distant"))
_register(_pad("Deep Cloud", oscillators=["saw", "triangle"], detunes=[0, 0.005], levels=[0.4, 0.6],
          envelope=EnvelopeSpec(2.0, 1.0, 0.7, 2.5), filter=FilterSpec("low", 800, 0.25), gain=0.45))
_register(_pad("Soft Aurora", oscillators=["sine", "sine"], detunes=[0, 0.008], levels=[0.5, 0.5],
          envelope=EnvelopeSpec(1.5, 0.8, 0.8, 2.8), filter=FilterSpec("low", 1500, 0.12), width=0.45))
_register(_pad("Distant Choir", oscillators=["triangle", "sine"], detunes=[0, 0.01, -0.01], levels=[0.4, 0.35, 0.25],
          envelope=EnvelopeSpec(2.2, 1.4, 0.7, 3.5), filter=FilterSpec("low", 1100, 0.1), reverb_send=0.7, depth="distant"))
_register(_pad("Night Current", oscillators=["sine", "noise"], detunes=[0, 0], levels=[0.7, 0.15],
          envelope=EnvelopeSpec(3.0, 2.0, 0.6, 4.5), filter=FilterSpec("low", 700, 0.2), reverb_send=0.6))
_register(_pad("Storm Bed", oscillators=["saw", "noise"], detunes=[0, 0.003], levels=[0.5, 0.3],
          envelope=EnvelopeSpec(1.0, 0.8, 0.65, 2.0), filter=FilterSpec("low", 600, 0.35), gain=0.55))

# Leads
_register(InstrumentPreset("Glass Bell", layer="lead", oscillators=["sine"], detunes=[0], levels=[1.0],
          envelope=EnvelopeSpec(0.02, 0.3, 0.2, 1.2), filter=FilterSpec("low", 4000, 0.3), gain=0.35, reverb_send=0.5))
_register(InstrumentPreset("Soft Pulse", layer="lead", oscillators=["sine", "triangle"], detunes=[0, 0.002], levels=[0.6, 0.4],
          envelope=EnvelopeSpec(0.05, 0.2, 0.5, 0.6), filter=FilterSpec("low", 2500, 0.2), gain=0.3))
_register(InstrumentPreset("Distant Signal", layer="lead", oscillators=["sine"], detunes=[0], levels=[1.0],
          envelope=EnvelopeSpec(0.1, 0.4, 0.4, 1.5), filter=FilterSpec("low", 1800, 0.15), depth="distant", reverb_send=0.65))
_register(InstrumentPreset("Air Flute", layer="lead", oscillators=["sine", "triangle"], detunes=[0, 0.005], levels=[0.7, 0.3],
          envelope=EnvelopeSpec(0.15, 0.35, 0.55, 1.0), filter=FilterSpec("low", 3200, 0.15), gain=0.32))
_register(InstrumentPreset("Muted Pluck", layer="bell", oscillators=["triangle"], detunes=[0], levels=[1.0],
          envelope=EnvelopeSpec(0.01, 0.25, 0.0, 0.8), filter=FilterSpec("low", 3500, 0.25), gain=0.28, delay_send=0.25))

# Bass
_register(InstrumentPreset("Sub Foundation", layer="sub_bass", oscillators=["sine"], detunes=[0], levels=[1.0],
          envelope=EnvelopeSpec(0.08, 0.15, 0.85, 0.5), filter=FilterSpec("low", 400, 0.1), gain=0.5, pan=0.0, width=0.0, reverb_send=0.05))
_register(InstrumentPreset("Soft Analog Bass", layer="soft_bass", oscillators=["triangle", "sine"], detunes=[0, 0.002], levels=[0.6, 0.4],
          envelope=EnvelopeSpec(0.12, 0.2, 0.7, 0.6), filter=FilterSpec("low", 600, 0.2), gain=0.4, reverb_send=0.08))
_register(InstrumentPreset("Dark Drone Bass", layer="sub_bass", oscillators=["saw", "sine"], detunes=[0, -0.005], levels=[0.35, 0.65],
          envelope=EnvelopeSpec(0.5, 0.4, 0.8, 1.2), filter=FilterSpec("low", 350, 0.25), gain=0.45))

# Atmospheres
_register(InstrumentPreset("Wind Haze", layer="atmosphere", oscillators=["pink_noise", "sine"], detunes=[0, 0], levels=[0.6, 0.4],
          envelope=EnvelopeSpec(3.0, 2.0, 0.8, 5.0), filter=FilterSpec("low", 500, 0.3), gain=0.2, reverb_send=0.55, depth="background"))
_register(InstrumentPreset("Rain Mist", layer="atmosphere", oscillators=["pink_noise"], detunes=[0], levels=[1.0],
          envelope=EnvelopeSpec(2.0, 1.5, 0.75, 4.0), filter=FilterSpec("low", 1200, 0.2), gain=0.18, delay_send=0.2))
_register(InstrumentPreset("Snow Dust", layer="atmosphere", oscillators=["pink_noise", "sine"], detunes=[0, 0], levels=[0.7, 0.3],
          envelope=EnvelopeSpec(4.0, 2.5, 0.7, 6.0), filter=FilterSpec("low", 800, 0.1), gain=0.15, reverb_send=0.6))
_register(InstrumentPreset("Ocean Air", layer="atmosphere", oscillators=["noise", "sine"], detunes=[0, 0.002], levels=[0.5, 0.5],
          envelope=EnvelopeSpec(2.5, 1.8, 0.75, 4.5), filter=FilterSpec("low", 700, 0.2), gain=0.22, width=0.5))
_register(InstrumentPreset("Electrical Storm", layer="noise_atmo", oscillators=["noise", "saw"], detunes=[0, 0.01], levels=[0.55, 0.45],
          envelope=EnvelopeSpec(0.5, 0.6, 0.6, 1.5), filter=FilterSpec("low", 900, 0.4), gain=0.25, reverb_send=0.5))

# Secondary pad alias
_register(InstrumentPreset("Secondary Pad", layer="secondary_pad", oscillators=["triangle", "sine"], detunes=[0, 0.007], levels=[0.5, 0.5],
          envelope=EnvelopeSpec(2.0, 1.2, 0.7, 3.0), filter=FilterSpec("low", 1000, 0.15), gain=0.38, reverb_send=0.5))


class PresetManager:
    def __init__(self) -> None:
        self._presets = dict(BUILTIN_PRESETS)

    def get(self, name: str) -> InstrumentPreset:
        if name in self._presets:
            return self._presets[name]
        # fallback
        return self._presets.get("Warm Horizon", list(self._presets.values())[0])

    def list_names(self) -> List[str]:
        return list(self._presets.keys())
