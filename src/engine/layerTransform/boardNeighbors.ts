import { neighborSlots } from "../layout";
import type { BoardSlot } from "./types";

export function neighborBoardSlots(slot: BoardSlot): BoardSlot[] {
  return neighborSlots(slot.row, slot.col).map((n) => ({ row: n.r, col: n.c }));
}
