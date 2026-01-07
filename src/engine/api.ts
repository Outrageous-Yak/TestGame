// src/engine/api.ts
import type { GameState, Scenario } from "./types";
import { buildInitialState } from "./board";
import { computeReachability } from "./reachability";
import { attemptMove, passTurn } from "./rules";

export type ReachInfo = { reachable: boolean; distance: number | null; explored: number };
export type ReachMap = Record<string, ReachInfo>;

export function newGame(scenario: Scenario): GameState {
  return buildInitialState(scenario);
}

export function getReachability(state: GameState): ReachMap {
  return computeReachability(state);
}

export function getReachable(state: GameState): Set<string> {
  const result = computeReachability(state);
  const reachable = new Set<string>();
  for (const [id, info] of Object.entries(result)) {
    if (info.reachable) reachable.add(id);
  }
  return reachable;
}

export function tryMove(state: GameState, targetId: string) {
  return attemptMove(state, targetId);
}

export function endTurn(state: GameState) {
  passTurn(state);
}
