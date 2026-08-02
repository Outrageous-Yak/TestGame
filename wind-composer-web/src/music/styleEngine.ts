export const MUSICAL_STYLES = [
  "Ambient",
  "Chillout",
  "Deep House",
  "Melodic House",
  "Progressive House",
  "Melodic Techno",
  "Trance",
  "Synthwave",
  "Downtempo",
  "Electronic Orchestra",
] as const;

export type MusicalStyleName = typeof MUSICAL_STYLES[number];

export interface StyleProfile {
  bpmMin: number;
  bpmMax: number;
  kickPattern: number[];
  drumDensity: number;
  leadActivity: number;
  bassLayers: number;
  fillProbability: number;
}

const KICK_FOUR = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const KICK_HOUSE = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0];
const KICK_MINIMAL = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];

export const STYLE_PROFILES: Record<MusicalStyleName, StyleProfile> = {
  Ambient: { bpmMin: 40, bpmMax: 68, kickPattern: KICK_MINIMAL, drumDensity: 0.1, leadActivity: 0.2, bassLayers: 0.15, fillProbability: 0.08 },
  Chillout: { bpmMin: 72, bpmMax: 96, kickPattern: KICK_FOUR, drumDensity: 0.35, leadActivity: 0.35, bassLayers: 0.35, fillProbability: 0.15 },
  "Deep House": { bpmMin: 118, bpmMax: 124, kickPattern: KICK_HOUSE, drumDensity: 0.55, leadActivity: 0.4, bassLayers: 0.5, fillProbability: 0.22 },
  "Melodic House": { bpmMin: 120, bpmMax: 126, kickPattern: KICK_HOUSE, drumDensity: 0.6, leadActivity: 0.55, bassLayers: 0.45, fillProbability: 0.25 },
  "Progressive House": { bpmMin: 124, bpmMax: 128, kickPattern: KICK_FOUR, drumDensity: 0.5, leadActivity: 0.5, bassLayers: 0.45, fillProbability: 0.2 },
  "Melodic Techno": { bpmMin: 124, bpmMax: 132, kickPattern: KICK_FOUR, drumDensity: 0.65, leadActivity: 0.5, bassLayers: 0.55, fillProbability: 0.28 },
  Trance: { bpmMin: 132, bpmMax: 140, kickPattern: KICK_FOUR, drumDensity: 0.7, leadActivity: 0.65, bassLayers: 0.5, fillProbability: 0.3 },
  Synthwave: { bpmMin: 95, bpmMax: 110, kickPattern: KICK_FOUR, drumDensity: 0.45, leadActivity: 0.45, bassLayers: 0.4, fillProbability: 0.18 },
  Downtempo: { bpmMin: 80, bpmMax: 100, kickPattern: KICK_MINIMAL, drumDensity: 0.25, leadActivity: 0.3, bassLayers: 0.3, fillProbability: 0.12 },
  "Electronic Orchestra": { bpmMin: 60, bpmMax: 90, kickPattern: KICK_MINIMAL, drumDensity: 0.2, leadActivity: 0.55, bassLayers: 0.35, fillProbability: 0.1 },
};

export function getStyle(name: string): StyleProfile {
  return STYLE_PROFILES[name as MusicalStyleName] ?? STYLE_PROFILES.Ambient;
}
