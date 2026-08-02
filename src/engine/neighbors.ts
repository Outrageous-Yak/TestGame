import type { GameState } from "./types";
import { findSlot, hexIdAtSlot, neighborSlots } from "./layout";

/** Neighbors on the same layer, using the engine's current row layout. */
export function neighborIdsSameLayer(st: GameState, pid: string): string[] {
  const hex = st.hexesById.get(pid);
  if (!hex) return [];

  const layer = hex.pos.layer;
  const slot = findSlot(st, layer, pid);
  if (!slot) return [];

  const slots = neighborSlots(slot.row, slot.col);
  const out: string[] = [];

  for (const s of slots) {
    const id = hexIdAtSlot(st, layer, s.r, s.c);
    if (id) out.push(id);
  }

  return out;
}
