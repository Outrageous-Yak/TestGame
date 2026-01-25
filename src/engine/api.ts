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
  const res: any = attemptMove(state, targetId);

  // If attemptMove returns { ok:false } or { reason }, don't end the turn
  if (res && typeof res === "object") {
    if ("ok" in res && res.ok === false) return res;
    if ("reason" in res && !("state" in res)) return res;
  }

  // Find the state to apply passTurn to
  const nextState =
    res && typeof res === "object" && "state" in res ? (res.state as GameState) : (res as GameState);

  // If we got a plausible nextState, advance the turn (this is where shifting usually happens)
  if (nextState && typeof nextState === "object") {
    passTurn(nextState);
  }

  return res;
}


export function endTurn(state: GameState) {
  passTurn(state);
}
