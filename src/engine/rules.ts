import type { GameState, MovementPattern } from "./types";
import { enterLayer, posId, revealHex } from "./board";
import { neighborIdsSameLayer } from "./neighbors";

export type MoveResult =
  | { ok: true; triggeredTransition: boolean; won: boolean }
  | { ok: false; reason: "INVALID" | "BLOCKED" };

export function attemptMove(state: GameState, targetId: string): MoveResult {
  const player = state.hexesById.get(state.playerHexId)!;
  const target = state.hexesById.get(targetId);
  if (!target) return { ok: false, reason: "INVALID" };
  if (player.pos.layer !== target.pos.layer) return { ok: false, reason: "INVALID" };

  const neigh = new Set(neighborIdsSameLayer(state, state.playerHexId));
  if (!neigh.has(targetId)) return { ok: false, reason: "INVALID" };

  // blocked/missing = waste turn
  if (target.blocked || target.missing) {
    endTurn(state);
    return { ok: false, reason: "BLOCKED" };
  }

  // move
  state.playerHexId = targetId;
  revealHex(state, targetId);

  // transition triggers immediately if present
  const tr = state.transitionsByFromId.get(targetId);
  let triggered = false;

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

  // win check
  const now = state.hexesById.get(state.playerHexId)!;
  const won = now.kind === "GOAL";

  endTurn(state);
  return { ok: true, triggeredTransition: triggered, won };
}

export function passTurn(state: GameState) {
  endTurn(state);
}

export function endTurn(state: GameState) {
  state.turn += 1;

  // shift only the layer the player is currently on (simple, readable v0.1)
  const layer = state.hexesById.get(state.playerHexId)!.pos.layer;
  const pat = getPatternForLayer(state.scenario.movement, layer);
  applyShift(state, layer, pat);
}

export function getPatternForLayer(movement: Record<string, MovementPattern>, layer: number): MovementPattern {
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

    if (dir === "L") row.push(row.shift()!);
    else row.unshift(row.pop()!);
  }
}
