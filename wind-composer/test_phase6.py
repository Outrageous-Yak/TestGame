"""Phase 6 tests — tempo smoothing and weather trends."""

from tempo_engine import TempoEngine, wind_to_target_bpm
from weather_memory import WeatherMemory
from weather.models import WeatherSnapshot


def _snap(wind: float, pressure: float = 1013.0) -> WeatherSnapshot:
    return WeatherSnapshot(
        wind_speed_kmh=wind,
        wind_gust_kmh=wind + 5,
        wind_direction_deg=180,
        temperature_c=15,
        humidity_pct=60,
        pressure_hpa=pressure,
        precipitation_mm=0,
        snowfall_mm=0,
        cloud_cover_pct=50,
        weather_code=0,
        condition="Clear",
    )


def test_tempo_smoothing_max_one_bpm_per_bar():
    engine = TempoEngine()
    engine.reset(100)
    bpm = engine.update(130, 90, 140, 0, False)
    assert bpm == 100
    bpm = engine.update(130, 90, 140, 1, False)
    assert bpm == 101
    bpm = engine.update(130, 90, 140, 2, False)
    assert bpm == 102


def test_gust_tempo_boost_decays():
    engine = TempoEngine()
    engine.reset(120)
    bpm = engine.update(120, 110, 130, 1, True)
    assert bpm >= 121
    engine.update(120, 110, 130, 2, False)
    assert engine.current_bpm <= bpm


def test_wind_to_target_bpm():
    low = wind_to_target_bpm(0, 112, 124)
    mid = wind_to_target_bpm(22, 112, 124)
    high = wind_to_target_bpm(45, 112, 124)
    assert low < mid < high
    assert 112 <= low <= 124
    assert 112 <= high <= 124


def test_weather_trend_storm_likelihood():
    mem = WeatherMemory(20)
    mem.push(_snap(10, 1020))
    mem.push(_snap(25, 1005))
    trend = mem.trend()
    assert trend.wind_delta > 0
    assert trend.avg_wind_kmh > 0
