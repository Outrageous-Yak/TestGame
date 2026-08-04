import type { LayerTransformId, TrackTransformSelection, TrackVariationMode } from "./types";
import type { BuildRuntimeScenarioOptions } from "./applyTrackVariation";
import type { StoredTrackVariation } from "./trackVariationStorage";

/** How the game should treat layer transforms for this scenario start. */
export type TrackRunIntent =
  | "fresh"
  | "preserve"
  | "replayAfterWin"
  | "fixed";

export type ResolveTrackRunOptionsInput = {
  trackId: string;
  intent: TrackRunIntent;
  stored: StoredTrackVariation | null;
  forcedSelection: TrackTransformSelection | null;
  variationParam: string | null;
  devMode: boolean;
};

export function resolveTrackRunOptions(input: ResolveTrackRunOptionsInput): BuildRuntimeScenarioOptions {
  const { trackId, intent, stored, forcedSelection, variationParam, devMode } = input;

  if (forcedSelection) {
    return {
      trackId,
      mode: "seeded",
      seed: forcedSelection.seed,
      forcedSelection,
    };
  }

  if (variationParam === "fixed" || (devMode && variationParam === "fixed") || intent === "fixed") {
    return { trackId, mode: "fixed" };
  }

  if (intent === "preserve") {
    if (!stored) {
      return {
        trackId,
        mode: "new-on-replay",
        seed: `${trackId}-${Date.now()}`,
      };
    }
    return {
      trackId,
      mode: "seeded",
      seed: stored.runSeed,
      preserveSelection: stored.selection,
    };
  }

  if (intent === "replayAfterWin") {
    return {
      trackId,
      mode: "new-on-replay",
      seed: `${trackKeySeed(trackId)}-${Date.now()}`,
      previousSelection: stored?.selection,
    };
  }

  // fresh: new run from track selection (avoid previous combination when known)
  return {
    trackId,
    mode: "new-on-replay",
    seed: `${trackKeySeed(trackId)}-${Date.now()}`,
    previousSelection: stored?.selection,
  };
}

function trackKeySeed(trackId: string): string {
  return trackId;
}

export function intentFromStartOptions(opts: {
  fresh?: boolean;
  preserve?: boolean;
  replayAfterWin?: boolean;
  resume?: boolean;
}): TrackRunIntent {
  if (opts.preserve || opts.resume) return "preserve";
  if (opts.replayAfterWin) return "replayAfterWin";
  if (opts.fresh) return "fresh";
  return "fresh";
}
