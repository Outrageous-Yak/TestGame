// src/engine/neighbors.ts
import type { GameState, Pos } from "./types";
import { ROW_LENS } from "./board";

/**
 * Parse id format: "Lx-Ry-Cz"
 */
function idToPos(id: string): Pos {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) throw new Error(`Bad id: ${id}`);
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

function rowLen(row: number): number {
  if (row < 0 || row >= ROW_LENS.length) return 0;
  return ROW_LENS[row];
}

function at(state: GameState, layer: number, row: number, col: number): string | null {
  const layerRows = state.rows.get(layer);
  if (!layerRows) return null;
  const r = layerRows[row];
  if (!r) return null;
  if (col < 0 || col >= r.length) return null;
  return r[col];
}

/**
 * Neighbors for your 7-6-7-6-7-6-7 ("7676767") board shape.
 *
 * This is NOT a rectangular odd-r grid. Rows alternate length, so the
 * "diagonal" neighbors depend on whether you're moving between a long row (7)
 * and a short row (6).
 *
 * Mapping used here (common for staggered rows):
 * - long(7) -> short(6): (col-1) and (col)
 * - short(6) -> long(7): (col) and (col+1)
 *
 * If your stagger is the opposite direction visually, swap those two cases.
 */
export function neighborIdsSameLayer(state: GameState, id: string): string[] {
  const { layer, row, col } = idToPos(id);

  const hereLen = rowLen(row);
  if (!hereLen) return [];

  const out: string[] = [];

  // Same-row neighbors
  const left = at(state, layer, row, col - 1);
  if (left) out.push(left);
  const right = at(state, layer, row, col + 1);
  if (right) out.push(right);

  const hereIsLong = hereLen === 7;

  const addRowNeighbors = (rr: number) => {
    const targetLen = rowLen(rr);
    if (!targetLen) return;

    const targetIsLong = targetLen === 7;

    if (hereIsLong && !targetIsLong) {
      // long -> short
      const a = at(state, layer, rr, col - 1);
      const b = at(state, layer, rr, col);
      if (a) out.push(a);
      if (b) out.push(b);
      return;
    }

    if (!hereIsLong && targetIsLong) {
      // short -> long
      const a = at(state, layer, rr, col);
      const b = at(state, layer, rr, col + 1);
      if (a) out.push(a);
      if (b) out.push(b);
      return;
    }

    // Same length (future-proof)
    const a = at(state, layer, rr, col - 1);
    const b = at(state, layer, rr, col);
    if (a) out.push(a);
    if (b) out.push(b);
  };

  // Up / Down neighbors
  addRowNeighbors(row - 1);
  addRowNeighbors(row + 1);

  return out;
}
