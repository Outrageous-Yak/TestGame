"""Tests for generative composition engine."""

import time

from composition_engine import CompositionContext, CompositionEngine, MusicalState
from config import ScaleName, SAMPLE_RATE
from scale_engine import ScaleEngine
from weather.models import WeatherSnapshot


def test_composition_evolves_state() -> None:
    se = ScaleEngine("C", ScaleName.MINOR)
    comp = CompositionEngine(se)
    states_seen = set()

    for i in range(800):
        ctx = CompositionContext(
            raw_energy=0.1 + (i % 50) * 0.015,
            gust=i % 17 == 0,
            tempo_min=40.0,
            tempo_max=72.0,
            sample_position=i * 22050,  # ~0.5 sec chunks, many measures
        )
        plan = comp.tick(ctx)
        states_seen.add(plan.musical_state)

    assert len(states_seen) >= 2
    assert plan.tempo_bpm >= 40.0


def test_memory_avoids_identical_chords() -> None:
    se = ScaleEngine("D", ScaleName.MINOR)
    comp = CompositionEngine(se)
    comp._progression_key = "minor_modal"
    degrees = []
    for i in range(12):
        comp._on_phrase_boundary(
            CompositionContext(sample_position=i * 100000, tempo_min=40, tempo_max=60),
            0.4,
            comp._personality,
        )
        if comp._current_chord:
            degrees.append(comp._current_chord.degree_index)

    # Should not be all identical
    assert len(set(degrees)) > 1


def test_storm_weather_personality() -> None:
    se = ScaleEngine("C", ScaleName.MINOR)
    comp = CompositionEngine(se)
    storm = WeatherSnapshot(wind_speed_kmh=70.0, weather_code=95, condition="Thunderstorm")
    ctx = CompositionContext(
        raw_energy=0.6,
        weather=storm,
        sample_position=SAMPLE_RATE * 4,
        tempo_min=40.0,
        tempo_max=80.0,
    )
    plan = comp.tick(ctx)
    assert comp._personality.power > 0.5
    assert plan.mood.lower().find("storm") >= 0 or plan.energy_curve > 0.3


def test_phrase_lengths_valid() -> None:
    se = ScaleEngine("C", ScaleName.PENTATONIC)
    comp = CompositionEngine(se)
    for bars in comp.PHRASE_LENGTHS:
        comp._phrase_length_bars = bars
        assert bars in (4, 8, 16, 32)


if __name__ == "__main__":
    test_composition_evolves_state()
    test_memory_avoids_identical_chords()
    test_storm_weather_personality()
    test_phrase_lengths_valid()
    print("Composition tests passed")
