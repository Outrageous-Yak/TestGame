import { ROW_LENS } from "../board";
import type { BoardSlot } from "./types";

export function slotKey(slot: BoardSlot): string {
  return `R${slot.row}-C${slot.col}`;
}

export function parseSlotKey(key: string): BoardSlot | null {
  const m = /^R(\d+)-C(\d+)$/.exec(key);
  if (!m) return null;
  return { row: Number(m[1]), col: Number(m[2]) };
}

export function isValidSlot(slot: BoardSlot): boolean {
  if (slot.row < 0 || slot.row >= ROW_LENS.length) return false;
  const len = ROW_LENS[slot.row];
  return slot.col >= 0 && slot.col < len;
}

export function allBoardSlots(): BoardSlot[] {
  const out: BoardSlot[] = [];
  for (let row = 0; row < ROW_LENS.length; row++) {
    for (let col = 0; col < ROW_LENS[row]; col++) {
      out.push({ row, col });
    }
  }
  return out;
}

export const BOARD_SLOT_COUNT = allBoardSlots().length;
