export interface ChordDto {
  name: string;
  tones: number[];
  root_midi: number;
  degree_index: number;
}

export interface MelodyNoteDto {
  midi: number;
  velocity: number;
  duration_sec: number;
}

export interface RhythmEventDto {
  layer: string;
  strength: number;
  is_pulse: boolean;
}

export interface CompositionPlan {
  energy_curve: number;
  mood: string;
  musical_state: string;
  tempo_bpm: number;
  chord: ChordDto | null;
  melody_notes: MelodyNoteDto[];
  rhythm_mode: string;
  rhythm_events: RhythmEventDto[];
  reverb_amount: number;
  stereo_pan: number;
  brightness: number;
  gust_accent: boolean;
  rare_event: string | null;
  phrase_number: number;
  phrase_length_bars: number;
  percussion: number;
  musical_style?: string;
  song_section?: string;
  local_time_str?: string;
  weather_hints?: string[];
  transition_fx?: string | null;
  bass_notes?: MelodyNoteDto[];
  drum_events?: RhythmEventDto[];
  arrangement_gains?: Record<string, number>;
}

export interface WeatherSnapshot {
  wind_speed_kmh: number;
  wind_gust_kmh: number;
  wind_direction_deg: number;
  temperature_c: number;
  humidity_pct: number;
  pressure_hpa: number;
  precipitation_mm: number;
  snowfall_mm: number;
  cloud_cover_pct: number;
  weather_code: number;
  condition: string;
  timestamp?: string;
}

export interface MusicDriveParams {
  energy: number;
  gust: boolean;
  tempo_bpm: number;
  stereo_pan: number;
  reverb_amount: number;
  bass_intensity: number;
  percussion: number;
  atmosphere_layers: number;
  brightness: number;
  instrument_warmth: number;
}

export interface GeoLocation {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation_m?: number;
}

export interface Station {
  id: string;
  location: GeoLocation;
  display_name: string;
  mix: number;
  enabled: boolean;
  weather: WeatherSnapshot | null;
}

export interface AppSettings {
  mode: string;
  scale: string;
  key: string;
  master_volume: number;
  sensitivity: number;
  input_source: string;
  audio_quality: string;
  soundscape_preset: string;
  reverb_amount: number;
  width_amount: number;
  brightness_amount: number;
  warmth_amount: number;
  musical_style: string;
  refresh_interval_sec: number;
}

export interface Favourite {
  id: string;
  label: string;
  location: GeoLocation;
}

export interface TickResult {
  plan: CompositionPlan;
  orchestration: {
    layer_gains: Record<string, number>;
    layer_presets: Record<string, string>;
    active_layers: string[];
    reverb_wet: number;
    delay_wet: number;
    width: number;
    warmth: number;
    stereo_pan: number;
    trigger_impact: string | null;
  };
  sound_tweaks: {
    reverb: number;
    width: number;
    brightness: number;
    warmth: number;
    master: number;
  };
  bassPattern?: number[];
}
