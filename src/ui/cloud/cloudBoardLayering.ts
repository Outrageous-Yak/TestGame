import type { CloudMode } from "../types";
import type { CloudVisibility } from "./computeCloudVisibility";

/** Prism Path sequential legal-move pulse interval (ms). */
export const REACH_PULSE_INTERVAL_MS = 850;

function usesFullCloudStylePulse(mode?: CloudMode | string): boolean {
  return mode === "full_cloud";
}

/** Fork effect modes hide standard reach pulses — hints come from mode styling. */
export function shouldShowReachHints(visibilityMode?: CloudMode | string): boolean {
  return (
    visibilityMode !== "night" &&
    visibilityMode !== "invisible" &&
    visibilityMode !== "memory" &&
    visibilityMode !== "lantern" &&
    visibilityMode !== "echo" &&
    visibilityMode !== "crystal_vision"
  );
}

/** Button `.reachPulse` — Cloudy and non-cloud; not Full Cloud-style modes. */
export function shouldUseButtonReachPulse(isReachPulse: boolean, visibilityMode?: CloudMode | string): boolean {
  return isReachPulse && shouldShowReachHints(visibilityMode) && !usesFullCloudStylePulse(visibilityMode);
}

/** Full Cloud hex-shaped pulse overlay — one active legal hex at a time. */
export function shouldShowFullCloudMovePulse(
  isReachPulse: boolean,
  visibilityMode?: CloudMode | string
): boolean {
  return isReachPulse && shouldShowReachHints(visibilityMode) && usesFullCloudStylePulse(visibilityMode);
}

export function shouldRenderCloudCover(visibility?: CloudVisibility): boolean {
  return visibility === "partial" || visibility === "cloud";
}

/** Cards use under-cloud layer whenever cloud scenarios show cover on this hex. */
export function shouldCardSitUnderCloud(isCloudScenario: boolean, visibility?: CloudVisibility): boolean {
  return isCloudScenario && shouldRenderCloudCover(visibility);
}

/** Count how many hexes would show an active move pulse (must be 0 or 1). */
export function countActiveMovePulses(
  hexIds: string[],
  reachPulseId: string | null,
  visibilityMode?: CloudMode | string
): number {
  let n = 0;
  for (const id of hexIds) {
    const isActive = reachPulseId === id;
    if (shouldUseButtonReachPulse(isActive, visibilityMode)) n++;
    if (shouldShowFullCloudMovePulse(isActive, visibilityMode)) n++;
  }
  return n;
}
