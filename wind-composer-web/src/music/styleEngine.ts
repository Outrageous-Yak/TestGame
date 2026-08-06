export const MUSICAL_STYLES = [
  "Ambient",
  "Chillout",
  "Deep House",
  "Melodic House",
  "Progressive House",
  "Melodic Techno",
  "Trance",
  "UK Trance",
  "Synthwave",
  "Downtempo",
  "Electronic Orchestra",
] as const;

export type MusicalStyleName = typeof MUSICAL_STYLES[number];

export interface StyleProfile {
  name: MusicalStyleName;
  bpmMin: number;
  bpmMax: number;
  kickPattern: number[];
  hatPattern: number[];
  bassStyle: string;
  drumDensity: number;
  leadActivity: number;
  fillProbability: number;
  transitionProbability: number;
  swing: number;
  padLayers: number;
  bassLayers: number;
  leadLayers: number;
  offbeatOpenHat: boolean;
  useClap: boolean;
}

const KICK_FOUR = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const KICK_HOUSE = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0];
const KICK_MINIMAL = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
const KICK_TRANCE = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0];
const HAT_OFFBEAT = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
const HAT_16TH = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
const HAT_MINIMAL = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const HAT_BROKEN = [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0];

function profile(
  name: MusicalStyleName,
  bpmMin: number,
  bpmMax: number,
  kick: number[],
  hat: number[],
  bassStyle: string,
  drumDensity: number,
  leadActivity: number,
  bassLayerGain: number,
  fillProb: number,
  transProb: number,
  swing: number,
  extras: Partial<StyleProfile> = {},
): StyleProfile {
  return {
    name,
    bpmMin,
    bpmMax,
    kickPattern: kick,
    hatPattern: hat,
    bassStyle,
    drumDensity,
    leadActivity,
    bassLayers: extras.bassLayers ?? bassLayerGain,
    fillProbability: fillProb,
    transitionProbability: transProb,
    swing,
    padLayers: extras.padLayers ?? 0.5,
    leadLayers: extras.leadLayers ?? leadActivity,
    offbeatOpenHat: extras.offbeatOpenHat ?? false,
    useClap: extras.useClap ?? false,
  };
}

export const STYLE_PROFILES: Record<MusicalStyleName, StyleProfile> = {
  Ambient: profile("Ambient", 45, 70, KICK_MINIMAL, HAT_MINIMAL, "ambient", 0.08, 0.18, 0.12, 0.06, 0.04, 0, {
    padLayers: 0.72,
    leadLayers: 0.15,
  }),
  Chillout: profile("Chillout", 75, 95, KICK_FOUR, HAT_OFFBEAT, "house", 0.38, 0.38, 0.38, 0.14, 0.09, 0.04, {
    padLayers: 0.55,
    useClap: true,
  }),
  "Deep House": profile("Deep House", 110, 126, KICK_FOUR, HAT_OFFBEAT, "house", 0.58, 0.42, 0.52, 0.24, 0.14, 0.06, {
    padLayers: 0.42,
    offbeatOpenHat: true,
    useClap: true,
  }),
  "Melodic House": profile("Melodic House", 118, 126, KICK_HOUSE, HAT_OFFBEAT, "house", 0.62, 0.58, 0.48, 0.26, 0.16, 0.05, {
    padLayers: 0.48,
    offbeatOpenHat: true,
  }),
  "Progressive House": profile("Progressive House", 118, 128, KICK_FOUR, HAT_OFFBEAT, "progressive", 0.52, 0.52, 0.46, 0.22, 0.18, 0.03, {
    padLayers: 0.52,
  }),
  "Melodic Techno": profile("Melodic Techno", 120, 132, KICK_FOUR, HAT_MINIMAL, "techno", 0.68, 0.52, 0.58, 0.3, 0.2, 0.02, {
    padLayers: 0.38,
    leadLayers: 0.52,
  }),
  Trance: profile("Trance", 128, 142, KICK_TRANCE, HAT_16TH, "trance", 0.74, 0.68, 0.52, 0.32, 0.22, 0, {
    padLayers: 0.42,
    leadLayers: 0.62,
  }),
  "UK Trance": profile("UK Trance", 134, 146, KICK_FOUR, HAT_16TH, "uk_trance", 0.82, 0.78, 0.58, 0.36, 0.28, 0, {
    padLayers: 0.28,
    leadLayers: 0.82,
    bassLayers: 0.62,
  }),
  Synthwave: profile("Synthwave", 95, 118, KICK_FOUR, HAT_OFFBEAT, "house", 0.48, 0.48, 0.42, 0.18, 0.12, 0.05, {
    padLayers: 0.5,
    useClap: true,
  }),
  Downtempo: profile("Downtempo", 80, 100, KICK_MINIMAL, HAT_BROKEN, "ambient", 0.28, 0.32, 0.32, 0.12, 0.08, 0.08, {
    padLayers: 0.58,
  }),
  "Electronic Orchestra": profile("Electronic Orchestra", 60, 90, KICK_MINIMAL, HAT_MINIMAL, "progressive", 0.18, 0.55, 0.35, 0.1, 0.14, 0, {
    padLayers: 0.55,
    leadLayers: 0.48,
  }),
};

export function getStyle(name: string): StyleProfile {
  return STYLE_PROFILES[name as MusicalStyleName] ?? STYLE_PROFILES.Ambient;
}
