/**
 * Authoritative legal successful destinations for the current player state.
 * Reuses `attemptMove` (move + portal + endTurn) so runtime STRANDED and the
 * Solver agree on connectivity. Probes never mutate the caller's state.
 */
import type { GameState } from "./types";
import { attemptMove } from "./rules";
import { neighborIdsSameLayer } from "./neighbors";
import { restoreStateLite, snapshotStateLite } from "./snapshot";

function sortedNeighborIds(state: GameState, playerHexId: string): string[] {
  return neighborIdsSameLayer(state, playerHexId)
    .slice()
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Hex ids that are currently successful `attemptMove` targets (wrong taps excluded). */
export function listLegalSuccessfulMoveTargets(state: GameState): string[] {
  const dto = snapshotStateLite(state);
  const out: string[] = [];
  for (const nid of sortedNeighborIds(state, state.playerHexId)) {
    const nh = state.hexesById.get(nid);
    if (!nh || nh.missing || nh.blocked) continue;
    const probe = restoreStateLite(state, dto);
    if (attemptMove(probe, nid).ok) out.push(nid);
  }
  return out;
}

export function hasLegalSuccessfulMove(state: GameState): boolean {
  return listLegalSuccessfulMoveTargets(state).length > 0;
}

export function playerOnGoal(state: GameState): boolean {
  const hex = state.hexesById.get(state.playerHexId);
  return !!hex && hex.kind === "GOAL";
}

/**
 * After a fully resolved turn (or initial settle): non-Goal with zero successful exits.
 * Does NOT itself apply movement — caller must evaluate at the correct lifecycle point.
 */
export function isAuthoritativeStranded(state: GameState): boolean {
  if (playerOnGoal(state)) return false;
  return !hasLegalSuccessfulMove(state);
}
