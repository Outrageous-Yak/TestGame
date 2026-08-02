"""Deterministic offline audio rendering for tests and reference clips."""

from __future__ import annotations

import random
import wave
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np

from audio.cinematic_engine import CinematicSynthEngine
from composition_engine import CompositionContext, CompositionEngine, CompositionPlan, MusicalState
from config import SAMPLE_RATE, ScaleName
from scale_engine import ScaleEngine
from weather.models import WeatherSnapshot


RENDER_SCENARIOS: Dict[str, dict] = {
    "stillness": {"energy": 0.08, "state_hint": MusicalState.STILLNESS, "mood": "Peaceful"},
    "gentle_rain": {"energy": 0.25, "weather": WeatherSnapshot(condition="Light Rain", weather_code=61)},
    "snow_night": {"energy": 0.15, "weather": WeatherSnapshot(condition="Snow", weather_code=71)},
    "strong_wind": {"energy": 0.55, "weather": WeatherSnapshot(wind_speed_kmh=45.0, condition="Windy")},
    "storm": {"energy": 0.75, "weather": WeatherSnapshot(wind_speed_kmh=70.0, weather_code=95, condition="Thunderstorm")},
    "recovery": {"energy": 0.3, "state_hint": MusicalState.RECOVERY},
    "sunrise": {"energy": 0.4, "state_hint": MusicalState.SUNRISE},
}


def _save_wav(path: Path, stereo: np.ndarray) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    audio = np.clip(stereo, -1.0, 1.0)
    pcm = (audio * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())
    return path


def render_scenario(
    name: str,
    seed: int = 42,
    duration_sec: float = 6.0,
    quality: str = "Standard",
    soundscape: str = "Natural Ambient",
    output_dir: Optional[Path] = None,
) -> Path:
    """Render a short deterministic clip for the given scenario name."""
    if name not in RENDER_SCENARIOS:
        raise ValueError(f"Unknown scenario: {name}")

    scenario = RENDER_SCENARIOS[name]
    random.seed(seed)
    scale = ScaleEngine("D", ScaleName.MINOR)
    comp = CompositionEngine(scale)

    engine = CinematicSynthEngine()
    engine.set_quality(quality)
    engine.set_soundscape(soundscape)

    block = 1024
    total_samples = int(duration_sec * SAMPLE_RATE)
    chunks: List[np.ndarray] = []
    sample_pos = 0

    while sample_pos < total_samples:
        n = min(block, total_samples - sample_pos)
        ctx = CompositionContext(
            raw_energy=scenario["energy"],
            gust=(sample_pos // SAMPLE_RATE) % 5 == 0,
            tempo_min=44.0,
            tempo_max=68.0,
            sample_position=sample_pos,
            weather=scenario.get("weather"),
        )
        plan = comp.tick(ctx)
        if scenario.get("state_hint"):
            plan.musical_state = scenario["state_hint"]
        if scenario.get("mood"):
            plan.mood = scenario["mood"]

        targets = engine.orchestrator.map_plan(plan)
        engine.apply_orchestration(targets, plan.tempo_bpm)
        if plan.chord and plan.chord.tones:
            engine.sustain_chord(
                "main_pad",
                plan.chord.tones,
                0.35 + plan.energy_curve * 0.4,
                targets.layer_presets.get("main_pad", "Warm Horizon"),
            )
        for note in plan.melody_notes[:2]:
            engine.note_on("lead", note.midi, note.velocity, "Soft Pulse")

        chunks.append(engine.render(n))
        sample_pos += n

    stereo = np.concatenate(chunks, axis=0)
    out_dir = output_dir or Path(__file__).resolve().parent.parent / "test-output"
    out_path = out_dir / f"{name}_seed{seed}.wav"
    return _save_wav(out_path, stereo)


def render_all_references(output_dir: Optional[Path] = None, seed: int = 42) -> List[Path]:
    paths = []
    for name in RENDER_SCENARIOS:
        paths.append(render_scenario(name, seed=seed, output_dir=output_dir))
    return paths
