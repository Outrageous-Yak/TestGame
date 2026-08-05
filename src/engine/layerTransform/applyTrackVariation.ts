import { inBounds, posId } from "../board";
import { assertScenario } from "../scenario";
import type { Scenario } from "../types";
import { attachRuntimeMovement } from "../rowMovement/attachRuntimeMovement";
import type {
  LayerTransformId,
  ScenarioDocument,
  TrackTransformSelection,
  TrackVariationMode,
  TrackVariationRules,
} from "./types";
import { resolveVariationRules } from "./selectLayerTransforms";
import { transformScenarioLayer } from "./transformScenario";
import { transformPosOnLayer } from "./transformPos";
import { selectLayerTransforms } from "./selectLayerTransforms";

export const ENABLE_LAYER_TRANSFORM_VARIATION =
  (import.meta as any).env?.VITE_ENABLE_LAYER_TRANSFORMS !== "false";

function deepCloneScenario<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function transformExtrasOnLayer(
  extras: ScenarioDocument,
  layer: number,
  transformId: LayerTransformId
): void {
  if (Array.isArray(extras.cardTriggers)) {
    extras.cardTriggers = extras.cardTriggers.map((raw: any) => {
      if (!raw || Number(raw.layer) !== layer) return raw;
      const pos = transformPosOnLayer(
        { layer: Number(raw.layer), row: Number(raw.row), col: Number(raw.col) },
        layer,
        transformId
      );
      return { ...raw, layer: pos.layer, row: pos.row, col: pos.col };
    });
  }

  const villains = extras.villains as any;
  if (villains?.triggers && Array.isArray(villains.triggers)) {
    villains.triggers = villains.triggers.map((raw: any) => {
      if (!raw || Number(raw.layer) !== layer) return raw;
      const pos = transformPosOnLayer(
        { layer: Number(raw.layer), row: Number(raw.row), col: Number(raw.col ?? 0) },
        layer,
        transformId
      );
      return { ...raw, layer: pos.layer, row: pos.row };
    });
  }
}

export function applyLayerTransformsToScenario(
  authored: ScenarioDocument,
  selection: TrackTransformSelection,
  options?: { validateScenario?: boolean }
): ScenarioDocument {
  const clone = deepCloneScenario(authored);
  let scenario = clone as unknown as Scenario;

  for (const [layerKey, transformId] of Object.entries(selection.layerTransforms)) {
    const layer = Number(layerKey);
    if (!Number.isFinite(layer) || transformId === "identity") continue;
    scenario = transformScenarioLayer(scenario, layer, transformId);
    transformExtrasOnLayer(clone, layer, transformId);
  }

  Object.assign(clone, scenario);

  attachRuntimeMovement(
    scenario,
    Object.fromEntries(
      Object.entries(selection.layerTransforms).map(([k, v]) => [Number(k), v])
    )
  );
  clone.runtimeMovement = scenario.runtimeMovement;

  if (options?.validateScenario !== false) {
    assertScenario(scenario);
  }
  return clone;
}

export function mergeVariationRules(
  authored: ScenarioDocument,
  globalRules?: Partial<TrackVariationRules>
): TrackVariationRules {
  const fromTrack = authored.variationRules ?? {};
  const supported = authored.supportedTransformIds;
  const merged = resolveVariationRules({
    ...globalRules,
    ...fromTrack,
    allowedTransforms: fromTrack.allowedTransforms ??
      supported ??
      globalRules?.allowedTransforms,
  });
  if (!ENABLE_LAYER_TRANSFORM_VARIATION) {
    return { ...merged, enabled: false };
  }
  return merged;
}

export type BuildRuntimeScenarioOptions = {
  trackId: string;
  mode: TrackVariationMode;
  seed?: string;
  previousSelection?: TrackTransformSelection;
  requiredChangedLayers?: number[];
  preserveSelection?: TrackTransformSelection;
  rules?: Partial<TrackVariationRules>;
  forcedSelection?: TrackTransformSelection;
};

export function buildRuntimeScenario(
  authored: ScenarioDocument,
  options: BuildRuntimeScenarioOptions
): { scenario: Scenario; selection: TrackTransformSelection } {
  const rules = mergeVariationRules(authored, options.rules);
  const layerCount = authored.layers ?? 7;

  if (options.preserveSelection) {
    const doc = applyLayerTransformsToScenario(authored, options.preserveSelection);
    return {
      scenario: doc as unknown as Scenario,
      selection: options.preserveSelection,
    };
  }

  if (options.forcedSelection) {
    const doc = applyLayerTransformsToScenario(authored, options.forcedSelection);
    return {
      scenario: doc as unknown as Scenario,
      selection: options.forcedSelection,
    };
  }

  if (!rules.enabled || options.mode === "fixed") {
    const identitySelection: TrackTransformSelection = {
      seed: options.seed ?? "fixed",
      layerTransforms: Object.fromEntries(
        Array.from({ length: layerCount }, (_, i) => [i + 1, "identity" as LayerTransformId])
      ),
    };
    const doc = applyLayerTransformsToScenario(authored, identitySelection);
    return {
      scenario: doc as unknown as Scenario,
      selection: identitySelection,
    };
  }

  const seed =
    options.mode === "seeded"
      ? options.seed ?? `${options.trackId}:seeded`
      : `${options.trackId}:${options.seed ?? Date.now()}`;

  const selection = selectLayerTransforms(
    options.trackId,
    layerCount,
    seed,
    rules,
    options.previousSelection?.layerTransforms,
    options.requiredChangedLayers
  );

  return {
    scenario: applyLayerTransformsToScenario(authored, selection) as unknown as Scenario,
    selection,
  };
}
