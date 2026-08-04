import type { LayerTransformId, TrackTransformSelection } from "./types";
import { CANONICAL_TRANSFORM_IDS, classifyMapGeometry, type CanonicalLayerTransformId } from "./transformCatalog";
import { discoverUniqueAutomorphismMaps, mapFingerprint } from "./graphAutomorphism";

/** Legacy IDs from pre-rename builds (incorrect `rotate-*` labels). */
const LEGACY_ROTATE_TO_CANONICAL: Record<string, CanonicalLayerTransformId> = {
  "rotate-60": "reflect-horizontal",
  "rotate-120": "symmetry-b",
  "rotate-240": "symmetry-c",
  // Older builds that enumerated five rotation labels map the extras to identity.
  "rotate-180": "identity",
  "rotate-300": "identity",
};

let legacyIdMap: Record<string, CanonicalLayerTransformId> | null = null;

/**
 * Maps deprecated transform IDs to canonical IDs.
 * Legacy `rotate-*` names were assigned in discovery order before geometry classification:
 *   rotate-60  → reflect-horizontal
 *   rotate-120 → symmetry-b
 *   rotate-240 → symmetry-c
 */
function buildLegacyIdMap(): Record<string, CanonicalLayerTransformId> {
  const maps = discoverUniqueAutomorphismMaps(500);

  const out: Record<string, CanonicalLayerTransformId> = {
    ...LEGACY_ROTATE_TO_CANONICAL,
    "reflect-a": "reflect-horizontal",
    "reflect-b": "symmetry-c",
  };

  // Fingerprint fallback for any stored value that matches a known map.
  for (const map of maps) {
    const canonical = classifyMapGeometry(map);
    out[mapFingerprint(map)] = canonical;
  }

  return out;
}

export function migrateTransformId(raw: string): LayerTransformId {
  if ((CANONICAL_TRANSFORM_IDS as readonly string[]).includes(raw)) {
    return raw as LayerTransformId;
  }
  if (!legacyIdMap) legacyIdMap = buildLegacyIdMap();
  const migrated = legacyIdMap[raw];
  if (migrated) return migrated;
  return "identity";
}

export function migrateLayerTransforms(
  layerTransforms: Record<number | string, string>
): Record<number, LayerTransformId> {
  const out: Record<number, LayerTransformId> = {};
  for (const [layerKey, transformId] of Object.entries(layerTransforms)) {
    const layer = Number(layerKey);
    if (!Number.isFinite(layer)) continue;
    out[layer] = migrateTransformId(transformId);
  }
  return out;
}

export function migrateTrackTransformSelection(
  selection: TrackTransformSelection
): TrackTransformSelection {
  return {
    seed: selection.seed,
    layerTransforms: migrateLayerTransforms(selection.layerTransforms),
  };
}
