import type {
  LayerNumber,
  NormalizedScenarioMovement,
  RowMovementInstruction,
  RowNumber,
  ScenarioMovementDefinition,
} from "./types";
import { LAYER_NUMBERS, ROW_NUMBERS, STATIONARY_ROW } from "./types";
import { normalizeLayerMovementDefinition } from "./legacyMovementMigration";
import { validateScenarioMovementDefinition } from "./validateRowMovement";

function cloneInstruction(i: RowMovementInstruction): RowMovementInstruction {
  return { direction: i.direction, amount: i.amount };
}

export function normalizeScenarioMovement(
  movement: ScenarioMovementDefinition,
  layers: number = 7
): NormalizedScenarioMovement {
  validateScenarioMovementDefinition(movement, layers);

  const out = {} as NormalizedScenarioMovement;
  for (const layer of LAYER_NUMBERS) {
    if (layer > layers) {
      const rows = {} as Record<RowNumber, RowMovementInstruction>;
      for (const row of ROW_NUMBERS) rows[row] = { ...STATIONARY_ROW };
      out[layer] = { rows };
      continue;
    }
    const source = movement[String(layer)] ?? "NONE";
    const normalized = normalizeLayerMovementDefinition(source, layer);
    const rows = {} as Record<RowNumber, RowMovementInstruction>;
    for (const row of ROW_NUMBERS) {
      rows[row] = cloneInstruction(normalized.rows[row]);
    }
    out[layer] = { rows };
  }
  return out;
}

export function getRowMovementInstruction(
  movement: NormalizedScenarioMovement,
  layer: LayerNumber,
  row: RowNumber
): RowMovementInstruction {
  return cloneInstruction(movement[layer].rows[row]);
}
