import { inBounds, posId, revealHex, enterLayer } from "./board";
import { hexIdAtSlot } from "./layout";
import { neighborIdsSameLayer } from "./neighbors";
import { activateLayerMovement, endTurn } from "./endTurn";
import { captureLayerEntrySnapshot } from "./layerEntrySnapshot";
import type { GameState, Pos } from "./types";

export type BoardSlotRef = Pick<Pos, "layer" | "row" | "col">;

export type MoveAttemptResult = "MOVED" | "BLOCKED" | "MISSING" | "UNREACHABLE" | "IGNORED";

export type FailedMoveReason = "UNREACHABLE" | "MISSING_HEX" | "BLOCKED";

export interface FailedMoveAction {
  type: "FAILED_MOVE";
  reason: FailedMoveReason;
  slot: BoardSlotRef;
  turnAfter: number;
}

export interface SuccessfulMoveAction {
  type: "MOVE";
  fromHexId: string;
  toHexId: string;
  triggeredTransition: boolean;
  won: boolean;
  turnAfter: number;
}

export type PlayerAction = SuccessfulMoveAction | FailedMoveAction;

export type MoveAttemptResponse = {
  result: MoveAttemptResult;
  state: GameState;
  triggeredTransition?: boolean;
  won?: boolean;
  failedReason?: FailedMoveReason;
  action?: PlayerAction;
};

function recordAction(state: GameState, action: PlayerAction) {
  if (!state.moveHistory) state.moveHistory = [];
  state.moveHistory.push(action);
}

function failTurn(
  state: GameState,
  slot: BoardSlotRef,
  reason: FailedMoveReason,
  result: Exclude<MoveAttemptResult, "MOVED" | "IGNORED">
): MoveAttemptResponse {
  endTurn(state, { applyRowMovement: false });
  const action: FailedMoveAction = {
    type: "FAILED_MOVE",
    reason,
    slot: { ...slot },
    turnAfter: state.turn,
  };
  recordAction(state, action);
  return { result, state, failedReason: reason, action };
}

/**
 * Authoritative board-slot move attempt. Mutates `state` when the turn is consumed.
 * Calls `endTurn()` exactly once for MOVED, BLOCKED, MISSING, and UNREACHABLE.
 */
export function attemptMoveToSlot(state: GameState, slot: BoardSlotRef): MoveAttemptResponse {
  const layers = state.scenario.layers ?? 7;
  if (!inBounds(slot, layers)) {
    return { result: "IGNORED", state };
  }

  const targetId = hexIdAtSlot(state, slot.layer, slot.row, slot.col);
  if (!targetId) {
    return { result: "IGNORED", state };
  }

  const target = state.hexesById.get(targetId);
  if (!target) {
    return { result: "IGNORED", state };
  }

  const player = state.hexesById.get(state.playerHexId);
  if (!player) {
    return { result: "IGNORED", state };
  }

  if (player.pos.layer !== slot.layer) {
    return failTurn(state, slot, "UNREACHABLE", "UNREACHABLE");
  }

  if (target.missing) {
    return failTurn(state, slot, "MISSING_HEX", "MISSING");
  }

  const neighbors = new Set(neighborIdsSameLayer(state, state.playerHexId));
  if (!neighbors.has(targetId)) {
    return failTurn(state, slot, "UNREACHABLE", "UNREACHABLE");
  }

  if (target.blocked) {
    return failTurn(state, slot, "BLOCKED", "BLOCKED");
  }

  const fromHexId = state.playerHexId;
  const fromLayer = player.pos.layer;
  state.playerHexId = targetId;
  revealHex(state, targetId);

  let triggered = false;
  const tr = state.transitionsByFromId.get(targetId);
  if (tr) {
    const destId = posId(tr.to);
    const dest = state.hexesById.get(destId);
    if (dest && !dest.blocked && !dest.missing) {
      triggered = true;
      state.playerHexId = destId;
      activateLayerMovement(state, tr.to.layer);
      enterLayer(state, tr.to.layer);
      revealHex(state, destId);
    }
  }

  const now = state.hexesById.get(state.playerHexId);
  const won = !!now && now.kind === "GOAL";

  endTurn(state);

  // Capture after portal dest + enterLayer + dest reveal + endTurn (row shift).
  // Same-layer movement / wrong taps / UI layer browse must not capture.
  if (triggered) {
    const destLayer = now?.pos.layer;
    if (destLayer != null && destLayer !== fromLayer) {
      captureLayerEntrySnapshot(state, destLayer);
    }
  }

  const action: SuccessfulMoveAction = {
    type: "MOVE",
    fromHexId,
    toHexId: state.playerHexId,
    triggeredTransition: triggered,
    won,
    turnAfter: state.turn,
  };
  recordAction(state, action);

  return {
    result: "MOVED",
    state,
    triggeredTransition: triggered,
    won,
    action,
  };
}
