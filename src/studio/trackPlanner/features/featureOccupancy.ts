import type { PlannerTrack, Pos, TrackFeature } from "../types";
import { canPlaceFeature } from "./featureCompatibility";
import {
  findFeatureAt,
  posSlotKey,
  featureOccupancyPos,
  SINGLE_SLOT_KINDS,
} from "./featureOccupancyCore";

export { findFeatureAt, posSlotKey, featureOccupancyPos, SINGLE_SLOT_KINDS };

export function canPlaceOnSlot(
  track: PlannerTrack,
  kind: TrackFeature["kind"],
  pos: Pos,
): { ok: true } | { ok: false; reason: string; existingId?: string } {
  const placementKind = kind === "portal" ? "portal_up" : kind;
  const result = canPlaceFeature(track, placementKind as Parameters<typeof canPlaceFeature>[1], pos);
  if (!result.ok) return result;

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
