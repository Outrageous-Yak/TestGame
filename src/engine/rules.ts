// src/engine/rules.ts
import type { GameState, MovementPattern } from "./types";
import { enterLayer, posId, revealHex } from "./board";
import { neighborIdsSameLayer } from "./neighbors";

export type MoveResult =
  | { ok: true; triggeredTransition: boolean; won: boolean }
  | { ok: false; reason: "INVALID" | "BLOCKED" };

export function attemptMove(state: GameState, targetId: string): MoveResult {
  const player = state.hexesById.get(state.playerHexId);
  if (!player) return { ok: false, reason: "INVALID" };

  const target = state.hexesById.get(targetId);
  if (!target) return { ok: false, reason: "INVALID" };

  // Must stay in same layer for a normal move
  if (player.pos.layer !== target.pos.layer) return { ok: false, reason: "INVALID" };

  // Must be adjacent under current shifted row layout
  const neigh = new Set(neighborIdsSameLayer(state, state.playerHexId));
  if (!neigh.has(targetId)) return { ok: false, reason: "INVALID" };

  // Blocked/missing wastes the turn
  if (target.blocked || target.missing) {
    endTurn(state);
    return { ok: false, reason: "BLOCKED" };
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

      // Make layer visible and reveal destination
      enterLayer(state, tr.to.layer);
      revealHex(state, destId);
    }
  }

  // Win check (safe)
  const now = state.hexesById.get(state.playerHexId);
  const won = !!now && now.kind === "GOAL";

  endTurn(state);
  return { ok: true, triggeredTransition: triggered, won };
}

export function passTurn(state: GameState) {
  endTurn(state);
}

export function endTurn(state: GameState) {
  state.turn += 1;

  // Shift ALL layers according to scenario.movement
  const movement = state.scenario.movement ?? {};

  // safest: use scenario.layers if present, otherwise fall back to state.rows size
  const maxLayer =
    Number((state.scenario as any)?.layers) ||
    (state.rows && typeof state.rows.size === "number" ? state.rows.size : 1);

  for (let layer = 1; layer <= maxLayer; layer++) {
    const pat = getPatternForLayer(movement as any, layer);
    applyShift(state, layer, pat);
  }
}


export function getPatternForLayer(
  movement: Record<string, MovementPattern>,
  layer: number
): MovementPattern {
  return movement[String(layer)] ?? "NONE";
}

export function applyShift(state: GameState, layer: number, pat: MovementPattern) {
  if (pat === "NONE") return;

  const layerRows = state.rows.get(layer);
  if (!layerRows) return;

  for (let r = 0; r < layerRows.length; r++) {
    const row = layerRows[r];
    if (row.length <= 1) continue;

    let dir: "L" | "R" = "L";

    if (pat === "SEVEN_LEFT_SIX_RIGHT") {
      dir = row.length === 7 ? "L" : "R";
    } else if (pat === "TOP3_RIGHT_BOTTOM4_LEFT") {
      dir = r <= 2 ? "R" : "L";
    }

    // Rotate ids in the row
    if (dir === "L") {
      const first = row.shift();
      if (first != null) row.push(first);
    } else {
      const last = row.pop();
      if (last != null) row.unshift(last);
    }
  }
}
