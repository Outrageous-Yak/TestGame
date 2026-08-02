"""Generative composition engine — weather-inspired evolving music."""

from __future__ import annotations

import random
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Deque, List, Optional, Set, Tuple

from chord_engine import ChordState
from config import SAMPLE_RATE, ScaleName
from melody_engine import MelodyNote
from rhythm_engine import RhythmEvent
from scale_engine import ScaleEngine
from utils import ExponentialSmoother, clamp

try:
    from weather.models import MusicDriveParams, WeatherSnapshot
except ImportError:
    WeatherSnapshot = None  # type: ignore
    MusicDriveParams = None  # type: ignore


class MusicalState(str, Enum):
    STILLNESS = "Stillness"
    GENTLE_MOTION = "Gentle Motion"
    FLOW = "Flow"
    BUILDING = "Building"
    POWER = "Power"
    STORM = "Storm"
    RECOVERY = "Recovery"
    SUNRISE = "Sunrise"
    SUNSET = "Sunset"
    NIGHT = "Night"


class RhythmMode(str, Enum):
    NONE = "none"
    SLOW_PULSE = "slow_pulse"
    HEARTBEAT = "heartbeat"
    ARPEGGIO = "arpeggio"
    GENTLE_PERC = "gentle_perc"
    ELECTRONIC_PULSE = "electronic_pulse"
    STORM_PERC = "storm_perc"


class ChordStyle(str, Enum):
    TRIAD = "triad"
    SUS2 = "sus2"
    SUS4 = "sus4"
    QUARTAL = "quartal"
    DRONE = "drone"
    PEDAL = "pedal"


class RareEvent(str, Enum):
    GUST_SWELL = "gust_swell"
    LIGHTNING = "lightning"
    ATMOSPHERIC_HIT = "atmospheric_hit"
    CALM_AFTER_STORM = "calm_after_storm"
    SUSPENDED_CHORD = "suspended_chord"


# State profiles: tempo factor, melody, rhythm, reverb bias
STATE_PROFILE: dict[MusicalState, dict] = {
    MusicalState.STILLNESS: {
        "tempo_f": 0.75, "melody": 0.08, "rhythm": RhythmMode.NONE,
        "reverb": 0.65, "pad": 0.35, "bass": 0.05, "lead": 0.0, "atmo": 0.2,
    },
    MusicalState.GENTLE_MOTION: {
        "tempo_f": 0.85, "melody": 0.25, "rhythm": RhythmMode.SLOW_PULSE,
        "reverb": 0.55, "pad": 0.45, "bass": 0.15, "lead": 0.2, "atmo": 0.25,
    },
    MusicalState.FLOW: {
        "tempo_f": 1.0, "melody": 0.4, "rhythm": RhythmMode.ARPEGGIO,
        "reverb": 0.5, "pad": 0.5, "bass": 0.25, "lead": 0.35, "atmo": 0.3,
    },
    MusicalState.BUILDING: {
        "tempo_f": 1.08, "melody": 0.45, "rhythm": RhythmMode.HEARTBEAT,
        "reverb": 0.45, "pad": 0.55, "bass": 0.35, "lead": 0.4, "atmo": 0.35,
    },
    MusicalState.POWER: {
        "tempo_f": 1.12, "melody": 0.5, "rhythm": RhythmMode.ELECTRONIC_PULSE,
        "reverb": 0.4, "pad": 0.6, "bass": 0.5, "lead": 0.45, "atmo": 0.4,
    },
    MusicalState.STORM: {
        "tempo_f": 1.05, "melody": 0.35, "rhythm": RhythmMode.STORM_PERC,
        "reverb": 0.55, "pad": 0.7, "bass": 0.65, "lead": 0.3, "atmo": 0.55,
    },
    MusicalState.RECOVERY: {
        "tempo_f": 0.8, "melody": 0.2, "rhythm": RhythmMode.NONE,
        "reverb": 0.7, "pad": 0.4, "bass": 0.1, "lead": 0.15, "atmo": 0.25,
    },
    MusicalState.SUNRISE: {
        "tempo_f": 0.9, "melody": 0.35, "rhythm": RhythmMode.ARPEGGIO,
        "reverb": 0.5, "pad": 0.5, "bass": 0.2, "lead": 0.35, "atmo": 0.3,
    },
    MusicalState.SUNSET: {
        "tempo_f": 0.82, "melody": 0.28, "rhythm": RhythmMode.SLOW_PULSE,
        "reverb": 0.6, "pad": 0.45, "bass": 0.15, "lead": 0.25, "atmo": 0.35,
    },
    MusicalState.NIGHT: {
        "tempo_f": 0.78, "melody": 0.15, "rhythm": RhythmMode.NONE,
        "reverb": 0.72, "pad": 0.4, "bass": 0.12, "lead": 0.1, "atmo": 0.35,
    },
}

