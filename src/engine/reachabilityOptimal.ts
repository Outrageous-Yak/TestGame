// Minimum moves to goal using the same shift model as the React UI (rowShifts
// derived from per-layer move counters, plus engine row rotation via attemptMove).
import type { GameState } from "./types";
import { ROW_LENS } from "./board";
import { neighborIdsSameLayer } from "./neighbors";
import { attemptMove } from "./rules";
import { restoreStateLite, snapshotStateLite, type GameStateLiteDTO } from "./snapshot";

function derivedRowShiftUnits(
  movement: Record<string, string>,
  layer: number,
  row: number,
  movesTaken: number
): number {
  const pat = movement[String(layer)] ?? "NONE";
  const cols = ROW_LENS[row] ?? 7;

  if (pat === "SEVEN_LEFT_SIX_RIGHT") {
    if (cols === 7) return -movesTaken;
    if (cols === 6) return movesTaken;
  }

  return 0;
}

function injectRowShifts(
  state: GameState,
  layerMoves: Record<number, number>,
  layers: number,
  movement: Record<string, string>
): void {
  const rowShifts: Record<string | number, Record<number, number>> = {};

  for (let layer = 1; layer <= layers; layer++) {
    const perRow: Record<number, number> = {};
    const m = layerMoves[layer] ?? 0;

    for (let r = 0; r < ROW_LENS.length; r++) {
      perRow[r] = derivedRowShiftUnits(movement, layer, r, m);
    }

    rowShifts[layer] = perRow;
    rowShifts["L" + layer] = perRow;
  }

  (state as GameState & { rowShifts?: unknown }).rowShifts = rowShifts;
}

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

function signature(dto: GameStateLiteDTO, layerMoves: Record<number, number>): string {
  const lm = Object.keys(layerMoves)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((k) => `${k}:${layerMoves[k] ?? 0}`)
    .join(",");

  let rows = "";
  const layerEntries = dto.rows.slice().sort((a, b) => a.layer - b.layer);
  for (const entry of layerEntries) {
    rows += `|L${entry.layer}`;
    for (let i = 0; i < entry.rows.length; i++) {
      rows += `|${entry.rows[i].join(",")}`;
    }
  }

  return `p=${dto.playerHexId}|t=${dto.turn}|lm=${lm}${rows}`;
}

/**
 * Breadth-first search for the fewest moves to reach the goal hex, matching
 * in-browser play: inject UI rowShifts from layer move counters before each
 * adjacency check, then apply attemptMove (portal + endTurn row rotation).
 */
export function computeMinMovesToGoal(
  base: GameState,
  layerMoves: Record<number, number>,
  maxTurns = 80
): number | null {
  const goalId = goalIdFromState(base);
  if (!goalId) return null;

  const startHex = base.hexesById.get(base.playerHexId);
  if (!startHex || startHex.missing || startHex.blocked) return null;

  if (base.playerHexId === goalId) return 0;

  const layers = base.scenario.layers;
  const movement = (base.scenario.movement ?? {}) as Record<string, string>;
  const lm0: Record<number, number> = { ...layerMoves };

  const startDto = snapshotStateLite(base);

  type Node = { dto: GameStateLiteDTO; lm: Record<number, number>; turns: number };

  const q: Node[] = [{ dto: startDto, lm: lm0, turns: 0 }];
  let head = 0;

  const seen = new Set<string>([signature(startDto, lm0)]);

  let explored = 0;
  const MAX_NODES = 400000;

  while (head < q.length) {
    if (explored >= MAX_NODES) return null;

    const node = q[head++];
    explored++;

    if (node.turns >= maxTurns) continue;

    const st = restoreStateLite(base, node.dto);
    injectRowShifts(st, node.lm, layers, movement);

    const fromLayer = playerLayer(st.playerHexId);
    const neighbors = neighborIdsSameLayer(st, st.playerHexId);

    for (const nid of neighbors) {
      const nh = st.hexesById.get(nid);
      if (!nh || nh.missing || nh.blocked) continue;

      const st2 = restoreStateLite(base, node.dto);
      injectRowShifts(st2, node.lm, layers, movement);

      const result = attemptMove(st2, nid);
      if (!result.ok) continue;

      const turnsUsed = node.turns + 1;
      if (st2.playerHexId === goalId) return turnsUsed;

      const lm2 = { ...node.lm };
      lm2[fromLayer] = (lm2[fromLayer] ?? 0) + 1;

      const dto2 = snapshotStateLite(st2);
      const sig = signature(dto2, lm2);
      if (seen.has(sig)) continue;
      seen.add(sig);

      q.push({ dto: dto2, lm: lm2, turns: turnsUsed });
    }
  }

  return null;
}
