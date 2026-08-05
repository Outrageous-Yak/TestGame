import type { GameState } from "./types";
import { applyLayerRowMovement, getRuntimeMovement } from "./rowMovement";

export function activateLayerMovement(state: GameState, layer: number): void {
  state.movementActiveLayers.add(layer);
}

export function endTurn(state: GameState) {
  state.turn += 1;

  const movement = getRuntimeMovement(state.scenario);

  const maxLayer =
    Number((state.scenario as { layers?: number }).layers) ||
    (state.rows && typeof state.rows.size === "number" ? state.rows.size : 1);

  for (let layer = 1; layer <= maxLayer; layer++) {
    if (!state.movementActiveLayers.has(layer)) continue;
    applyLayerRowMovement(state, layer, movement);
  }
}

export function passTurn(state: GameState) {
  endTurn(state);
}
