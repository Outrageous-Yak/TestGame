import { ROW_LENS } from "../board";
import type { RowMovementDirection, RowMovementInstruction } from "./types";

export function effectiveRowShiftAmount(
  row: number,
  instruction: RowMovementInstruction
): number {
  if (instruction.direction === "NONE" || instruction.amount === 0) return 0;
  const rowLength = ROW_LENS[row] ?? 7;
  if (rowLength <= 1) return 0;
  return instruction.amount % rowLength;
}

export function rotateRowIds(
  rowIds: string[],
  direction: RowMovementDirection,
  amount: number
): string[] {
  const len = rowIds.length;
  if (len <= 1 || direction === "NONE" || amount === 0) {
    return rowIds.slice();
  }

  const effective = amount % len;
  if (effective === 0) return rowIds.slice();

  if (direction === "LEFT") {
    return [...rowIds.slice(effective), ...rowIds.slice(0, effective)];
  }
  return [...rowIds.slice(len - effective), ...rowIds.slice(0, len - effective)];
}
