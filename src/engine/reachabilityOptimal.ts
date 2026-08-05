// Minimum moves to goal using engine row rotation (state.rows) via attemptMove.
import type { GameState } from "./types";
import { neighborIdsSameLayer } from "./neighbors";
import { attemptMove } from "./rules";
import { restoreStateLite, snapshotStateLite, type GameStateLiteDTO } from "./snapshot";

function playerLayer(hexId: string): number {
  const m = /^L(\d+)-/.exec(hexId);
  return m ? Number(m[1]) : 1;
}

function goalIdFromState(state: GameState): string | null {
  for (const hex of state.hexesById.values()) {
    if (hex.kind === "GOAL") return hex.id;
  }

  const g = state.scenario.goal;
  if (!g) return null;
  return `L${g.layer}-R${g.row}-C${g.col}`;
}

function signature(dto: GameStateLiteDTO): string {
  let rows = "";
  const layerEntries = dto.rows.slice().sort((a, b) => a.layer - b.layer);
  for (const entry of layerEntries) {
    rows += `|L${entry.layer}`;
    for (let i = 0; i < entry.rows.length; i++) {
      rows += `|${entry.rows[i].join(",")}`;
    }
  }

  const activeLayers = [...(dto.movementActiveLayers ?? [])]
    .sort((a, b) => a - b)
    .join(",");
  return `p=${dto.playerHexId}|active=${activeLayers}${rows}`;
}

/**
 * Breadth-first search for the fewest moves to reach the goal hex.
 * Uses attemptMove (portal + endTurn row rotation) on the engine row layout.
 */
export function computeMinMovesToGoal(base: GameState, maxTurns = 80): number | null {
  const goalId = goalIdFromState(base);
  if (!goalId) return null;

  const startHex = base.hexesById.get(base.playerHexId);
  if (!startHex || startHex.missing || startHex.blocked) return null;

  if (base.playerHexId === goalId) return 0;

  const startDto = snapshotStateLite(base);

  type Node = { dto: GameStateLiteDTO; turns: number };

  const q: Node[] = [{ dto: startDto, turns: 0 }];
  let head = 0;

  const seen = new Set<string>([signature(startDto)]);

  let explored = 0;
  const MAX_NODES = 400000;

  while (head < q.length) {
    if (explored >= MAX_NODES) return null;

    const node = q[head++];
    explored++;

    if (node.turns >= maxTurns) continue;

    const st = restoreStateLite(base, node.dto);
    const neighbors = neighborIdsSameLayer(st, st.playerHexId);

    for (const nid of neighbors) {
      const nh = st.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;

      const st2 = restoreStateLite(base, node.dto);
      const result = attemptMove(st2, nid);
      if (!result.ok) continue;

      const turnsUsed = node.turns + 1;
      if (st2.playerHexId === goalId) return turnsUsed;

      const dto2 = snapshotStateLite(st2);
      const sig = signature(dto2);
      if (seen.has(sig)) continue;
      seen.add(sig);

      q.push({ dto: dto2, turns: turnsUsed });
    }
  }

  return null;
}
