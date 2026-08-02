"""Phase 5 intelligent composer tests."""

from composition_engine import CompositionContext, CompositionEngine
from config import ScaleName
from intelligent_composer import IntelligentComposer
from scale_engine import ScaleEngine
from style_engine import MusicalStyle, get_style, style_bpm_range
from weather.models import WeatherSnapshot


def test_all_styles_defined() -> None:
    for style in MusicalStyle:
        profile = get_style(style.value)
        assert profile.bpm_min < profile.bpm_max
        assert len(profile.kick_pattern) == 16


def test_intelligent_enhance_adds_drums() -> None:
    se = ScaleEngine("C", ScaleName.MINOR)
    comp = CompositionEngine(se)
    comp.set_musical_style("Deep House")
    ctx = CompositionContext(
        raw_energy=0.5,
        tempo_min=40,
        tempo_max=140,
        sample_position=44100 * 2,
        weather=WeatherSnapshot(wind_speed_kmh=25, precipitation_mm=1.0),
    )
    plan = comp.tick(ctx)
    assert plan.musical_style == "Deep House"
    assert plan.song_section
    assert plan.tempo_bpm >= get_style("Deep House").bpm_min


def test_weather_memory_trend() -> None:
    from weather_memory import WeatherMemory
    mem = WeatherMemory(5)
    mem.push(WeatherSnapshot(wind_speed_kmh=10, pressure_hpa=1020))
    mem.push(WeatherSnapshot(wind_speed_kmh=30, pressure_hpa=1005))
    trend = mem.trend()
    assert trend.wind_delta > 0
    assert trend.storm_likelihood > 0


def test_probability_weighted() -> None:
    from probability_engine import WeightedChoice, weighted_choice
    r = weighted_choice([
        WeightedChoice("a", 0),
        WeightedChoice("b", 1),
    ])
    assert r == "b"


if __name__ == "__main__":
    test_all_styles_defined()
    test_intelligent_enhance_adds_drums()
    test_weather_memory_trend()
    test_probability_weighted()
    print("Phase 5 tests passed")
