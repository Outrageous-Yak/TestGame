import type { GameState, Pos } from "./types";

function idToPos(id: string): Pos {
  // format Lx-Ry-Cz
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) throw new Error(`Bad id: ${id}`);
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

export function neighborIdsSameLayer(state: GameState, id: string): string[] {
  const p = idToPos(id);
  const { layer, row, col } = p;

  // odd-r offset (row-based)
  const odd = row % 2 === 1;

  const deltas = odd
    ? [
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
        { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
      ]
    : [
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: -1, dc: -1 }, { dr: -1, dc: 0 },
        { dr: 1, dc: -1 }, { dr: 1, dc: 0 }
      ];

  const out: string[] = [];
  for (const d of deltas) {
    const rr = row + d.dr;
    const cc = col + d.dc;
    const rowArr = state.rows.get(layer)?.[rr];
    if (!rowArr) continue;
    if (cc < 0 || cc >= rowArr.length) continue;
    out.push(rowArr[cc]);
  }
  return out;
}
