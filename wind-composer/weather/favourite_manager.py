"""Persist favourite locations."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import List

from weather.models import FavouriteLocation, GeoLocation

FAVOURITES_PATH = Path.home() / ".wind_composer_favourites.json"


class FavouriteManager:
    """Save and load favourite weather locations."""

    def __init__(self) -> None:
        self._favourites: List[FavouriteLocation] = []
        self.load()

    def list(self) -> List[FavouriteLocation]:
        return list(self._favourites)

    def add(self, label: str, location: GeoLocation) -> FavouriteLocation:
        fav = FavouriteLocation(id=str(uuid.uuid4()), label=label, location=location)
        self._favourites.append(fav)
        self.save()
        return fav

    def remove(self, fav_id: str) -> None:
        self._favourites = [f for f in self._favourites if f.id != fav_id]
        self.save()

    def save(self) -> None:
        data = [
            {
                "id": f.id,
                "label": f.label,
                "location": {
                    "id": f.location.id,
                    "name": f.location.name,
                    "country": f.location.country,
                    "latitude": f.location.latitude,
                    "longitude": f.location.longitude,
                    "elevation_m": f.location.elevation_m,
                    "timezone": f.location.timezone,
                    "feature_code": f.location.feature_code,
                },
            }
            for f in self._favourites
        ]
        FAVOURITES_PATH.write_text(json.dumps(data, indent=2))

    def load(self) -> None:
        if not FAVOURITES_PATH.exists():
            self._favourites = []
            return
        try:
            raw = json.loads(FAVOURITES_PATH.read_text())
            self._favourites = []
            for item in raw:
                loc_data = item["location"]
                loc = GeoLocation(
                    id=loc_data.get("id", ""),
                    name=loc_data.get("name", ""),
                    country=loc_data.get("country", ""),
                    latitude=float(loc_data["latitude"]),
                    longitude=float(loc_data["longitude"]),
                    elevation_m=loc_data.get("elevation_m"),
                    timezone=loc_data.get("timezone"),
                    feature_code=loc_data.get("feature_code"),
                )
                self._favourites.append(
                    FavouriteLocation(id=item["id"], label=item["label"], location=loc)
                )
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            self._favourites = []
