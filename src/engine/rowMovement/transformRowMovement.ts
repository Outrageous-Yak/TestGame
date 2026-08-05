import { ROW_LENS } from "../board";
import { neighborBoardSlots } from "../layerTransform/boardNeighbors";
import { buildCanonicalMapById, type CanonicalLayerTransformId } from "../layerTransform/transformCatalog";
import { applySlotMap, type SlotTransformMap } from "../layerTransform/graphAutomorphism";
import type { BoardSlot } from "../layerTransform/types";
import type {
  LayerNumber,
  NormalizedLayerMovement,
  RowMovementInstruction,
  RowNumber,
} from "./types";
import { ROW_NUMBERS, STATIONARY_ROW } from "./types";

function directionReversedForRow(row: RowNumber, map: SlotTransformMap): boolean {
  const len = ROW_LENS[row] ?? 7;
  if (len < 2) return false;

  const left = { row, col: 0 };
  const right = { row, col: 1 };
  const mappedLeft = applySlotMap(left, map);
  const mappedRight = applySlotMap(right, map);

  if (mappedLeft.row !== mappedRight.row) {
    throw new Error(`Row ${row} does not map to a single runtime row under transform`);
  }

  return mappedLeft.col > mappedRight.col;
}

function runtimeRowForAuthoredRow(authoredRow: RowNumber, map: SlotTransformMap): RowNumber {
  const slot: BoardSlot = { row: authoredRow, col: 0 };
  const mapped = applySlotMap(slot, map);
  return mapped.row as RowNumber;
}

export function transformRowMovementInstruction(
  authoredRow: RowNumber,
  instruction: RowMovementInstruction,
  transformId: CanonicalLayerTransformId
): { runtimeRow: RowNumber; instruction: RowMovementInstruction } {
  if (transformId === "identity") {
    return { runtimeRow: authoredRow, instruction: { ...instruction } };
  }

  const map = buildCanonicalMapById().get(transformId)!;
  const runtimeRow = runtimeRowForAuthoredRow(authoredRow, map);

  if (instruction.direction === "NONE") {
    return { runtimeRow, instruction: { ...STATIONARY_ROW } };
  }

  const reverse = directionReversedForRow(authoredRow, map);
  let direction = instruction.direction;
  if (reverse) {
    direction = direction === "LEFT" ? "RIGHT" : "LEFT";
  }

  return {
    runtimeRow,
    instruction: { direction, amount: instruction.amount },
  };
}

export function transformLayerMovement(
  layerMovement: NormalizedLayerMovement,
  transformId: CanonicalLayerTransformId
): NormalizedLayerMovement {
  if (transformId === "identity") {
    const rows = {} as Record<RowNumber, RowMovementInstruction>;
    for (const row of ROW_NUMBERS) {
      rows[row] = { ...layerMovement.rows[row] };
    }
    return { rows };
  }

  const rows = {} as Record<RowNumber, RowMovementInstruction>;
  for (const row of ROW_NUMBERS) {
    rows[row] = { ...STATIONARY_ROW };
  }

  for (const authoredRow of ROW_NUMBERS) {
    const { runtimeRow, instruction } = transformRowMovementInstruction(
      authoredRow,
      layerMovement.rows[authoredRow],
      transformId
    );
    if (rows[runtimeRow].direction !== "NONE") {
      throw new Error(
        `Transform ${transformId}: duplicate runtime row ${runtimeRow} from authored rows`
      );
    }
    rows[runtimeRow] = instruction;
  }

  return { rows };
}

export function transformScenarioMovement(
  movement: NormalizedScenarioMovement,
  layer: LayerNumber,
  transformId: CanonicalLayerTransformId
): NormalizedLayerMovement {
  return transformLayerMovement(movement[layer], transformId);
}

export function assertEveryRuntimeRowAssignedExactlyOnce(
  rows: Record<RowNumber, RowMovementInstruction>
): void {
  for (const row of ROW_NUMBERS) {
    if (!rows[row]) {
      throw new Error(`Missing runtime row ${row} in transformed movement`);
    }
  }
}

/** Derive LEFT/RIGHT preservation for tests from slot map at a row. */
export function deriveDirectionReversalForRow(
  row: RowNumber,
  transformId: CanonicalLayerTransformId
): boolean {
  if (transformId === "identity") return false;
  const map = buildCanonicalMapById().get(transformId)!;
  return directionReversedForRow(row, map);
}