# Progressions as scale-degree sequences (non-pop, ambient)
PROGRESSIONS: dict[str, List[List[int]]] = {
    "minor_modal": [[0, 5, 2, 6], [0, 6, 4, 5], [0, 3, 5, 2]],
    "major_hope": [[0, 4, 5, 3], [0, 5, 3, 4]],
    "drone": [[0], [0, 0, 4], [0, 5]],
    "suspended": [[0, 4, 5], [2, 5, 0], [5, 3, 0]],
    "quartal": [[0, 2, 4, 6], [4, 6, 1, 3]],
}


@dataclass
class WeatherPersonality:
    """Weather-derived musical character."""

    label: str = "Calm"
    darkness: float = 0.3
    power: float = 0.2
    warmth: float = 0.5
    reflectivity: float = 0.3  # rain/snow
    hope: float = 0.4


@dataclass
class CompositionContext:
    """Input snapshot for one composition tick."""

    raw_energy: float = 0.0
    gust: bool = False
    tempo_min: float = 40.0
    tempo_max: float = 72.0
    sample_position: int = 0
    weather: Optional[WeatherSnapshot] = None
    drive: Optional[MusicDriveParams] = None
    stereo_pan: float = 0.0
    percussion: float = 0.0


@dataclass
class CompositionPlan:
    """Scheduled musical decisions for the synthesizer."""

    energy_curve: float = 0.0
    mood: str = "Calm"
    musical_state: MusicalState = MusicalState.GENTLE_MOTION
    tempo_bpm: float = 60.0
    chord: Optional[ChordState] = None
    chord_style: ChordStyle = ChordStyle.TRIAD
    melody_notes: List[MelodyNote] = field(default_factory=list)
    melody_activity: float = 0.3
    silence_weight: float = 0.4
    rhythm_mode: RhythmMode = RhythmMode.SLOW_PULSE
    rhythm_events: List[RhythmEvent] = field(default_factory=list)
    pad_gain: float = 0.4
    bass_gain: float = 0.2
    lead_gain: float = 0.3
    atmosphere_gain: float = 0.25
    reverb_amount: float = 0.5
    stereo_pan: float = 0.0
    brightness: float = 0.5
    bass_mult: float = 1.0
    percussion: float = 0.0
    gust_accent: bool = False
    rare_event: Optional[RareEvent] = None
    phrase_number: int = 0
    phrase_length_bars: int = 8
    active_instruments: Set[str] = field(default_factory=set)
    pedal_midi: Optional[int] = None


@dataclass
class CompositionMetadata:
    """Recording / UI metadata."""

    location: str = ""
    weather_condition: str = ""
    weather_date: str = ""
    tempo_bpm: float = 0.0
    key: str = ""
    scale: str = ""
    mode: str = ""
    composition_state: str = ""
    mood: str = ""
    phrase_number: int = 0
    phrase_length_bars: int = 0
    chord: str = ""


