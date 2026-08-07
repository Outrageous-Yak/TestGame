/** Target playback peak (dBFS) for normalized sound effects. */
export const SFX_TARGET_PEAK_DB = -14;

/** Goal is slightly louder than other effects. */
export const GOAL_TARGET_PEAK_DB = -12;

/** Background music sits just below normalized effects. */
export const BGM_TARGET_PEAK_DB = -17;

/** Goal and red-card evil laugh are slightly louder than other effects. */
export const PROMINENT_SFX_TARGET_PEAK_DB = -10;

export type BalancedSoundId =
  | "playerMove"
  | "portalLand"
  | "goalLand"
  | "failedMove"
  | "redCardEvilLaugh";

/** Measured file peaks (ffmpeg volumedetect). */
export const SOUND_FILE_PEAK_DB: Record<BalancedSoundId, number> = {
  playerMove: -32.0,
  portalLand: -14.5,
  goalLand: -0.9,
  failedMove: -0.4,
  redCardEvilLaugh: -0.2,
};

export const BGM_FILE_PEAK_DB = -1.0;

function linearGainForPeak(filePeakDb: number, targetPeakDb: number): number {
  return 10 ** ((targetPeakDb - filePeakDb) / 20);
}

export function normalizedSoundGain(id: BalancedSoundId): number {
  const target =
    id === "goalLand" || id === "redCardEvilLaugh"
      ? PROMINENT_SFX_TARGET_PEAK_DB
      : SFX_TARGET_PEAK_DB;
  return linearGainForPeak(SOUND_FILE_PEAK_DB[id], target);
}

export function normalizedBgmGain(): number {
  return linearGainForPeak(BGM_FILE_PEAK_DB, BGM_TARGET_PEAK_DB);
}

/** Expected playback peak (dBFS) at user volume = 1. */
export function expectedPlaybackPeakDb(id: BalancedSoundId): number {
  return SOUND_FILE_PEAK_DB[id] + 20 * Math.log10(normalizedSoundGain(id));
}

export function expectedBgmPlaybackPeakDb(): number {
  return BGM_FILE_PEAK_DB + 20 * Math.log10(normalizedBgmGain());
}
