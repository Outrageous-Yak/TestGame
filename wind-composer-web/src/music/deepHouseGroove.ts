/** Deep House reference patterns and groove constants (Phase 7). */

export const DEEP_HOUSE_KICK = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
export const DEEP_HOUSE_CLAP = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
export const DEEP_HOUSE_HAT_CLOSED = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
export const DEEP_HOUSE_HAT_OPEN = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0];

export const DEEP_HOUSE_TEMPO = {
  minBpm: 110,
  preferredLow: 114,
  preferredHigh: 122,
  maxBpm: 126,
  maxChangePerBar: 1,
  gustMaxChangePerBar: 2,
};

export const DEEP_HOUSE_MIX = {
  padGainMax: 0.38,
  atmosphereMax: 0.22,
  noiseBudget: 0.55,
  kickDryness: 0.95,
  sidechainAmount: 0.42,
};

export type BassPatternFamily =
  | "offbeat"
  | "syncopated"
  | "root_fifth"
  | "held"
  | "breakdown";

export function deepHouseBassPattern(
  family: BassPatternFamily,
  rootMidi: number,
): number[] {
  const r = rootMidi;
  switch (family) {
    case "offbeat":
      return [r, 0, r, 0, r, 0, r, 0];
    case "syncopated":
      return [r, 0, 0, r, 0, r, 0, 0];
    case "root_fifth":
      return [r, 0, r + 7, 0, r, 0, r + 7, 0];
    case "held":
      return [r, r, r, r];
    case "breakdown":
      return [r, 0, 0, 0];
    default:
      return [r, 0, r, 0, r, 0, r, 0];
  }
}
