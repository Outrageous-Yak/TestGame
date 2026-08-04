import type { LayerTransformId, TrackTransformSelection } from "./types";
import { getActiveLayerTransformIds } from "./transformDefinitions";

const VALID = new Set(getActiveLayerTransformIds());

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
    if (!VALID.has(transformId as LayerTransformId)) continue;
    layerTransforms[layer] = transformId as LayerTransformId;
  }

  if (Object.keys(layerTransforms).length === 0) return null;
  return { seed: "forced", layerTransforms };
}

export function formatLayerTransformDebug(
  trackId: string,
  selection: TrackTransformSelection
): string {
  const lines = Object.keys(selection.layerTransforms)
    .map(Number)
    .sort((a, b) => a - b)
    .map((layer) => `Layer ${layer}: ${selection.layerTransforms[layer]}`);
  return [`Track: ${trackId}`, `Run seed: ${selection.seed}`, ...lines].join("\n");
}
