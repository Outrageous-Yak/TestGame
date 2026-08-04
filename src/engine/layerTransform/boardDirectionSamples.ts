import type { BoardSlot } from "./types";
import { allBoardSlots } from "./boardSlot";
import { neighborBoardSlots } from "./boardNeighbors";

/** Returns a slot that has a neighbor at the given direction index. */
export function findSlotWithDirection(direction: number): BoardSlot {
  for (const slot of allBoardSlots()) {
    if (neighborBoardSlots(slot).length > direction) return slot;
  }
  return { row: 3, col: 3 };
}
