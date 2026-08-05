import type { GameState } from "../types";
import type { LayerNumber, NormalizedScenarioMovement } from "./types";
import { LAYER_NUMBERS, ROW_NUMBERS } from "./types";
import { effectiveRowShiftAmount, rotateRowIds } from "./calculateRowShift";
import { getRowMovementInstruction } from "./normalizeRowMovement";

export function applyLayerRowMovement(
  state: GameState,
  layer: number,
  movement: NormalizedScenarioMovement
): void {
  const layerRows = state.rows.get(layer);
  if (!layerRows) return;

  const layerKey = layer as LayerNumber;
  const nextRows = layerRows.map((rowIds, rowIndex) => {
    const instruction = getRowMovementInstruction(
      movement,
      layerKey,
      rowIndex as RowNumber
    );
    const amount = effectiveRowShiftAmount(rowIndex, instruction);
    if (instruction.direction === "NONE" || amount === 0) {
      return rowIds.slice();
    }
    return rotateRowIds(rowIds, instruction.direction, amount);
  });

  for (let r = 0; r < layerRows.length; r++) {
    layerRows[r] = nextRows[r]!;
  }
}

export function layersThatShift(movement: NormalizedScenarioMovement): LayerNumber[] {
  const out: LayerNumber[] = [];
  for (const layer of LAYER_NUMBERS) {
    const hasMove = ROW_NUMBERS.some((row) => {
      const inst = movement[layer].rows[row];
      return inst.direction !== "NONE" && inst.amount > 0;
    });
    if (hasMove) out.push(layer);
  }
  return out;
}
