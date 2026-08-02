"""Tests for weather mapping and provider parsing."""

from weather.models import WeatherSnapshot
from weather.weather_mapper import WeatherMapper


def test_mapper_calm_wind_low_energy() -> None:
    mapper = WeatherMapper()
    weather = WeatherSnapshot(wind_speed_kmh=2.0, wind_gust_kmh=3.0, humidity_pct=50.0, pressure_hpa=1013.0)
    params = mapper.map_snapshot(weather, 40.0, 80.0)
    assert params.energy < 0.25
    assert 40.0 <= params.tempo_bpm <= 80.0


def test_mapper_strong_wind_high_energy() -> None:
    mapper = WeatherMapper()
    weather = WeatherSnapshot(
        wind_speed_kmh=55.0,
        wind_gust_kmh=75.0,
        wind_direction_deg=270.0,
        humidity_pct=80.0,
        pressure_hpa=1000.0,
        precipitation_mm=5.0,
        weather_code=95,
    )
    params = mapper.map_snapshot(weather, 40.0, 100.0)
    assert params.energy > 0.5
    assert params.percussion > 0.2
    assert params.stereo_pan != 0.0


if __name__ == "__main__":
    test_mapper_calm_wind_low_energy()
    test_mapper_strong_wind_high_energy()
    print("Weather tests passed")
