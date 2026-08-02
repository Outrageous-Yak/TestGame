/**
 * Assemble the logical lattice into one board object with seven structural row groups.
 */

import type { BoardLattice, LatticeSlot, Rect } from "./boardLattice";

export type BoardRow = {
  rowIndex: number;
  rowLength: number;
  slots: LatticeSlot[];
  boardBounds: Rect;
  boardCenterY: number;
};

export type BoardGeometry = {
  lattice: BoardLattice;
  rows: BoardRow[];
  boardCenter: { x: number; y: number };
  bounds: Rect;
};

function rowBounds(slots: LatticeSlot[], tileW: number, tileH: number): Rect {
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

  return { minX, minY, maxX, maxY };
}

export function buildBoardGeometry(lattice: BoardLattice): BoardGeometry {
  const rows: BoardRow[] = [];

  for (let rowIndex = 0; rowIndex < lattice.rowCount; rowIndex++) {
    const rowSlots = lattice.slots.filter((s) => s.row === rowIndex);
    const rowLength = rowSlots.length;
    const boardBounds = rowBounds(rowSlots, lattice.tileW, lattice.tileH);
    const boardCenterY = rowSlots.length > 0 ? rowSlots[0].y : 0;

    rows.push({
      rowIndex,
      rowLength,
      slots: rowSlots,
      boardBounds,
      boardCenterY,
    });
  }

  return {
    lattice,
    rows,
    boardCenter: { x: 0, y: 0 },
    bounds: { ...lattice.bounds },
  };
}
