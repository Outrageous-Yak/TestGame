export const SAMPLE_RATE = 44100;

export const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const NOTE_TO_MIDI: Record<string, number> = Object.fromEntries(KEYS.map((k, i) => [k, i]));

export type ModeName = "Ambient" | "Dream" | "Electronic" | "Forest" | "Ocean";
export type ScaleName = "Major" | "Minor" | "Pentatonic" | "Dorian" | "Mixolydian" | "Natural Minor";
export type InputSource = "Microphone" | "Live Weather" | "Both";

export const MODE_PROFILES: Record<ModeName, { tempoMin: number; tempoMax: number }> = {
  Ambient: { tempoMin: 40, tempoMax: 60 },
  Dream: { tempoMin: 36, tempoMax: 56 },
  Electronic: { tempoMin: 72, tempoMax: 96 },
  Forest: { tempoMin: 44, tempoMax: 68 },
  Ocean: { tempoMin: 38, tempoMax: 58 },
};

export const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  Pentatonic: [0, 2, 4, 7, 9],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

export const SOUNDSCAPE_PRESETS = [
  "Natural Ambient", "Deep Space", "Frozen World", "Cinematic Storm",
  "Dreaming Earth", "Minimal Air", "Dark Horizon", "Luminous Sky",
] as const;

export const AUDIO_QUALITY_LEVELS = ["Low", "Standard", "High"] as const;

export const MUSICAL_STYLES = [
  "Ambient", "Chillout", "Deep House", "Melodic House", "Progressive House",
  "Melodic Techno", "Trance", "UK Trance", "Synthwave", "Downtempo", "Electronic Orchestra",
] as const;

export const REFRESH_INTERVALS_SEC = [10, 20, 30, 60, 120, 300];
export const REFRESH_LABELS = ["10s", "20s", "30s", "60s", "2m", "5m", "Adaptive"];

export const SETTINGS_KEY = "wind_composer_web_settings";
export const FAVOURITES_KEY = "wind_composer_web_favourites";
export const STATIONS_KEY = "wind_composer_web_stations";
