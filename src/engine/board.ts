import type { GameState, Hex, Pos, Scenario, Transition } from "./types";

export const ROW_LENS = [7, 6, 7, 6, 7, 6, 7];

export function posId(p: Pos): string {
  return `L${p.layer}-R${p.row}-C${p.col}`;
}

export function buildInitialState(scenario: Scenario): GameState {
  const missingSet = new Set(scenario.missing.map(posId));
  const blockedSet = new Set(scenario.blocked.map(posId));

  const hexesById = new Map<string, Hex>();
  const rows = new Map<number, string[][]>();

  for (let layer = 1; layer <= scenario.layers; layer++) {
    const layerRows: string[][] = [];
    for (let row = 0; row < ROW_LENS.length; row++) {
      const len = ROW_LENS[row];
      const rowIds: string[] = [];
      for (let col = 0; col < len; col++) {
        const id = posId({ layer, row, col });
        const missing = missingSet.has(id);
        const blocked = blockedSet.has(id);
        const isGoal = id === posId(scenario.goal);

        const hex: Hex = {
          id,
          pos: { layer, row, col },
          kind: isGoal ? "GOAL" : "NORMAL",
          missing,
          blocked,
          revealed: false
        };

        hexesById.set(id, hex);
        rowIds.push(id);
      }
      layerRows.push(rowIds);
    }
    rows.set(layer, layerRows);
  }

  const transitionsByFromId = new Map<string, Transition>();
  for (const t of scenario.transitions) {
    transitionsByFromId.set(posId(t.from), t);
  }

  const state: GameState = {
    scenario,
    turn: 0,
    visibleLayers: new Set<number>(),
    playerHexId: posId(scenario.start),
    hexesById,
    rows,
    transitionsByFromId
  };

  // enter start layer + reveal start
  enterLayer(state, scenario.start.layer);
  revealHex(state, state.playerHexId);

  return state;
}

export function revealHex(state: GameState, id: string) {
  const h = state.hexesById.get(id);
  if (!h) return;
  h.revealed = true;
}

export function enterLayer(state: GameState, layer: number): string | null {
  const wasVisible = state.visibleLayers.has(layer);
  state.visibleLayers.add(layer);
  if (wasVisible) return null;

  // guarantee: reveal at least one UP transition on first entry
  if (!state.scenario.revealOnEnterGuaranteedUp) return null;

  const layerRows = state.rows.get(layer);
  if (!layerRows) return null;

  for (const row of layerRows) {
    for (const id of row) {
      const h = state.hexesById.get(id)!;
      if (h.missing || h.blocked) continue;
      const tr = state.transitionsByFromId.get(id);
      if (tr?.type === "UP") {
        revealHex(state, id);
        state.lastGuaranteedUpId = id;
        state.lastGuaranteedUpTurn = state.turn;
        return id;
      }
    }
  }
  return null;
}
