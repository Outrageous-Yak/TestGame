import { endTurn, passTurn } from "./endTurn";
import { findSlot } from "./layout";
import type { GameState } from "./types";
import {
  attemptMoveToSlot,
  type BoardSlotRef,
  type MoveAttemptResponse,
  type MoveAttemptResult,
} from "./moveAttempt";

export type MoveResult =
  | { ok: true; state: GameState; triggeredTransition: boolean; won: boolean }
  | { ok: false; state: GameState; reason: "INVALID" | "BLOCKED" };

export { attemptMoveToSlot, endTurn, passTurn };
export type { BoardSlotRef, MoveAttemptResponse, MoveAttemptResult };

export function attemptMove(state: GameState, targetId: string): MoveResult {
  const target = state.hexesById.get(targetId);
  if (!target) return { ok: false, state, reason: "INVALID" };

  const slot = findSlot(state, target.pos.layer, targetId);
  if (!slot) return { ok: false, state, reason: "INVALID" };

  const outcome = attemptMoveToSlot(state, {
    layer: target.pos.layer,
    row: slot.row,
    col: slot.col,
  });
  return moveResultFromAttempt(outcome);
}

export function moveResultFromAttempt(outcome: MoveAttemptResponse): MoveResult {
  if (outcome.result === "MOVED") {
    return {
      ok: true,
      state: outcome.state,
      triggeredTransition: outcome.triggeredTransition ?? false,
      won: outcome.won ?? false,
    };
  }

  if (outcome.result === "BLOCKED") {
    return { ok: false, state: outcome.state, reason: "BLOCKED" };
  }

  if (outcome.result === "MISSING" || outcome.result === "UNREACHABLE") {
    return { ok: false, state: outcome.state, reason: "INVALID" };
  }

  return { ok: false, state: outcome.state, reason: "INVALID" };
}
