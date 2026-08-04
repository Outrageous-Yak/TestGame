import type { CloudMode } from "../types";
import type { CloudVisibility } from "./computeCloudVisibility";

/** Prism Path sequential legal-move pulse interval (ms). */
export const REACH_PULSE_INTERVAL_MS = 850;

/** Button `.reachPulse` — Cloudy and non-cloud; not Full Cloud (terrain would show). */
export function shouldUseButtonReachPulse(isReachPulse: boolean, cloudMode?: CloudMode): boolean {
  return isReachPulse && cloudMode !== "full_cloud";
}

/** Full Cloud hex-shaped pulse overlay — one active legal hex at a time. */
export function shouldShowFullCloudMovePulse(isReachPulse: boolean, cloudMode?: CloudMode): boolean {
  return cloudMode === "full_cloud" && isReachPulse;
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
  cloudMode?: CloudMode
): number {
  let n = 0;
  for (const id of hexIds) {
    const isActive = reachPulseId === id;
    if (shouldUseButtonReachPulse(isActive, cloudMode)) n++;
    if (shouldShowFullCloudMovePulse(isActive, cloudMode)) n++;
  }
  return n;
}
