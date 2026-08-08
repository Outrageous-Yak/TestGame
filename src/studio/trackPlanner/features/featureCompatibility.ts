import type { PlannerTrack, Pos, TrackFeature } from "../types";
import { ROW_LENS } from "../../../engine/board";
import { findFeatureAt, posSlotKey, SINGLE_SLOT_KINDS } from "./featureOccupancyCore";

export type PlacementKind =
  | TrackFeature["kind"]
  | "portal_up"
  | "portal_down";

function isMissing(track: PlannerTrack, pos: Pos): boolean {
  const layer = track.layers.find((l) => l.layer === pos.layer);
  if (!layer) return true;
  return layer.missing.some((m) => m.row === pos.row && m.col === pos.col);
}

function inBounds(p: Pos): boolean {
  if (p.layer < 1 || p.layer > 7) return false;
  if (p.row < 0 || p.row >= ROW_LENS.length) return false;
  return p.col >= 0 && p.col < ROW_LENS[p.row];
}

/** Allowed occupant categories per hex (portals may share source hex with nothing else in SINGLE_SLOT). */
export function canShareHex(a: TrackFeature["kind"], b: TrackFeature["kind"]): boolean {
  if (a === "portal" || b === "portal") return false;
  if (a === b && (a === "start" || a === "goal")) return false;
  return false;
}

export function placementKindToFeatureKind(kind: PlacementKind): TrackFeature["kind"] {
  if (kind === "portal_up" || kind === "portal_down") return "portal";
  return kind;
}

export function canPlaceFeature(
  track: PlannerTrack,
  kind: PlacementKind,
  pos: Pos,
): { ok: true } | { ok: false; reason: string; existingId?: string } {
  if (!inBounds(pos)) {
    return { ok: false, reason: "Position out of bounds" };
  }
  if (isMissing(track, pos)) {
    return { ok: false, reason: "Cannot place on missing hex" };
  }

  const featureKind = placementKindToFeatureKind(kind);
  const existing = findFeatureAt(track, pos);

  if (featureKind === "start" || featureKind === "goal") {
    return { ok: true };
  }

  if (featureKind === "portal") {
    return { ok: true };
  }

  if (existing && SINGLE_SLOT_KINDS.has(featureKind)) {
    return {
      ok: false,
      reason: `Hex ${posSlotKey(pos)} already has ${existing.kind}`,
      existingId: existing.id,
    };
  }

  return { ok: true };
}

/** Documented compatibility: one non-portal occupant per hex; start/goal replace prior. */
export const FEATURE_COMPATIBILITY_MATRIX = {
  singleOccupantKinds: [...SINGLE_SLOT_KINDS],
  portalSharesHex: false,
  startGoalReplace: true,
} as const;
