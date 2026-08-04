import type { LayerTransformId, TrackTransformSelection, TrackVariationRules } from "./types";
import { DEFAULT_VARIATION_RULES } from "./types";
import { getActiveLayerTransformIds } from "./transformDefinitions";
import { createSeededRandom } from "./seededRandom";

export function resolveVariationRules(
  overrides?: Partial<TrackVariationRules>
): TrackVariationRules {
  const active = getActiveLayerTransformIds();
  const baseAllowed = DEFAULT_VARIATION_RULES.allowedTransforms.filter((id) => active.includes(id));
  return {
    ...DEFAULT_VARIATION_RULES,
    ...overrides,
    allowedTransforms: (overrides?.allowedTransforms ?? baseAllowed).filter((id) => active.includes(id)),
  };
}

export function combinationKey(selection: Record<number, LayerTransformId>): string {
  return Object.keys(selection)
    .map(Number)
    .sort((a, b) => a - b)
    .map((layer) => `${layer}:${selection[layer]}`)
    .join("|");
}

function pickTransform(
  rng: () => number,
  allowed: LayerTransformId[],
  allowIdentity: boolean
): LayerTransformId {
  const pool = allowIdentity ? allowed : allowed.filter((id) => id !== "identity");
  const list = pool.length > 0 ? pool : allowed;
  const idx = Math.floor(rng() * list.length);
  return list[Math.min(idx, list.length - 1)];
}

export function selectLayerTransforms(
  trackId: string,
  layerCount: number,
  seed: string,
  rules: TrackVariationRules = DEFAULT_VARIATION_RULES,
  previousCombination?: Record<number, LayerTransformId>
): TrackTransformSelection {
  const activeIds = getActiveLayerTransformIds();
  const allowed = rules.allowedTransforms.filter((id) => activeIds.includes(id));
  const pool = allowed.length > 0 ? allowed : activeIds;

  const maxAttempts = 32;
  let attemptSeed = seed;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createSeededRandom(`${trackId}:${attemptSeed}:layer-transforms`);
    const layerTransforms: Record<number, LayerTransformId> = {};

    if (rules.independentPerLayer) {
      for (let layer = 1; layer <= layerCount; layer++) {
        const forced = rules.forcedTransformsByLayer?.[String(layer)];
        layerTransforms[layer] = forced ?? pickTransform(rng, pool, rules.allowIdentity);
      }
    } else {
      const chosen = pickTransform(rng, pool, rules.allowIdentity);
      for (let layer = 1; layer <= layerCount; layer++) {
        layerTransforms[layer] =
          rules.forcedTransformsByLayer?.[String(layer)] ?? chosen;
      }
    }

    if (!rules.enabled) {
      for (let layer = 1; layer <= layerCount; layer++) {
        layerTransforms[layer] = "identity";
      }
    }

    const key = combinationKey(layerTransforms);
    const prevKey = previousCombination ? combinationKey(previousCombination) : null;

    if (!rules.avoidPreviousCombination || !prevKey || key !== prevKey || pool.length ** layerCount <= 1) {
      return { seed: attemptSeed, layerTransforms };
    }

    attemptSeed = `${seed}:reroll-${attempt + 1}`;
  }

  const fallback: Record<number, LayerTransformId> = {};
  for (let layer = 1; layer <= layerCount; layer++) {
    fallback[layer] = "identity";
  }
  return { seed, layerTransforms: fallback };
}
