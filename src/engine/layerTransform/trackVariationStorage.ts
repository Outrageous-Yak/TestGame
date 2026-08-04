import type { TrackTransformSelection } from "./types";
import { migrateTrackTransformSelection } from "./transformIdMigration";

const PREFIX = "hexgame-track-variation:";

export type StoredTrackVariation = {
  trackId: string;
  runSeed: string;
  selection: TrackTransformSelection;
};

function storageKey(trackId: string): string {
  return PREFIX + trackId;
}

export function saveTrackVariationState(state: StoredTrackVariation): void {
  try {
    localStorage.setItem(storageKey(state.trackId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadTrackVariationState(trackId: string): StoredTrackVariation | null {
  try {
    const raw = localStorage.getItem(storageKey(trackId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTrackVariation;
    return {
      ...parsed,
      selection: migrateTrackTransformSelection(parsed.selection),
    };
  } catch {
    return null;
  }
}

export function clearTrackVariationState(trackId: string): void {
  try {
    localStorage.removeItem(storageKey(trackId));
  } catch {
    // ignore
  }
}

export function loadPreviousCombination(
  trackId: string
): TrackTransformSelection | undefined {
  return loadTrackVariationState(trackId)?.selection;
}
