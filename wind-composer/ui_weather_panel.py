"""Weather tab UI: search, stations, favourites, live info."""

from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, simpledialog, ttk
from typing import Callable

from config import REFRESH_INTERVALS_SEC, REFRESH_LABELS
from music_controller import MusicController
from weather.models import GeoLocation

BG = "#12161f"
TEXT = "#c8d4e8"
MUTED = "#8899aa"
ACCENT = "#6b9fd4"


class WeatherPanel(ttk.Frame):
    """Global live weather controls."""

    def __init__(self, parent, controller: MusicController, on_map_focus: Callable[[], None]) -> None:
        super().__init__(parent)
        self.controller = controller
        self.on_map_focus = on_map_focus
        self._station_rows: list[ttk.Frame] = []
        self._build()

    def _build(self) -> None:
        search_row = ttk.Frame(self)
        search_row.pack(fill=tk.X, padx=8, pady=6)

        ttk.Label(search_row, text="Search location:").pack(side=tk.LEFT, padx=4)
        self.search_entry = ttk.Entry(search_row, width=36)
        self.search_entry.pack(side=tk.LEFT, padx=4)
        ttk.Button(search_row, text="Search", command=self._on_search).pack(side=tk.LEFT, padx=4)
        ttk.Button(search_row, text="Add selected", command=self._on_add_selected).pack(side=tk.LEFT, padx=4)

        self.results_combo = ttk.Combobox(search_row, width=40, state="readonly")
        self.results_combo.pack(side=tk.LEFT, padx=8)
        self._search_results: list[GeoLocation] = []

        refresh_row = ttk.Frame(self)
        refresh_row.pack(fill=tk.X, padx=8, pady=4)
        ttk.Label(refresh_row, text="Refresh:").pack(side=tk.LEFT, padx=4)
        self.refresh_combo = ttk.Combobox(
            refresh_row, values=REFRESH_LABELS, width=14, state="readonly",
        )
        self.refresh_combo.pack(side=tk.LEFT, padx=4)
        self.refresh_combo.current(1)  # 30s default
        self.refresh_combo.bind("<<ComboboxSelected>>", self._on_refresh_change)

        ttk.Button(refresh_row, text="Fetch now", command=self._fetch_now).pack(side=tk.LEFT, padx=8)
        ttk.Button(refresh_row, text="Open map", command=self.on_map_focus).pack(side=tk.LEFT, padx=4)

        mid = ttk.Frame(self)
        mid.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)

        # Stations list
        stations_frame = ttk.LabelFrame(mid, text="Active stations (mix sliders)")
        stations_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 6))
        self.stations_container = ttk.Frame(stations_frame)
        self.stations_container.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        # Favourites
        fav_frame = ttk.LabelFrame(mid, text="Favourites")
        fav_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(6, 0))
        self.fav_list = tk.Listbox(
            fav_frame, height=8, bg="#1a1f2a", fg=TEXT,
            selectbackground=ACCENT, highlightthickness=0,
        )
        self.fav_list.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)
        fav_btns = ttk.Frame(fav_frame)
        fav_btns.pack(fill=tk.X, padx=4, pady=4)
        ttk.Button(fav_btns, text="Add favourite", command=self._add_favourite).pack(side=tk.LEFT, padx=2)
        ttk.Button(fav_btns, text="Load", command=self._load_favourite).pack(side=tk.LEFT, padx=2)
        ttk.Button(fav_btns, text="Remove", command=self._remove_favourite).pack(side=tk.LEFT, padx=2)

        self._refresh_favourites_list()

        # Live info panel
        info_frame = ttk.LabelFrame(self, text="Live information")
        info_frame.pack(fill=tk.X, padx=8, pady=6)
        self.info_text = tk.Text(
            info_frame, height=8, bg="#1a1f2a", fg=TEXT,
            font=("Consolas", 9), highlightthickness=0, borderwidth=0,
        )
        self.info_text.pack(fill=tk.X, padx=6, pady=6)
        self.info_text.configure(state=tk.DISABLED)

    def _on_search(self) -> None:
        query = self.search_entry.get().strip()
        if not query:
            return
        results = self.controller.search_locations(query)
        self._search_results = results
        labels = [f"{r.name}, {r.country} ({r.latitude:.2f}, {r.longitude:.2f})" for r in results]
        self.results_combo["values"] = labels
        if labels:
            self.results_combo.current(0)
        else:
            messagebox.showinfo("Search", "No locations found.")

    def _on_add_selected(self) -> None:
        idx = self.results_combo.current()
        if idx < 0 or idx >= len(self._search_results):
            messagebox.showinfo("Add", "Search and select a location first.")
            return
        self.controller.add_station(self._search_results[idx])
        self._refresh_stations_ui()

    def _on_refresh_change(self, _event=None) -> None:
        idx = self.refresh_combo.current()
        if 0 <= idx < len(REFRESH_INTERVALS_SEC):
            self.controller.set_refresh_interval(REFRESH_INTERVALS_SEC[idx])

    def _fetch_now(self) -> None:
        self.controller.fetch_now()

    def _refresh_favourites_list(self) -> None:
        self.fav_list.delete(0, tk.END)
        for fav in self.controller.favourites.list():
            self.fav_list.insert(tk.END, f"{fav.label} — {fav.location.label()}")

    def _add_favourite(self) -> None:
        idx = self.results_combo.current()
        if idx < 0 or idx >= len(self._search_results):
            messagebox.showinfo("Favourite", "Select a search result first.")
            return
        label = simpledialog.askstring("Favourite name", "Label for this location:")
        if not label:
            return
        self.controller.favourites.add(label, self._search_results[idx])
        self._refresh_favourites_list()

    def _load_favourite(self) -> None:
        sel = self.fav_list.curselection()
        if not sel:
            return
        fav = self.controller.favourites.list()[sel[0]]
        self.controller.add_station(fav.location)
        self._refresh_stations_ui()

    def _remove_favourite(self) -> None:
        sel = self.fav_list.curselection()
        if not sel:
            return
        fav = self.controller.favourites.list()[sel[0]]
        self.controller.favourites.remove(fav.id)
        self._refresh_favourites_list()

    def _refresh_stations_ui(self) -> None:
        for row in self._station_rows:
            row.destroy()
        self._station_rows.clear()

        stations = self.controller.station_manager_ref.list_active()
        for i, active in enumerate(stations):
            row = ttk.Frame(self.stations_container)
            row.pack(fill=tk.X, pady=2)
            self._station_rows.append(row)

            name = active.station.display_name
            weather = active.weather
            detail = ""
            if weather:
                detail = f"  {weather.wind_speed_kmh:.0f} km/h {weather.condition}"
            ttk.Label(row, text=f"{name}{detail}", width=42).pack(side=tk.LEFT)

            slider = tk.Scale(
                row, from_=0, to=100, orient=tk.HORIZONTAL, length=100,
                bg=BG, fg=TEXT, highlightthickness=0,
                command=lambda v, idx=i: self.controller.station_manager_ref.set_mix(idx, int(v) / 100.0),
            )
            slider.set(int(active.mix * 100))
            slider.pack(side=tk.LEFT, padx=4)

            ttk.Button(
                row, text="✕",
                command=lambda idx=i: self._remove_station(idx),
                width=3,
            ).pack(side=tk.LEFT)

    def _remove_station(self, index: int) -> None:
        self.controller.station_manager_ref.remove_at(index)
        self._refresh_stations_ui()

    def update_live_info(self) -> None:
        info = self.controller.get_live_info()
        self.info_text.configure(state=tk.NORMAL)
        self.info_text.delete("1.0", tk.END)
        text = (
            f"Location:     {info.location_label}\n"
            f"Condition:    {info.condition}\n"
            f"Wind:         {info.wind_speed_kmh:.1f} km/h @ {info.wind_direction_deg:.0f}°\n"
            f"Temperature:  {info.temperature_c:.1f} °C\n"
            f"Station time: {info.station_update}\n"
            f"Input:        {info.input_source}\n"
            f"Stations:     {info.station_count}\n"
            f"Mode:         {info.mode}  |  Key: {info.key}\n"
            f"Chord:        {info.chord}  |  BPM: {info.tempo_bpm:.0f}\n"
        )
        if info.fetch_error:
            text += f"API error:    {info.fetch_error}\n"
        self.info_text.insert("1.0", text)
        self.info_text.configure(state=tk.DISABLED)
        self._refresh_stations_ui()
