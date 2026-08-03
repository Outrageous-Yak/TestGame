import { SPRITE_PIXEL_COUNT } from "./spriteTypes";

const MAX_HISTORY = 80;

export type SpriteHistory = {
  undo: number[][];
  redo: number[][];
};

export function createHistory(initial: number[]): SpriteHistory {
  return { undo: [initial.slice()], redo: [] };
}

export function canUndo(h: SpriteHistory): boolean {
  return h.undo.length > 1;
}

export function canRedo(h: SpriteHistory): boolean {
  return h.redo.length > 0;
}

export function currentPixels(h: SpriteHistory): number[] {
  return h.undo[h.undo.length - 1] ?? new Array(SPRITE_PIXEL_COUNT).fill(0);
}

export function pushHistory(h: SpriteHistory, pixels: number[]): SpriteHistory {
  const snapshot = pixels.slice();
  const undo = [...h.undo, snapshot];
  if (undo.length > MAX_HISTORY) undo.shift();
  return { undo, redo: [] };
}

export function undoHistory(h: SpriteHistory): SpriteHistory {
  if (!canUndo(h)) return h;
  const current = h.undo[h.undo.length - 1]!;
  const undo = h.undo.slice(0, -1);
  const redo = [...h.redo, current];
  return { undo, redo };
}

export function redoHistory(h: SpriteHistory): SpriteHistory {
  if (!canRedo(h)) return h;
  const next = h.redo[h.redo.length - 1]!;
  const redo = h.redo.slice(0, -1);
  const undo = [...h.undo, next];
  return { undo, redo };
}
