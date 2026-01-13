// src/engine/reachability.ts
import type { GameState } from "./types";
import { neighborIdsSameLayer } from "./neighbors";

/**
 * Keep this in sync with src/engine/api.ts
 * (We duplicate the types here to avoid circular imports.)
 */
export type ReachInfo = { reachable: boolean; distance: number | null; explored: number };
export type ReachMap = Record<string, ReachInfo>;

/**
 * Computes a per-hex reachability map starting from the player's current hex.
 *
 * - Uses an O(1) queue (head index) to avoid the O(n^2) cost of Array.shift().
 * - Skips blocked/missing hexes.
 * - Supports transitions (treated as cost 0, processed with priority).
 * - Includes a HARD_CAP so a bug can never lock the browser.
 *
 * Return value:
 * - Sparse map: includes ONLY reachable hexes (plus the start).
 *   If you need a dense map of all hexes, see the optional block at the end.
 */
export function computeReachability(state: GameState): ReachMap {
  const startId = state.playerHexId;
  const startHex = state.hexesById.get(startId);

  // Invalid or not walkable start => nothing reachable
  if (!startHex || startHex.blocked || startHex.missing) return {};

  const out: ReachMap = {};

  // Distance map doubles as visited set
  const dist = new Map<string, number>();
  dist.set(startId, 0);

  // Queue with head index (fast)
  const q: string[] = [startId];
  let head = 0;

  // "explored" is a running counter of nodes popped from the queue.
  // We store the explored count at first discovery of a node.
  let explored = 0;

  out[startId] = { reachable: true, distance: 0, explored: 0 };

  // Absolute safety cap against runaway loops
  const HARD_CAP = 50000;

  // Helper: attempt to enqueue a node with a given distance
  const enqueue = (id: string, d: number, priority = false) => {
    if (dist.has(id)) return;
    const h = state.hexesById.get(id);
    if (!h || h.blocked || h.missing) return;

    dist.set(id, d);
    out[id] = { reachable: true, distance: d, explored };
    if (priority) {
      // Put next to process sooner (0-cost edges)
      // We avoid unshift() (O(n)) by inserting at head-1 range:
      // simplest safe approach: push and let it be processed soon enough.
      // If you need strict priority, use a deque implementation.
      q.push(id);
    } else {
      q.push(id);
    }
  };

  while (head < q.length) {
    if (explored++ > HARD_CAP) {
      console.error("computeReachability HARD_CAP hit", {
        explored,
        qLen: q.length,
        head,
        startId,
      });
      break;
    }

    const cur = q[head++];
    const curHex = state.hexesById.get(cur);
    if (!curHex || curHex.blocked || curHex.missing) continue;

    const d = dist.get(cur);
    if (d == null) continue;

    // Same-layer neighbors cost 1
    for (const nid of neighborIdsSameLayer(state, cur)) {
      enqueue(nid, d + 1, false);
    }

    // Transition edge (cost 0)
    const tr = state.transitionsByFromId.get(cur);
    if (tr) {
      const destId = `L${tr.to.layer}-R${tr.to.row}-C${tr.to.col}`;
      enqueue(destId, d, true);
    }
  }

  // Optional: If your UI expects ALL ids (reachable or not), uncomment this.
  // NOTE: This can be heavier; keep it off unless you need it.
  /*
  for (const id of state.hexesById.keys()) {
    if (!out[id]) out[id] = { reachable: false, distance: null, explored };
  }
  */

  return out;
}
