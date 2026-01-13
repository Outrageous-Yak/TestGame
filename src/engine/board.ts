// src/engine/board.ts
import type { GameState, Hex, Pos, Scenario, Transition } from "./types";

/* =========================================================
   Board shape
========================================================= */

/**
 * Row indices: 0..ROW_LENS.length-1
 * If you want an extra row, add an entry here.
 */
export const ROW_LENS = [7, 6, 7, 6, 7, 6, 7];

/* =========================================================
   Ids / Bounds
========================================================= */

export function posId(p: Pos): string {
  return `L${p.layer}-R${p.row}-C${p.col}`;
}

export function inBounds(p: Pos, layers: number): boolean {
  if (p.layer < 1 || p.layer > layers) return false;
  if (p.row < 0 || p.row >= ROW_LENS.length) return false;
  const len = ROW_LENS[p.row];
  if (p.col < 0 || p.col >= len) return false;
  return true;
}

export function assertInBounds(p: Pos, layers: number, label: string): void {
  if (!inBounds(p, layers)) {
    throw new Error(
      `${label} out of bounds: L${p.layer} R${p.row} C${p.col}. ` +
      `Valid rows: 0..${ROW_LENS.length - 1}, layers: 1..${layers}.`
    );
  }
}

/* =========================================================
   Build initial state
========================================================= */

export function buildInitialState(scenario: Scenario): GameState {
  // ---- Fail fast: scenario must match board geometry
  assertInBounds(scenario.start, scenario.layers, "scenario.start");
  assertInBounds(scenario.goal, scenario.layers, "scenario.goal");

  for (const p of scenario.missing) {
    assertInBounds(p, scenario.layers, "scenario.missing");
  }
  for (const p of scenario.blocked) {
    assertInBounds(p, scenario.layers, "scenario.blocked");
  }
  for (const t of scenario.transitions) {
    assertInBounds(t.from, scenario.layers, "scenario.transitions.from");
    assertInBounds(t.to, scenario.layers, "scenario.transitions.to");
  }

  const missingSet = new Set(scenario.missing.map(posId));
  const blockedSet = new Set(scenario.blocked.map(posId));

  const hexesById = new Map<string, Hex>();
  const rows = new Map<number, string[][]>();

  // Build grid
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

  // Transitions indexed by "from"
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

  // Enter starting layer and reveal starting hex
  enterLayer(state, scenario.start.layer);
  revealHex(state, state.playerHexId);

  return state;
}

/* =========================================================
   Reveal / Layer entry
========================================================= */

export function revealHex(state: GameState, id: string): void {
  const h = state.hexesById.get(id);
  if (!h) return;
  h.revealed = true;
}

export function enterLayer(state: GameState, layer: number): string | null {
  const wasVisible = state.visibleLayers.has(layer);
  state.visibleLayers.add(layer);
  if (wasVisible) return null;

  // Guarantee: reveal at least one UP transition on first entry
  if (!state.scenario.revealOnEnterGuaranteedUp) return null;

  const layerRows = state.rows.get(layer);
  if (!layerRows) return null;

  for (const row of layerRows) {
    for (const id of row) {
      const h = state.hexesById.get(id);
      if (!h) continue;
      if (h.missing || h.blocked) continue;

      const tr = state.transitionsByFromId.get(id);
      if (tr?.type === "UP") {
        revealHex(state, id);
        // Optional: only if your GameState supports these fields
        (state as any).lastGuaranteedUpId = id;
        (state as any).lastGuaranteedUpTurn = state.turn;
        return id;
      }
    }
  }

  return null;
}
