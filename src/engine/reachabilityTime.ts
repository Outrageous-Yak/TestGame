import type { GameState } from "./types";
import { neighborIdsSameLayer } from "./neighbors";
import { attemptMove, passTurn } from "./rules";
import { snapshotState, restoreState, type GameStateDTO } from "./snapshot";

export function computeReachabilityWithShifts(
  start: GameState,
  maxTurns: number = 20
): { reachable: boolean; minTurns: number | null; explored: number; frontier: number } {
  const startDto = snapshotState(start);
  if (isGoalReached(start)) return { reachable: true, minTurns: 0, explored: 1, frontier: 0 };

  type Node = { dto: GameStateDTO; turnsUsed: number };
  const q: Node[] = [{ dto: startDto, turnsUsed: 0 }];
  const seen = new Set<string>([signature(startDto)]);
  let explored = 0;

  while (q.length) {
    const node = q.shift()!;
    explored++;
    if (node.turnsUsed >= maxTurns) continue;

    const base = restoreState(node.dto);
    const fromId = base.playerHexId;

    const nextDtos: GameStateDTO[] = [];

    // PASS
    {
      const s2 = restoreState(node.dto);
      passTurn(s2);
      nextDtos.push(snapshotState(s2));
    }

    // MOVES
    for (const nid of neighborIdsSameLayer(base, fromId)) {
      const nh = base.hexesById.get(nid);
      if (!nh || nh.blocked || nh.missing) continue;

      const s2 = restoreState(node.dto);
      const r = attemptMove(s2, nid);
      if (!r.ok) continue;
      nextDtos.push(snapshotState(s2));
    }

    for (const dto of nextDtos) {
      const turnsUsed = node.turnsUsed + 1;
      const sig = signature(dto);
      if (seen.has(sig)) continue;
      seen.add(sig);

      const sCheck = restoreState(dto);
      if (isGoalReached(sCheck)) return { reachable: true, minTurns: turnsUsed, explored, frontier: q.length };

      q.push({ dto, turnsUsed });
    }
  }

  return { reachable: false, minTurns: null, explored, frontier: q.length };
}

function isGoalReached(state: GameState): boolean {
  const h = state.hexesById.get(state.playerHexId);
  return !!h && h.kind === "GOAL";
}

function signature(dto: GameStateDTO): string {
  const parts: string[] = [];
  parts.push(`t=${dto.turn}`);
  parts.push(`p=${dto.playerHexId}`);
  const sorted = dto.rows.slice().sort((a, b) => a.layer - b.layer);
  for (const layerEntry of sorted) {
    parts.push(`L${layerEntry.layer}`);
    for (const r of layerEntry.rows) parts.push(r.join(","));
  }
  return parts.join("|");
}
