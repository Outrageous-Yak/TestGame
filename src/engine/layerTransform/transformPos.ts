import type { Pos } from "../types";
import type { LayerTransformId } from "./types";
import { transformBoardSlot } from "./transformScenario";

export function transformPosOnLayer(pos: Pos, layer: number, transformId: LayerTransformId): Pos {
  if (pos.layer !== layer) return { layer: pos.layer, row: pos.row, col: pos.col };
  const slot = transformBoardSlot({ row: pos.row, col: pos.col }, transformId);
  return { layer: pos.layer, row: slot.row, col: slot.col };
}