class MusicalMemory:
    """Long-term memory to avoid repetitive phrases."""

    def __init__(self, chord_mem: int = 6, melody_mem: int = 12) -> None:
        self._chords: Deque[int] = deque(maxlen=chord_mem)
        self._melodies: Deque[int] = deque(maxlen=melody_mem)
        self._states: Deque[MusicalState] = deque(maxlen=4)
        self._progressions: Deque[str] = deque(maxlen=3)

    def remember_chord(self, degree: int) -> None:
        self._chords.append(degree)

    def remember_melody(self, midi: int) -> None:
        self._melodies.append(midi)

    def remember_state(self, state: MusicalState) -> None:
        self._states.append(state)

    def chord_overused(self, degree: int) -> bool:
        return sum(1 for d in self._chords if d == degree) >= 2

    def melody_overused(self, midi: int) -> bool:
        return midi in list(self._melodies)[-3:]

    def pick_progression_key(self, options: List[str]) -> str:
        for key in options:
            if key not in self._progressions:
                self._progressions.append(key)
                return key
        key = random.choice(options)
        self._progressions.append(key)
        return key

    def reset(self) -> None:
        self._chords.clear()
        self._melodies.clear()
        self._states.clear()
        self._progressions.clear()


class CompositionEngine:
    """
    Generative brain: mood, phrases, harmony, memory, orchestration.

    Schedules decisions at beat / measure / phrase timescales — not every frame.
    """

    PHRASE_LENGTHS = [4, 8, 16, 32]

    def __init__(self, scale_engine: ScaleEngine) -> None:
        self.scale_engine = scale_engine
        self.memory = MusicalMemory()
        self._energy = ExponentialSmoother(0.0, 0.04)
        self._state = MusicalState.GENTLE_MOTION
        self._personality = WeatherPersonality()
        self._plan = CompositionPlan()
        self._progression_key = "minor_modal"
        self._progression_idx = 0
        self._phrase_number = 0
        self._phrase_length_bars = 8
        self._bars_in_phrase = 0
        self._current_chord: Optional[ChordState] = None
        self._pedal_midi: Optional[int] = None
        self._last_measure = -1
        self._last_beat = -1
        self._samples_per_beat = 0.0
        self._melody_midi: Optional[int] = None
        self._last_melody_time = 0.0
        self._last_rare_event = 0.0
        self._weather_history: Deque[float] = deque(maxlen=8)
        self._location_label = ""

    def reset(self) -> None:
        self.memory.reset()
        self._energy.reset(0.0)
        self._state = MusicalState.GENTLE_MOTION
        self._progression_idx = 0
        self._phrase_number = 0
        self._bars_in_phrase = 0
        self._current_chord = None
        self._last_measure = -1
        self._last_beat = -1
        self._melody_midi = None

    def set_location_label(self, label: str) -> None:
        self._location_label = label

    @property
    def current_plan(self) -> CompositionPlan:
        return self._plan

    def get_metadata(self, mode: str) -> CompositionMetadata:
        p = self._plan
        w = ""
        if p.chord:
            w = p.chord.name
        return CompositionMetadata(
            location=self._location_label,
            weather_condition=self._personality.label,
            weather_date=datetime.now().isoformat(),
            tempo_bpm=p.tempo_bpm,
            key=self.scale_engine.key,
            scale=self.scale_engine.scale.value,
            mode=mode,
            composition_state=p.musical_state.value,
            mood=p.mood,
            phrase_number=p.phrase_number,
            phrase_length_bars=p.phrase_length_bars,
            chord=w,
        )

    def tick(self, ctx: CompositionContext) -> CompositionPlan:
        """Advance composition; expensive work only on musical boundaries."""
        target_energy = self._compute_target_energy(ctx)
        energy = self._energy.update(target_energy)
        self._weather_history.append(target_energy)

        personality = self._analyze_weather_personality(ctx)
        self._personality = personality

        tempo_mid = (ctx.tempo_min + ctx.tempo_max) / 2.0
        self._samples_per_beat = (60.0 / max(tempo_mid, 20.0)) * SAMPLE_RATE

        beat = int(ctx.sample_position / self._samples_per_beat) if self._samples_per_beat > 0 else 0
        measure = beat // 4

        # Beat-level: rhythm only
        if beat != self._last_beat:
            self._last_beat = beat
            self._on_beat(ctx, energy, beat)

        # Measure-level: melody opportunities, state drift
        if measure != self._last_measure:
            self._last_measure = measure
            self._bars_in_phrase += 1
            self._on_measure(ctx, energy, personality, measure)

            if self._bars_in_phrase >= self._phrase_length_bars:
                self._on_phrase_boundary(ctx, energy, personality)

        # Ensure chord exists
        if self._current_chord is None:
            self._choose_chord_style(personality)
            self._advance_chord(energy, force_new=True)
        profile = STATE_PROFILE[self._state]
        tempo = clamp(
            tempo_mid * profile["tempo_f"] * (0.85 + energy * 0.3),
            ctx.tempo_min,
            ctx.tempo_max,
        )

        gust_accent = ctx.gust or self._plan.gust_accent
        rare = self._check_rare_events(ctx, energy)

        melody_activity = profile["melody"] * (0.5 + energy * 0.5) * personality.hope
        silence = clamp(0.55 - melody_activity * 0.4)

        melody_notes = self._maybe_melody(
            melody_activity, gust_accent, silence, ctx,
        )

        reverb = profile["reverb"]
        if ctx.drive:
            reverb = clamp((reverb + ctx.drive.reverb_amount) / 2.0)
        if personality.reflectivity > 0.4:
            reverb = clamp(reverb + 0.12)

        stereo = ctx.stereo_pan
        if ctx.drive:
            stereo = ctx.drive.stereo_pan

        percussion = ctx.percussion
        if ctx.drive:
            percussion = max(percussion, ctx.drive.percussion)

        self._plan = CompositionPlan(
            energy_curve=energy,
            mood=personality.label,
            musical_state=self._state,
            tempo_bpm=tempo,
            chord=self._current_chord,
            chord_style=self._plan.chord_style,
            melody_notes=melody_notes,
            melody_activity=melody_activity,
            silence_weight=silence,
            rhythm_mode=profile["rhythm"],
            rhythm_events=list(self._plan.rhythm_events),
            pad_gain=profile["pad"] * (0.6 + energy * 0.4),
            bass_gain=profile["bass"] * energy,
            lead_gain=profile["lead"] * melody_activity,
            atmosphere_gain=profile["atmo"] * (0.5 + energy * 0.5),
            reverb_amount=reverb,
            stereo_pan=stereo,
            brightness=clamp(0.35 + personality.warmth * 0.3 + (1.0 - personality.darkness) * 0.2),
            bass_mult=clamp(0.5 + personality.power * 0.5),
            percussion=percussion,
            gust_accent=gust_accent,
            rare_event=rare,
            phrase_number=self._phrase_number,
            phrase_length_bars=self._phrase_length_bars,
            active_instruments={"pad", "atmosphere", "bass", "lead"},
            pedal_midi=self._pedal_midi,
        )
        self._plan.rhythm_events.clear()  # consumed on beat
        return self._plan

    def _compute_target_energy(self, ctx: CompositionContext) -> float:
        e = ctx.raw_energy
        if ctx.drive:
            e = (e + ctx.drive.energy) / 2.0
        if ctx.weather:
            w = ctx.weather
            wind_e = clamp(w.wind_speed_kmh / 55.0)
            e = (e * 0.45 + wind_e * 0.35 + clamp(w.precipitation_mm / 10.0) * 0.1)
            if w.is_storm():
                e = clamp(e + 0.15)
        return clamp(e)

    def _analyze_weather_personality(self, ctx: CompositionContext) -> WeatherPersonality:
        w = ctx.weather
        if not w:
            e = self._energy.value
            return WeatherPersonality(
                label="Calm" if e < 0.3 else "Breezy",
                darkness=0.2 + e * 0.3,
                power=e,
                warmth=0.5,
            )

        speed = w.wind_speed_kmh
        p = WeatherPersonality()

        if w.is_storm() or speed > 50:
            p.label = "Storm"
            p.darkness = 0.85
            p.power = 0.9
            p.warmth = 0.35
        elif speed > 25:
            p.label = "Strong Wind"
            p.darkness = 0.55
            p.power = 0.7
            p.warmth = 0.4
        elif speed < 8:
            if w.snowfall_mm > 0:
                p.label = "Snow"
                p.darkness = 0.25
                p.power = 0.1
                p.warmth = 0.6
                p.reflectivity = 0.7
            elif w.precipitation_mm > 0.5:
                p.label = "Light Rain"
                p.reflectivity = 0.8
                p.darkness = 0.4
                p.warmth = 0.45
            elif w.cloud_cover_pct < 30 and w.temperature_c > 15:
                p.label = "Sunny Calm"
                p.hope = 0.85
                p.warmth = 0.7
                p.darkness = 0.15
            else:
                p.label = "Peaceful"
                p.warmth = 0.65
                p.darkness = 0.2
        else:
            p.label = "Gentle Breeze"
            p.warmth = 0.55

        # Time of day hint from timestamp
        if w.timestamp:
            hour = w.timestamp.hour
            if 5 <= hour < 8:
                p.label = f"{p.label} · Sunrise"
                p.hope = clamp(p.hope + 0.2)
            elif 18 <= hour < 21:
                p.label = f"{p.label} · Sunset"
                p.darkness = clamp(p.darkness + 0.15)
            elif hour >= 21 or hour < 5:
                p.darkness = clamp(p.darkness + 0.2)

        p.power = clamp(speed / 60.0 + p.power * 0.3)
        return p

    def _transition_state(self, personality: WeatherPersonality, energy: float) -> None:
        candidates: List[MusicalState] = []

        if personality.label.startswith("Storm") or energy > 0.75:
            candidates = [MusicalState.STORM, MusicalState.POWER, MusicalState.BUILDING]
        elif energy > 0.55:
            candidates = [MusicalState.BUILDING, MusicalState.POWER, MusicalState.FLOW]
        elif energy > 0.35:
            candidates = [MusicalState.FLOW, MusicalState.GENTLE_MOTION, MusicalState.BUILDING]
        elif energy > 0.15:
            candidates = [MusicalState.GENTLE_MOTION, MusicalState.FLOW, MusicalState.SUNSET]
        else:
            candidates = [MusicalState.STILLNESS, MusicalState.NIGHT, MusicalState.RECOVERY]

        if personality.hope > 0.7:
            candidates.append(MusicalState.SUNRISE)
        if personality.reflectivity > 0.6:
            candidates.append(MusicalState.RECOVERY)

        # Avoid immediate state repeat
        for s in candidates:
            if s != self._state or random.random() < 0.35:
                self._state = s
                self.memory.remember_state(s)
                break

    def _on_phrase_boundary(
        self, ctx: CompositionContext, energy: float, personality: WeatherPersonality,
    ) -> None:
        self._phrase_number += 1
        self._bars_in_phrase = 0
        self._phrase_length_bars = random.choice(self.PHRASE_LENGTHS)

        self._transition_state(personality, energy)

        # Pick progression family
        if self._state in (MusicalState.STILLNESS, MusicalState.NIGHT):
            self._progression_key = self.memory.pick_progression_key(["drone", "minor_modal"])
        elif self._state == MusicalState.STORM:
            self._progression_key = self.memory.pick_progression_key(["minor_modal", "suspended"])
        elif personality.hope > 0.7:
            self._progression_key = self.memory.pick_progression_key(["major_hope", "suspended"])
        else:
            self._progression_key = self.memory.pick_progression_key(
                list(PROGRESSIONS.keys()),
            )

        self._choose_chord_style(personality)
        self._advance_chord(energy, force_new=True)

    def _on_measure(
        self, ctx: CompositionContext, energy: float,
        personality: WeatherPersonality, measure: int,
    ) -> None:
        # Gradual chord movement mid-phrase (every 2-4 bars)
        if self._bars_in_phrase > 0 and self._bars_in_phrase % random.choice([2, 3, 4]) == 0:
            self._advance_chord(energy, force_new=False)

        if ctx.gust:
            self._plan.gust_accent = True

    def _on_beat(self, ctx: CompositionContext, energy: float, beat: int) -> None:
        profile = STATE_PROFILE[self._state]
        mode = profile["rhythm"]
        events: List[RhythmEvent] = []

        if mode == RhythmMode.NONE:
            pass
        elif mode == RhythmMode.SLOW_PULSE and beat % 4 == 0:
            events.append(RhythmEvent("bass", energy * 0.4, True))
        elif mode == RhythmMode.HEARTBEAT and beat % 2 == 0:
            events.append(RhythmEvent("bass", energy * 0.5, True))
        elif mode == RhythmMode.ARPEGGIO:
            if beat % 2 == 0:
                events.append(RhythmEvent("pad", energy * 0.25, False))
        elif mode == RhythmMode.GENTLE_PERC:
            if beat % 4 == 2 and random.random() < energy * 0.4:
                events.append(RhythmEvent("bass", energy * 0.35, True))
        elif mode == RhythmMode.ELECTRONIC_PULSE and beat % 2 == 0:
            events.append(RhythmEvent("bass", energy * 0.55, True))
        elif mode == RhythmMode.STORM_PERC:
            if random.random() < energy * 0.45:
                events.append(RhythmEvent("bass", energy * 0.6, True))
            if beat % 4 == 0:
                events.append(RhythmEvent("lead", energy * 0.35, True))

        if ctx.percussion > 0.3 and beat % 4 == 1:
            events.append(RhythmEvent("bass", ctx.percussion * 0.4, True))

        self._plan.rhythm_events = events

    def _choose_chord_style(self, personality: WeatherPersonality) -> None:
        if self._state in (MusicalState.STILLNESS, MusicalState.NIGHT):
            self._plan.chord_style = ChordStyle.DRONE
        elif personality.label == "Light Rain":
            self._plan.chord_style = random.choice([ChordStyle.SUS4, ChordStyle.SUS2])
        elif self._state == MusicalState.STORM:
            self._plan.chord_style = ChordStyle.QUARTAL
        elif personality.hope > 0.7:
            self._plan.chord_style = ChordStyle.TRIAD
        else:
            self._plan.chord_style = random.choice(
                [ChordStyle.TRIAD, ChordStyle.SUS4, ChordStyle.PEDAL, ChordStyle.QUARTAL],
            )

    def _advance_chord(self, energy: float, force_new: bool) -> None:
        prog_list = PROGRESSIONS.get(self._progression_key, PROGRESSIONS["minor_modal"])
        prog = prog_list[self._progression_idx % len(prog_list)]

        for _ in range(len(prog)):
            degree = prog[self._progression_idx % len(prog)]
            if not self.memory.chord_overused(degree) or force_new:
                break
            self._progression_idx += 1
            degree = prog[self._progression_idx % len(prog)]

        self._progression_idx += 1
        self.memory.remember_chord(degree)

        root = self.scale_engine.degree_root(degree % 7)
        if self._pedal_midi is None:
            self._pedal_midi = self.scale_engine.degree_root(0)
        tones = self._build_chord_tones(root, self._plan.chord_style)
        name = self._chord_name(degree, self._plan.chord_style)

        self._current_chord = ChordState(
            root_midi=root, tones=tones, name=name, degree_index=degree,
        )

    def _build_chord_tones(self, root: int, style: ChordStyle) -> List[int]:
        notes = self.scale_engine.midi_notes
        if root not in notes:
            root = self.scale_engine.nearest_scale_note(root)
        idx = notes.index(root)

        def at_step(step: int) -> int:
            i = max(0, min(len(notes) - 1, idx + step))
            return notes[i]

        if style == ChordStyle.DRONE:
            return [root, root]
        if style == ChordStyle.PEDAL and self._pedal_midi:
            return [self._pedal_midi, root, at_step(2)]
        if style == ChordStyle.SUS2:
            return [root, at_step(1), at_step(3)]
        if style == ChordStyle.SUS4:
            return [root, at_step(2), at_step(3)]
        if style == ChordStyle.QUARTAL:
            return [at_step(0), at_step(1), at_step(2), at_step(3)]
        # triad
        return [at_step(0), at_step(2), at_step(4)]

    def _chord_name(self, degree: int, style: ChordStyle) -> str:
        key = self.scale_engine.key
        roman = ["i", "ii", "iii", "iv", "v", "vi", "vii"]
        if self.scale_engine.scale in (ScaleName.MAJOR, ScaleName.MIXOLYDIAN):
            roman = ["I", "II", "III", "IV", "V", "VI", "VII"]
        suffix = "" if style == ChordStyle.TRIAD else f" ({style.value})"
        return f"{key} {roman[degree % 7]}{suffix}"

    def _maybe_melody(
        self,
        activity: float,
        gust: bool,
        silence: float,
        ctx: CompositionContext,
    ) -> List[MelodyNote]:
        now = time.monotonic()
        if now - self._last_melody_time < 0.35 + silence * 1.5:
            return []

        if random.random() > activity * 0.25 + 0.04:
            return []

        if self._melody_midi is None:
            mids = self.scale_engine.midi_notes
            self._melody_midi = mids[len(mids) // 2]

        chord_tones = self._current_chord.tones if self._current_chord else []

        direction = random.choice([-1, 1])
        allow_leap = gust and random.random() < 0.25
        next_midi = self.scale_engine.step_note(self._melody_midi, direction, allow_leap)

        if self.memory.melody_overused(next_midi):
            next_midi = self.scale_engine.step_note(next_midi, -direction)

        if chord_tones and random.random() < 0.45:
            next_midi = random.choice(chord_tones)

        self.memory.remember_melody(next_midi)
        self._melody_midi = next_midi
        self._last_melody_time = now

        vel = clamp(0.25 + activity * 0.45 + (0.3 if gust else 0.0))
        dur = random.uniform(0.4, 1.4) if not gust else random.uniform(0.2, 0.7)
        return [MelodyNote(midi=next_midi, velocity=vel, duration_sec=dur)]

    def _check_rare_events(self, ctx: CompositionContext, energy: float) -> Optional[RareEvent]:
        now = time.monotonic()
        if now - self._last_rare_event < random.uniform(45.0, 90.0):
            return None

        if ctx.gust and energy > 0.5:
            self._last_rare_event = now
            return RareEvent.GUST_SWELL
        if ctx.weather and ctx.weather.is_storm() and random.random() < 0.08:
            self._last_rare_event = now
            return RareEvent.LIGHTNING
        if self._state == MusicalState.RECOVERY and random.random() < 0.06:
            self._last_rare_event = now
            return RareEvent.CALM_AFTER_STORM
        if self._state == MusicalState.STILLNESS and random.random() < 0.04:
            self._last_rare_event = now
            return RareEvent.SUSPENDED_CHORD
        if energy > 0.7 and random.random() < 0.05:
            self._last_rare_event = now
            return RareEvent.ATMOSPHERIC_HIT
        return None
