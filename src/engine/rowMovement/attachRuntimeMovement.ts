import type { LayerTransformId } from "../layerTransform/types";
import type { CanonicalLayerTransformId } from "../layerTransform/transformCatalog";
import type { Scenario } from "../types";
import { transformLayerMovement } from "./transformRowMovement";
import {
  LAYER_NUMBERS,
  type LayerNumber,
  type NormalizedScenarioMovement,
  type RowMovementInstruction,
  type RowNumber,
  type ScenarioMovementDefinition,
} from "./types";
import { normalizeScenarioMovement } from "./normalizeRowMovement";

function cloneLayerRows(
  rows: Record<RowNumber, RowMovementInstruction>
): Record<RowNumber, RowMovementInstruction> {
  const out = {} as Record<RowNumber, RowMovementInstruction>;
  for (const row of [0, 1, 2, 3, 4, 5, 6] as RowNumber[]) {
    out[row] = { ...rows[row] };
  }
  return out;
}

/**
 * Builds runtime movement from authored JSON and optional per-layer transforms.
 * Authored `scenario.movement` is not mutated.
 */
export function attachRuntimeMovement(
  scenario: Scenario,
  layerTransforms?: Record<number, LayerTransformId>
): NormalizedScenarioMovement {
  const authored = normalizeScenarioMovement((scenario.movement ?? {}) as ScenarioMovementDefinition);

  if (!layerTransforms) {
    scenario.runtimeMovement = authored;
    return authored;
  }

  const runtime = {} as NormalizedScenarioMovement;
  for (const layer of LAYER_NUMBERS) {
    const transformId = (layerTransforms[layer] ?? "identity") as CanonicalLayerTransformId;
    if (transformId === "identity") {
      runtime[layer] = { rows: cloneLayerRows(authored[layer].rows) };
    } else {
      runtime[layer] = transformLayerMovement(authored[layer], transformId);
    }
  }

  scenario.runtimeMovement = runtime;
  return runtime;
}

export function getRuntimeMovement(scenario: Scenario): NormalizedScenarioMovement {
  if (scenario.runtimeMovement) return scenario.runtimeMovement;
  return attachRuntimeMovement(scenario);
}
