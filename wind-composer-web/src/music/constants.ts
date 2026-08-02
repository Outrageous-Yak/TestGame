export type MusicalState =
  | "Stillness" | "Gentle Motion" | "Flow" | "Building" | "Power"
  | "Storm" | "Recovery" | "Sunrise" | "Sunset" | "Night";

export type RhythmMode =
  | "none" | "slow_pulse" | "heartbeat" | "arpeggio" | "gentle_perc"
  | "electronic_pulse" | "storm_perc";

export const STATE_PROFILE: Record<MusicalState, {
  tempoF: number; melody: number; rhythm: RhythmMode; reverb: number;
  pad: number; bass: number; lead: number; atmo: number;
}> = {
  Stillness: { tempoF: 0.75, melody: 0.08, rhythm: "none", reverb: 0.65, pad: 0.35, bass: 0.05, lead: 0, atmo: 0.2 },
  "Gentle Motion": { tempoF: 0.85, melody: 0.25, rhythm: "slow_pulse", reverb: 0.55, pad: 0.45, bass: 0.15, lead: 0.2, atmo: 0.25 },
  Flow: { tempoF: 1, melody: 0.4, rhythm: "arpeggio", reverb: 0.5, pad: 0.5, bass: 0.25, lead: 0.35, atmo: 0.3 },
  Building: { tempoF: 1.08, melody: 0.45, rhythm: "heartbeat", reverb: 0.45, pad: 0.55, bass: 0.35, lead: 0.4, atmo: 0.35 },
  Power: { tempoF: 1.12, melody: 0.5, rhythm: "electronic_pulse", reverb: 0.4, pad: 0.6, bass: 0.5, lead: 0.45, atmo: 0.4 },
  Storm: { tempoF: 1.05, melody: 0.35, rhythm: "storm_perc", reverb: 0.55, pad: 0.7, bass: 0.65, lead: 0.3, atmo: 0.55 },
  Recovery: { tempoF: 0.8, melody: 0.2, rhythm: "none", reverb: 0.7, pad: 0.4, bass: 0.1, lead: 0.15, atmo: 0.25 },
  Sunrise: { tempoF: 0.9, melody: 0.35, rhythm: "arpeggio", reverb: 0.5, pad: 0.5, bass: 0.2, lead: 0.35, atmo: 0.3 },
  Sunset: { tempoF: 0.82, melody: 0.28, rhythm: "slow_pulse", reverb: 0.6, pad: 0.45, bass: 0.15, lead: 0.25, atmo: 0.35 },
  Night: { tempoF: 0.78, melody: 0.15, rhythm: "none", reverb: 0.72, pad: 0.4, bass: 0.12, lead: 0.1, atmo: 0.35 },
};

export const PROGRESSIONS: Record<string, number[][]> = {
  minor_modal: [[0, 5, 2, 6], [0, 6, 4, 5], [0, 3, 5, 2]],
  major_hope: [[0, 4, 5, 3], [0, 5, 3, 4]],
  drone: [[0], [0, 0, 4], [0, 5]],
  suspended: [[0, 4, 5], [2, 5, 0], [5, 3, 0]],
  quartal: [[0, 2, 4, 6], [4, 6, 1, 3]],
};

export const PHRASE_LENGTHS = [4, 8, 16, 32];
