import type { LayerTransformId, TrackTransformSelection } from "./types";
import { getActiveLayerTransformIds } from "./transformDefinitions";
import { migrateTrackTransformSelection, migrateTransformId } from "./transformIdMigration";
import { PLAYER_VARIANT_LABELS } from "./transformCatalog";
import type { CanonicalLayerTransformId } from "./transformCatalog";

export function parseForcedLayerTransforms(
  search: string
): TrackTransformSelection | null {
  const params = new URLSearchParams(search);
  const raw = params.get("layerTransforms") ?? params.get("forceTransforms");
  if (!raw) return null;

  const layerTransforms: Record<number, LayerTransformId> = {};
  for (const part of raw.split(",")) {
    const [layerKey, transformId] = part.split(":").map((s) => s.trim());
    const layer = Number(layerKey.replace(/^L/i, ""));
    if (!Number.isFinite(layer) || !transformId) continue;
    layerTransforms[layer] = migrateTransformId(transformId);
  }

  if (Object.keys(layerTransforms).length === 0) return null;
  return { seed: "forced", layerTransforms };
}

/** Compact player-facing summary, e.g. "L1 Variant 2 · L2 Variant 1". */
export function formatLayerTransformPlayerSummary(
  selection: TrackTransformSelection
): string | null {
  const layers = Object.keys(selection.layerTransforms)
    .map(Number)
    .sort((a, b) => a - b);
  if (layers.length === 0) return null;

  const parts = layers.map((layer) => {
    const id = selection.layerTransforms[layer];
    const variant = PLAYER_VARIANT_LABELS[id as CanonicalLayerTransformId] ?? "Variant 1";
    return `L${layer} ${variant}`;
  });

  const allIdentity = layers.every((layer) => selection.layerTransforms[layer] === "identity");
  if (allIdentity) return null;

  return `Board layout — ${parts.join(" · ")}`;
}

export function formatLayerTransformDebug(
  trackId: string,
  selection: TrackTransformSelection
): string {
  const lines = Object.keys(selection.layerTransforms)
    .map(Number)
    .sort((a, b) => a - b)
    .map((layer) => {
      const id = selection.layerTransforms[layer];
      const variant = PLAYER_VARIANT_LABELS[id as CanonicalLayerTransformId] ?? id;
      return `Layer ${layer}: ${id} (${variant})`;
    });
  return [`Track: ${trackId}`, `Run seed: ${selection.seed}`, ...lines].join("\n");
}

export function isKnownTransformId(raw: string): boolean {
  return getActiveLayerTransformIds().includes(migrateTransformId(raw));
}
