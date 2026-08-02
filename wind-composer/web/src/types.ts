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

export interface CompositionPlanDto {
  energy_curve: number;
  mood: string;
  musical_state: string;
  tempo_bpm: number;
  chord: ChordDto | null;
  melody_notes: MelodyNoteDto[];
  rhythm_events: { layer: string; strength: number; is_pulse: boolean }[];
  reverb_amount: number;
  stereo_pan: number;
  brightness: number;
  gust_accent: boolean;
  rare_event: string | null;
  phrase_number: number;
}

export interface OrchestrationDto {
  layer_gains: Record<string, number>;
  layer_presets: Record<string, string>;
  active_layers: string[];
  reverb_wet: number;
  delay_wet: number;
  width: number;
  brightness: number;
  warmth: number;
  stereo_pan: number;
  reverb_profile: string;
  delay_division: string;
  trigger_impact: string | null;
}

export interface LiveInfoDto {
  location_label: string;
  condition: string;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  temperature_c: number;
  tempo_bpm: number;
  chord: string;
  mode: string;
  key: string;
  composition_state: string;
  mood: string;
  phrase_number: number;
  station_count: number;
  fetch_error: string | null;
}

export interface TickResponse {
  plan: CompositionPlanDto;
  orchestration: OrchestrationDto;
  live_info: LiveInfoDto;
  sound_tweaks: {
    reverb: number;
    width: number;
    brightness: number;
    warmth: number;
    master: number;
    quality: string;
  };
  fft: number[];
}

export interface SettingsDto {
  mode: string;
  scale: string;
  key: string;
  master_volume: number;
  sensitivity: number;
  input_source: string;
  refresh_interval_sec: number;
  audio_quality: string;
  soundscape_preset: string;
  reverb_amount: number;
  width_amount: number;
  brightness_amount: number;
  warmth_amount: number;
}

export interface StationDto {
  id: string;
  display_name: string;
  location: GeoLocationDto;
  mix: number;
  enabled: boolean;
  weather: WeatherDto | null;
}

export interface GeoLocationDto {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation_m?: number;
  label?: string;
}

export interface WeatherDto {
  condition: string;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  temperature_c: number;
  weather_code: number;
}
