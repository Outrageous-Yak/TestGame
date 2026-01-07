import type { GameState } from "./types";
import { neighborIdsSameLayer } from "./neighbors";

export function computeReachability(state: GameState): { reachable: boolean; distance: number | null; explored: number } {
  const startId = state.playerHexId;
  const goalId = findGoalId(state);
  if (!goalId) return { reachable: false, distance: null, explored: 0 };

  const startHex = state.hexesById.get(startId);
  const goalHex = state.hexesById.get(goalId);
  if (!startHex || !goalHex) return { reachable: false, distance: null, explored: 0 };
  if (startHex.blocked || startHex.missing) return { reachable: false, distance: null, explored: 0 };
  if (goalHex.blocked || goalHex.missing) return { reachable: false, distance: null, explored: 0 };

  const q: string[] = [startId];
  const dist = new Map<string, number>([[startId, 0]]);
  let explored = 0;

  while (q.length) {
    const cur = q.shift()!;
    explored++;
    const d = dist.get(cur)!;
    if (cur === goalId) return { reachable: true, distance: d, explored };

    const curHex = state.hexesById.get(cur);
    if (!curHex || curHex.blocked || curHex.missing) continue;

    for (const nid of neighborIdsSameLayer(state, cur)) {
      const nh = state.hexesById.get(nid);
      if (!nh || nh.blocked || nh.missing) continue;
      if (!dist.has(nid)) {
        dist.set(nid, d + 1);
        q.push(nid);
      }
    }

    const tr = state.transitionsByFromId.get(cur);
    if (tr) {
      const destId = `L${tr.to.layer}-R${tr.to.row}-C${tr.to.col}`;
      const dh = state.hexesById.get(destId);
      if (dh && !dh.blocked && !dh.missing && !dist.has(destId)) {
        dist.set(destId, d);
        q.unshift(destId);
      }
    }
  }

  return { reachable: false, distance: null, explored };
}

function findGoalId(state: GameState): string | null {
  for (const [id, h] of state.hexesById.entries()) if (h.kind === "GOAL") return id;
  return null;
}
