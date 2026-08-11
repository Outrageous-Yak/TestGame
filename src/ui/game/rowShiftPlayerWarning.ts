/**
 * Player-facing row-shift presentation helpers.
 * Does NOT expose direction, amount, or row identity — puzzle info stays intact.
 */
import type { GameState } from "../../engine/types";
import { getRuntimeMovement, layerHasMovement } from "../../engine/rowMovement";
import type { LayerNumber } from "../../engine/rowMovement/types";

export const PLAYER_ROW_SHIFT_WARNING = "Rows shift on this layer";

/** True when the active layer has any authored non-NONE row movement. */
export function currentLayerHasRowShift(
  state: GameState | null | undefined,
  layer: number
): boolean {
  if (!state?.scenario) return false;
  if (layer < 1 || layer > 7) return false;
  const movement = getRuntimeMovement(state.scenario);
  return layerHasMovement(movement[layer as LayerNumber].rows);
}

/**
 * Compact player-facing warning text, or null when the layer is static.
 * Never returns technical L/R sequences.
 */
export function playerRowShiftWarning(
  state: GameState | null | undefined,
  layer: number
): string | null {
  return currentLayerHasRowShift(state, layer) ? PLAYER_ROW_SHIFT_WARNING : null;
}
