import type { PlannerTrack, Pos, TrackFeature } from "../types";

export function featureOccupancyPos(f: TrackFeature): Pos | null {
  if (f.kind === "portal") return f.source;
  if ("position" in f) return f.position;
  return null;
}

export function posSlotKey(p: Pos): string {
  return `L${p.layer}-R${p.row}-C${p.col}`;
}

export function findFeatureAt(track: PlannerTrack, pos: Pos): TrackFeature | undefined {
  return track.features.find((f) => {
    const p = featureOccupancyPos(f);
    return p && posSlotKey(p) === posSlotKey(pos);
  });
}

/** Features that cannot share a hex with another occupant. */
export const SINGLE_SLOT_KINDS = new Set<TrackFeature["kind"]>([
  "start",
  "goal",
  "card",
  "encounter",
  "villain",
]);
