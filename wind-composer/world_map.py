"""Interactive world map for location selection."""

from __future__ import annotations

from typing import Callable, List, Optional, Tuple

import numpy as np
from matplotlib.axes import Axes
from matplotlib.figure import Figure
from matplotlib.lines import Line2D

from weather.models import GeoLocation


class WorldMap:
    """
    Clickable equirectangular world map.

    Users can pan/zoom and click to select coordinates.
    """

    def __init__(
        self,
        figure: Figure,
        on_location_selected: Callable[[float, float], None],
    ) -> None:
        self.figure = figure
        self.on_location_selected = on_location_selected
        self.ax: Axes = figure.add_subplot(111)
        self._markers: List[Line2D] = []
        self._stations: List[Tuple[float, float, str]] = []

        self.ax.set_facecolor("#0d1520")
        self.ax.set_xlim(-180, 180)
        self.ax.set_ylim(-90, 90)
        self.ax.set_xlabel("Longitude", color="#8899aa", fontsize=9)
        self.ax.set_ylabel("Latitude", color="#8899aa", fontsize=9)
        self.ax.tick_params(colors="#8899aa", labelsize=8)
        self.ax.grid(True, color="#2a3545", linewidth=0.5, alpha=0.6)
        for spine in self.ax.spines.values():
            spine.set_color("#334455")

        # Simple continent hints (rough polygons as scatter regions)
        self._draw_graticule_hint()
        self.ax.set_title("World Map — click to select location", color="#c8d4e8", fontsize=10)

        figure.patch.set_facecolor("#12161f")
        self._cid = figure.canvas.mpl_connect("button_press_event", self._on_click)

    def _draw_graticule_hint(self) -> None:
        # Equator and prime meridian emphasis
        self.ax.axhline(0, color="#3a4a5a", linewidth=0.8, alpha=0.5)
        self.ax.axvline(0, color="#3a4a5a", linewidth=0.8, alpha=0.5)

    def _on_click(self, event) -> None:
        if event.inaxes != self.ax or event.xdata is None or event.ydata is None:
            return
        lon = float(np.clip(event.xdata, -180, 180))
        lat = float(np.clip(event.ydata, -90, 90))
        self.on_location_selected(lat, lon)

    def set_station_markers(self, stations: List[Tuple[float, float, str]]) -> None:
        """Update markers: list of (lat, lon, label)."""
        self._stations = stations
        for m in self._markers:
            m.remove()
        self._markers.clear()
        for lat, lon, _ in stations:
            marker, = self.ax.plot(lon, lat, "o", color="#6b9fd4", markersize=7, markeredgecolor="#fff", zorder=5)
            self._markers.append(marker)

    def highlight_point(self, latitude: float, longitude: float) -> None:
        self.ax.plot(
            longitude, latitude, "x", color="#e07070", markersize=12, markeredgewidth=2, zorder=6,
        )
        self.figure.canvas.draw_idle()

    def disconnect(self) -> None:
        if self._cid:
            self.figure.canvas.mpl_disconnect(self._cid)
