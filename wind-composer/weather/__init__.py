"""Weather package — modular live global wind data."""

from weather.favourite_manager import FavouriteManager
from weather.location_manager import LocationManager
from weather.open_meteo import OpenMeteoProvider
from weather.provider_base import WeatherProvider
from weather.station_manager import StationManager
from weather.weather_cache import WeatherCache
from weather.weather_fetcher import WeatherFetcher
from weather.weather_mapper import WeatherMapper

__all__ = [
    "FavouriteManager",
    "LocationManager",
    "OpenMeteoProvider",
    "StationManager",
    "WeatherCache",
    "WeatherFetcher",
    "WeatherMapper",
    "WeatherProvider",
]
