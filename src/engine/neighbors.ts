// src/engine/neighbors.ts
import { ROW_LENS } from "./board";

type Coord = { layer: number; row: number; col: number };

function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

function coordToId(c: Coord): string {
  return `L${c.layer}-R${c.row}-C${c.col}`;
}

function inBounds(row: number, col: number): boolean {
  if (row < 0 || row >= ROW_LENS.length) return false;
  const len = ROW_LENS[row] ?? 0;
  return col >= 0 && col < len;
}

export function neighborIdsSameLayer(a: any, b?: any): string[] {
  const pid: string | null =
    typeof a === "string" ? a :
    typeof b === "string" ? b :
    null;

  if (!pid) return [];

  const c = idToCoord(pid);
  if (!c) return [];

  const rowLen = ROW_LENS[c.row] ?? 0;

  const deltas =
    rowLen === 7
      ? [
          [-1, -1],
          [-1, 0],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
        ]
      : [
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, 0],
          [1, 1],
        ];

  const out: string[] = [];
  for (const [dr, dc] of deltas) {
    const r2 = c.row + dr;
    const c2 = c.col + dc;
    if (!inBounds(r2, c2)) continue;
    out.push(coordToId({ layer: c.layer, row: r2, col: c2 }));
  }
  return out;
}
