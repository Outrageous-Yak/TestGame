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

export function canPlaceOnSlot(
  track: PlannerTrack,
  kind: TrackFeature["kind"],
  pos: Pos,
): { ok: true } | { ok: false; reason: string; existingId?: string } {
  if (kind === "portal") return { ok: true };
  const existing = findFeatureAt(track, pos);
  if (!existing) return { ok: true };
  if (kind === "start" || kind === "goal") {
    return { ok: true };
  }
  if (SINGLE_SLOT_KINDS.has(kind)) {
    return {
      ok: false,
      reason: `Hex ${posSlotKey(pos)} already has ${existing.kind}`,
      existingId: existing.id,
    };
  }
  return { ok: true };
}

export function duplicateSlotKeys(track: PlannerTrack): Map<string, TrackFeature[]> {
  const bySlot = new Map<string, TrackFeature[]>();
  for (const f of track.features) {
    const p = featureOccupancyPos(f);
    if (!p) continue;
    const key = posSlotKey(p);
    const list = bySlot.get(key) ?? [];
    list.push(f);
    bySlot.set(key, list);
  }
  return bySlot;
}
