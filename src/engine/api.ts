// src/engine/api.ts
import type { Scenario, Coord } from "./types";

// TODO: adjust these imports to match your actual exports
import { createBoardState } from "./board";
import { computeReachability } from "./reachability";
import { applyMove } from "./rules";
// optional later:
// import { snapshot, restore } from "./snapshot";

export type GameState = {
  scenario: Scenario;
  board: any;          // change to your BoardState type
  pos: Coord;          // current player position
  turn: number;
};

export function newGame(scenario: Scenario): GameState {
  const board = createBoardState(scenario);
  return {
    scenario,
    board,
    pos: scenario.start,
    turn: 0
  };
}

export function reachable(state: GameState): Set<string> {
  // return a Set of coord keys like "L1-R3-C2"
  return computeReachability(state.scenario, state.board, state.pos);
}

export function moveTo(state: GameState, to: Coord): GameState {
  // applyMove should validate legality; if you have a different name, change here
  return applyMove(state, to);
}

export function nextTurn(state: GameState): GameState {
  // if your rules module has advanceTurn / tick, call it here
  return { ...state, turn: state.turn + 1 };
}
