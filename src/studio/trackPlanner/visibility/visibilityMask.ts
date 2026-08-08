import { ROW_LENS } from "../../../engine/board";
import type { Pos } from "../../../engine/types";
import type { PlannerTrack } from "../types";

export function posKey(p: Pos): string {
  return `L${p.layer}-R${p.row}-C${p.col}`;
}

export function inBoardBounds(p: Pos): boolean {
  if (p.layer < 1 || p.layer > 7) return false;
  if (p.row < 0 || p.row >= ROW_LENS.length) return false;
  return p.col >= 0 && p.col < ROW_LENS[p.row];
}

export function isMissingHex(track: PlannerTrack, pos: Pos): boolean {
  const layer = track.layers.find((l) => l.layer === pos.layer);
  if (!layer) return true;
  return layer.missing.some((m) => m.row === pos.row && m.col === pos.col);
}

export function maskHasPosition(positions: Pos[], pos: Pos): boolean {
  const key = posKey(pos);
  return positions.some((p) => posKey(p) === key);
}

export function toggleMaskPosition(positions: Pos[], pos: Pos): Pos[] {
  const key = posKey(pos);
  if (positions.some((p) => posKey(p) === key)) {
    return positions.filter((p) => posKey(p) !== key);
  }
  return [...positions, { ...pos }];
}

export function addMaskPosition(positions: Pos[], pos: Pos): Pos[] {
  if (maskHasPosition(positions, pos)) return positions;
  return [...positions, { ...pos }];
}

export function removeMaskPosition(positions: Pos[], pos: Pos): Pos[] {
  const key = posKey(pos);
  return positions.filter((p) => posKey(p) !== key);
}

export function clearMaskPositions(): Pos[] {
  return [];
}

export function dedupeMaskPositions(positions: Pos[]): Pos[] {
  const seen = new Set<string>();
  const out: Pos[] = [];
  for (const p of positions) {
    const key = posKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...p });
  }
  return out;
}

export function maskPositionsOnLayer(positions: Pos[], layer: number): Pos[] {
  return positions.filter((p) => p.layer === layer);
}
