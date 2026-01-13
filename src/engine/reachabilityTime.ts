// src/engine/reachability_with_shifts.ts
import type { GameState } from "./types";
import { neighborIdsSameLayer } from "./neighbors";
import { attemptMove, passTurn } from "./rules";
import { snapshotState, restoreState, type GameStateDTO } from "./snapshot";

/**
 * Breadth-first search over "turn steps" where the board may shift each turn.
 *
 * Changes vs your original:
 * - Replaces Array.shift() (O(n)) with an O(1) queue (head index).
 * - Adds safety caps so this can never lock the browser.
 * - Keeps behavior the same: from each state, you can PASS or MOVE once per turn.
 * - Signature is kept deterministic but cheaper to build.
 */
export function computeReachabilityWithShifts(
  start: GameState,
  maxTurns: number = 20
): { reachable: boolean; minTurns: number | null; explored: number; frontier: number } {
  const startDto = snapshotState(start);

  if (isGoalReached(start)) {
    return { reachable: true, minTurns: 0, explored: 1, frontier: 0 };
  }

  type Node = { dto: GameStateDTO; turnsUsed: number };

  // O(1) queue
  const q: Node[] = [{ dto: startDto, turnsUsed: 0 }];
  let head = 0;

  const seen = new Set<string>();
  seen.add(signature(startDto));

  let explored = 0;

  // Safety caps (tune if needed)
  const MAX_NODES = 20000;     // max expanded nodes
  const MAX_FRONTIER = 20000;  // max pending queue items

  while (head < q.length) {
    if (explored >= MAX_NODES) {
      console.error("computeReachabilityWithShifts: MAX_NODES hit", {
        explored,
        frontier: q.length - head,
        maxTurns,
      });
      break;
    }

    const node = q[head++];
    explored++;

    if (node.turnsUsed >= maxTurns) continue;

    // Restore once to enumerate neighbors safely
    const base = restoreState(node.dto);
    const fromId = base.playerHexId;

    const nextDtos: GameStateDTO[] = [];

    // PASS (costs 1 turn)
    {
      const s2 = restoreState(node.dto);
      passTurn(s2);
      nextDtos.push(snapshotState(s2));
    }

    // MOVES (costs 1 turn)
    for (const nid of neighborIdsSameLayer(base, fromId)) {
      const nh = base.hexesById.get(nid);
      if (!nh || nh.blocked || nh.missing) continue;

      const s2 = restoreState(node.dto);
      const r = attemptMove(s2, nid);
      if (!r.ok) continue;

      nextDtos.push(snapshotState(s2));
    }

    // Enqueue unique next states
    for (const dto of nextDtos) {
      const turnsUsed = node.turnsUsed + 1;

      const sig = signature(dto);
      if (seen.has(sig)) continue;
      seen.add(sig);

      const sCheck = restoreState(dto);
      if (isGoalReached(sCheck)) {
        return { reachable: true, minTurns: turnsUsed, explored, frontier: q.length - head };
      }

      if (q.length - head >= MAX_FRONTIER) {
        console.error("computeReachabilityWithShifts: MAX_FRONTIER hit", {
          explored,
          frontier: q.length - head,
          maxTurns,
        });
        return { reachable: false, minTurns: null, explored, frontier: q.length - head };
      }

      q.push({ dto, turnsUsed });
    }
  }

  return { reachable: false, minTurns: null, explored, frontier: q.length - head };
}

function isGoalReached(state: GameState): boolean {
  const h = state.hexesById.get(state.playerHexId);
  return !!h && h.kind === "GOAL";
}

/**
 * Deterministic signature for deduping states.
 * Keeps the full row layout because shifts change adjacency.
 *
 * This version is cheaper than the original by:
 * - building a single string incrementally
 * - including row indices to avoid ambiguity
 */
function signature(dto: GameStateDTO): string {
  let s = `t=${dto.turn}|p=${dto.playerHexId}`;

  const layers = dto.rows.slice().sort((a, b) => a.layer - b.layer);
  for (const layerEntry of layers) {
    s += `|L${layerEntry.layer}`;
    for (let i = 0; i < layerEntry.rows.length; i++) {
      s += `|r${i}=${layerEntry.rows[i].join(",")}`;
    }
  }

  return s;
}
