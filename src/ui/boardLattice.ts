/**
 * Logical honeycomb plane — constant pitch, board-local coordinates.
 * No projection, no viewport, no CSS.
 */

export const HEX_ASPECT = 0.875;
export const ROW_OVERLAP = 0.8;

export type Rect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type LatticeSlot = {
  row: number;
  slotCol: number;
  x: number;
  y: number;
  colOffset: number;
};

export type BoardLattice = {
  pitchX: number;
  pitchY: number;
  tileW: number;
  tileH: number;
  rowCount: number;
  slots: LatticeSlot[];
  bounds: Rect;
};

export function colOffsetForSlot(slotCol: number, rowLength: number): number {
  return slotCol - (rowLength - 1) / 2;
}

export function buildBoardLattice(rowLens: readonly number[], tileW: number): BoardLattice {
  const tileH = tileW * HEX_ASPECT;
  const pitchX = tileW;
  const pitchY = tileH * ROW_OVERLAP;
  const rowCount = rowLens.length;
  const midRow = (rowCount - 1) / 2;
  const slots: LatticeSlot[] = [];

  for (let row = 0; row < rowCount; row++) {
    const len = rowLens[row] ?? 7;
    for (let slotCol = 0; slotCol < len; slotCol++) {
      const colOffset = colOffsetForSlot(slotCol, len);
      slots.push({
        row,
        slotCol,
        x: colOffset * pitchX,
        y: (row - midRow) * pitchY,
        colOffset,
      });
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of slots) {
    minX = Math.min(minX, s.x - tileW / 2);
    minY = Math.min(minY, s.y - tileH / 2);
    maxX = Math.max(maxX, s.x + tileW / 2);
    maxY = Math.max(maxY, s.y + tileH / 2);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }

  return {
    pitchX,
    pitchY,
    tileW,
    tileH,
    rowCount,
    slots,
    bounds: { minX, minY, maxX, maxY },
  };
}
