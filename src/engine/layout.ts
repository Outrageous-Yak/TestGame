import type { GameState } from "./types";
import { ROW_LENS } from "./board";

export function findSlot(
  state: GameState,
  layer: number,
  hexId: string
): { row: number; col: number } | null {
  const layerRows = state.rows.get(layer);
  if (!layerRows) return null;

  for (let row = 0; row < layerRows.length; row++) {
    const col = layerRows[row].indexOf(hexId);
    if (col >= 0) return { row, col };
  }

  return null;
}

export function hexIdAtSlot(
  state: GameState,
  layer: number,
  row: number,
  col: number
): string | null {
  const layerRows = state.rows.get(layer);
  if (!layerRows) return null;

  const rowIds = layerRows[row];
  if (!rowIds || col < 0 || col >= rowIds.length) return null;

  return rowIds[col];
}

export function neighborSlots(row: number, col: number): Array<{ r: number; c: number }> {
  const out: Array<{ r: number; c: number }> = [];
  const len = ROW_LENS[row] ?? 7;

  if (col - 1 >= 0) out.push({ r: row, c: col - 1 });
  if (col + 1 < len) out.push({ r: row, c: col + 1 });

  const up = row - 1;
  const dn = row + 1;

  const lenUp = up >= 0 ? (ROW_LENS[up] ?? 7) : 0;
  const lenDn = dn < ROW_LENS.length ? (ROW_LENS[dn] ?? 7) : 0;

  const curIs6 = len === 6;

  const upA = curIs6 ? col : col - 1;
  const upB = curIs6 ? col + 1 : col;
  const dnA = curIs6 ? col : col - 1;
  const dnB = curIs6 ? col + 1 : col;

  if (up >= 0) {
    if (upA >= 0 && upA < lenUp) out.push({ r: up, c: upA });
    if (upB >= 0 && upB < lenUp) out.push({ r: up, c: upB });
  }

  if (dn < ROW_LENS.length) {
    if (dnA >= 0 && dnA < lenDn) out.push({ r: dn, c: dnA });
    if (dnB >= 0 && dnB < lenDn) out.push({ r: dn, c: dnB });
  }

  return out;
}

/** Grid-center coordinates for clockwise ordering (matches hexGridPlacement). */
export function slotGridCenter(row: number, col: number): { x: number; y: number } {
  const len = ROW_LENS[row] ?? 7;
  const isOffset = len === 6;
  const gridCol = isOffset ? col * 2 + 2 : col * 2 + 1;
  return { x: gridCol, y: row + 1 };
}

/** Order hex ids clockwise around `fromId` on the board (screen coords, y-down). */
export function clockwiseOrderFrom(
  state: GameState,
  layer: number,
  fromId: string,
  ids: Iterable<string>
): string[] {
  const from = findSlot(state, layer, fromId);
  if (!from) return [...ids];

  const center = slotGridCenter(from.row, from.col);

  return [...ids].sort((a, b) => {
    const sa = findSlot(state, layer, a);
    const sb = findSlot(state, layer, b);
    if (!sa || !sb) return 0;

    const ca = slotGridCenter(sa.row, sa.col);
    const cb = slotGridCenter(sb.row, sb.col);
    const angleA = Math.atan2(ca.x - center.x, -(ca.y - center.y));
    const angleB = Math.atan2(cb.x - center.x, -(cb.y - center.y));
    return angleA - angleB;
  });
}

/** Visual shift of a row relative to its initial layout (negative = left). */
export function rowShiftVisual(state: GameState, layer: number, row: number): number {
  const len = ROW_LENS[row] ?? 7;
  const layerRows = state.rows.get(layer);
  if (!layerRows) return 0;

  const rowIds = layerRows[row];
  if (!rowIds?.length) return 0;

  const anchorId = `L${layer}-R${row}-C0`;
  const wrapped = rowIds.indexOf(anchorId);
  if (wrapped < 0) return 0;

  return wrapped > len / 2 ? wrapped - len : wrapped;
}

export function rowShiftLabel(state: GameState, layer: number, row: number): string {
  const visual = rowShiftVisual(state, layer, row);
  if (visual === 0) return "";
  return visual < 0 ? `L${Math.abs(visual)}` : `R${visual}`;
}

export function facingFromMove(
  state: GameState,
  fromId: string | null,
  toId: string | null
): "down" | "up" | "left" | "right" {
  if (!fromId || !toId) return "down";

  const fromHex = state.hexesById.get(fromId);
  const toHex = state.hexesById.get(toId);
  if (!fromHex || !toHex || fromHex.pos.layer !== toHex.pos.layer) return "down";

  const layer = fromHex.pos.layer;
  const slotA = findSlot(state, layer, fromId);
  const slotB = findSlot(state, layer, toId);
  if (!slotA || !slotB) return "down";

  const len = ROW_LENS[slotA.row] ?? 7;
  let dxSlots = slotB.col - slotA.col;

  if (slotA.row === slotB.row) {
    dxSlots = ((dxSlots + len / 2) % len) - len / 2;
  }

  const dRow = slotB.row - slotA.row;

  if (Math.abs(dxSlots) >= Math.abs(dRow) * 0.5) {
    return dxSlots > 0 ? "right" : dxSlots < 0 ? "left" : "down";
  }

  return dRow > 0 ? "down" : "up";
}
