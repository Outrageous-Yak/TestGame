import {
  FAVOURITES_KEY, SETTINGS_KEY, STATIONS_KEY,
} from "./config";
import type { AppSettings, Favourite, GeoLocation, Station } from "./types";
import { fetchWeather } from "./weather/openMeteo";

const DEFAULT_SETTINGS: AppSettings = {
  mode: "Ambient",
  scale: "Minor",
  key: "C",
  master_volume: 0.75,
  sensitivity: 0.6,
  input_source: "Microphone",
  audio_quality: "Standard",
  soundscape_preset: "Natural Ambient",
  reverb_amount: 0.45,
  width_amount: 0.35,
  brightness_amount: 0.5,
  warmth_amount: 0.5,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadFavourites(): Favourite[] {
  try {
    return JSON.parse(localStorage.getItem(FAVOURITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveFavourites(favs: Favourite[]): void {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favs));
}

export function loadStations(): Station[] {
  try {
    return JSON.parse(localStorage.getItem(STATIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveStations(stations: Station[]): void {
  localStorage.setItem(STATIONS_KEY, JSON.stringify(stations));
}

export class StationStore {
  stations: Station[] = loadStations();

  list(): Station[] {
    return this.stations;
  }

  add(location: GeoLocation, mix = 1): Station {
    const dup = this.stations.find(
      (s) => Math.abs(s.location.latitude - location.latitude) < 0.01
        && Math.abs(s.location.longitude - location.longitude) < 0.01,
    );
    if (dup) return dup;
    const station: Station = {
      id: location.id || `st-${Date.now()}`,
      location,
      display_name: location.name + (location.country ? `, ${location.country}` : ""),
      mix,
      enabled: true,
      weather: null,
    };
    this.stations.push(station);
    saveStations(this.stations);
    return station;
  }

  remove(id: string): void {
    this.stations = this.stations.filter((s) => s.id !== id);
    saveStations(this.stations);
  }

  setMix(id: string, mix: number): void {
    const s = this.stations.find((x) => x.id === id);
    if (s) s.mix = Math.max(0, Math.min(1, mix));
    saveStations(this.stations);
  }

  async refreshAll(): Promise<void> {
    for (const s of this.stations) {
      if (!s.enabled) continue;
      try {
        s.weather = await fetchWeather(s.location.latitude, s.location.longitude);
      } catch {
        /* skip failed station */
      }
    }
    saveStations(this.stations);
  }
}
