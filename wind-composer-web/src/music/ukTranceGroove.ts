/** UK Trance reference patterns — euphoric supersaw + rolling offbeat bass. */

export const UK_TRANCE_KICK = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
export const UK_TRANCE_HAT = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
export const UK_TRANCE_RIDE = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1];

export const UK_TRANCE_TEMPO = {
  minBpm: 134,
  preferredLow: 138,
  preferredHigh: 142,
  maxBpm: 146,
  maxChangePerBar: 0.75,
  gustMaxChangePerBar: 1.5,
};

export const UK_TRANCE_MIX = {
  padGainMax: 0.28,
  atmosphereMax: 0.14,
  leadGainMin: 0.72,
  noiseBudget: 0.48,
  kickDryness: 0.97,
  sidechainAmount: 0.38,
};

export type UkTranceBassFamily =
  | "rolling"
  | "rolling_fifth"
  | "pump"
  | "breakdown";

/** 16-step rolling offbeat bass (one bar). */
export function ukTranceBassPattern(
  family: UkTranceBassFamily,
  rootMidi: number,
): number[] {
  const r = rootMidi;
  const fifth = r + 7;
  switch (family) {
    case "rolling":
      // Classic offbeat 16ths: and-of-each-beat emphasis
      return [0, r, 0, r, 0, r, 0, fifth, 0, r, 0, r, 0, fifth, 0, r];
    case "rolling_fifth":
      return [0, r, 0, fifth, 0, r, 0, fifth, 0, r, 0, fifth, 0, r, 0, fifth];
    case "pump":
      return [r, 0, r, 0, r, 0, r, 0, r, 0, r, 0, r, 0, r, 0];
    case "breakdown":
      return [r, 0, 0, 0, 0, 0, 0, 0, r, 0, 0, 0, 0, 0, 0, 0];
    default:
      return [0, r, 0, r, 0, r, 0, r, 0, r, 0, r, 0, r, 0, r];
  }
}

/** Euphoric hook degrees (major-ish within scale). */
export const UK_TRANCE_HOOK_CONTOURS = {
  rising: [0, 2, 4, 7, 4],
  arch: [0, 2, 4, 7, 9, 7],
  call: [0, 2, 4, 2],
  answer: [4, 2, 0, -1],
} as const;
