import type { GameState } from "../../engine/types";
import { enterLayer, revealHex } from "../../engine/board";
import { newGame } from "../../engine/api";
import { attemptMove } from "../../engine/rules";
import type { Scenario } from "../../engine/types";

/** Reveal every playable hex for studio inspection (does not change puzzle rules). */
export function revealAllForStudio(state: GameState): void {
  for (const hex of state.hexesById.values()) {
    if (!hex.missing) hex.revealed = true;
  }
  for (let layer = 1; layer <= state.scenario.layers; layer++) {
    state.visibleLayers.add(layer);
    enterLayer(state, layer);
  }
}

export function freshStudioState(scenario: Scenario): GameState {
  const state = newGame(scenario);
  revealAllForStudio(state);
  return state;
}

/** Reconstruct board state after N moves of the optimal path (for replay). */
export function stateAfterPath(scenario: Scenario, pathTargets: string[], moveCount: number): GameState {
  const state = freshStudioState(scenario);
  const limit = Math.min(moveCount, pathTargets.length);
  for (let i = 0; i < limit; i++) {
    attemptMove(state, pathTargets[i]);
  }
  return state;
}
