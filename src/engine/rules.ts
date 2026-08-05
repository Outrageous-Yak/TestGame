// src/engine/rules.ts
import type { GameState } from "./types";
import { enterLayer, posId, revealHex } from "./board";
import { neighborIdsSameLayer } from "./neighbors";
import { applyLayerRowMovement, getRuntimeMovement, normalizeScenarioMovement } from "./rowMovement";
import type { ScenarioMovementDefinition } from "./rowMovement";

export type MoveResult =
  | { ok: true; state: GameState; triggeredTransition: boolean; won: boolean }
  | { ok: false; state: GameState; reason: "INVALID" | "BLOCKED" };

export function attemptMove(state: GameState, targetId: string): MoveResult {
  const player = state.hexesById.get(state.playerHexId);
  if (!player) return { ok: false, state, reason: "INVALID" };

  const target = state.hexesById.get(targetId);
  if (!target) return { ok: false, state, reason: "INVALID" };

  // Must stay in same layer for a normal move
  if (player.pos.layer !== target.pos.layer) return { ok: false, state, reason: "INVALID" };

  // Must be adjacent under current row layout
  const neigh = new Set(neighborIdsSameLayer(state, state.playerHexId));
  if (!neigh.has(targetId)) return { ok: false, state, reason: "INVALID" };

  // Blocked/missing wastes the turn
  if (target.blocked || target.missing) {
    endTurn(state);
    return { ok: false, state, reason: "BLOCKED" };
  }

  // Move
  state.playerHexId = targetId;
  revealHex(state, targetId);

  // Transition triggers immediately if present
  let triggered = false;
  const tr = state.transitionsByFromId.get(targetId);

  if (tr) {
    const destId = posId(tr.to);
    const dest = state.hexesById.get(destId);

    if (dest && !dest.blocked && !dest.missing) {
      triggered = true;
      state.playerHexId = destId;

      enterLayer(state, tr.to.layer);
      revealHex(state, destId);
    }
  }

  const now = state.hexesById.get(state.playerHexId);
  const won = !!now && now.kind === "GOAL";

  endTurn(state);
  return { ok: true, state, triggeredTransition: triggered, won };
}

export function passTurn(state: GameState) {
  endTurn(state);
}

export function endTurn(state: GameState) {
  state.turn += 1;

  const movement = getRuntimeMovement(state.scenario);

  const maxLayer =
    Number((state.scenario as { layers?: number }).layers) ||
    (state.rows && typeof state.rows.size === "number" ? state.rows.size : 1);

  for (let layer = 1; layer <= maxLayer; layer++) {
    applyLayerRowMovement(state, layer, movement);
  }
}

/** @deprecated Use getRuntimeMovement + layerHasMovement instead. */
export function getPatternForLayer(
  movement: Record<string, string>,
  layer: number
): string {
  return movement[String(layer)] ?? "NONE";
}

/** @deprecated Use applyLayerRowMovement via endTurn. */
export function applyShift(state: GameState, layer: number, pat: string) {
  const movement = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [String(i + 1), i + 1 === layer ? pat : "NONE"])
  ) as ScenarioMovementDefinition;
  const normalized = normalizeScenarioMovement(movement);
  applyLayerRowMovement(state, layer, normalized);
}
