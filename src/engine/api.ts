// src/engine/api.ts
import type { GameState, Scenario } from "./types";
import { buildInitialState } from "./board";
import { computeReachability } from "./reachability";
import { computeMinMovesToGoal } from "./reachabilityOptimal";
import { attemptMove, passTurn, attemptMoveToSlot, type MoveResult } from "./rules";
import type { BoardSlotRef, MoveAttemptResponse, MoveAttemptResult } from "./moveAttempt";

export type ReachInfo = { reachable: boolean; distance: number | null; explored: number };
export type ReachMap = Record<string, ReachInfo>;

export type { MoveResult, BoardSlotRef, MoveAttemptResponse, MoveAttemptResult };

export { attemptMoveToSlot };
export {
  captureLayerEntrySnapshot,
  restoreLayerEntrySnapshot,
  getLayerEntrySnapshot,
  listLayerEntrySnapshotLayers,
} from "./layerEntrySnapshot";
export type { LayerRestoreResult, LayerRestoreStatus } from "./layerEntrySnapshot";
export {
  resolveRedEncounterRoll,
  resolveEffectiveRedTier,
  rollD6,
  redEncounterEscapeHint,
  RED_TIER_SUCCESS_AT_OR_ABOVE,
} from "./encounters/redEncounterDice";
export type {
  RedEncounterOutcome,
  RedEncounterRollResult,
  D6RollSource,
} from "./encounters/redEncounterDice";
export { applyRedEncounterBanishment } from "./encounters/redEncounterBanishment";
export type { RedBanishmentResult } from "./encounters/redEncounterBanishment";

export function newGame(scenario: Scenario): GameState {
  return buildInitialState(scenario);
}

export function getReachability(state: GameState): ReachMap {
  return computeReachability(state);
}

export function getMinMovesToGoal(state: GameState, maxTurns?: number): number | null {
  return computeMinMovesToGoal(state, maxTurns);
}

export function getReachable(state: GameState): Set<string> {
  const result = computeReachability(state);
  const reachable = new Set<string>();
  for (const [id, info] of Object.entries(result)) {
    if (info.reachable) reachable.add(id);
  }
  return reachable;
}

/** Apply a move (or blocked waste-turn). Mutates and returns state via MoveResult. */
export function tryMove(state: GameState, targetId: string): MoveResult {
  return attemptMove(state, targetId);
}

export function endTurn(state: GameState) {
  passTurn(state);
}
