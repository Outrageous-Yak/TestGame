// src/engine/snapshot.ts
import type { GameState, Hex, Scenario, Transition } from "./types";

/**
 * Full DTO (save/load, debugging)
 */
type HexDTO = Omit<Hex, "pos"> & { pos: { layer: number; row: number; col: number } };

export type GameStateDTO = {
  scenario: Scenario;
  turn: number;
  visibleLayers: number[];
  playerHexId: string;

  hexes: HexDTO[];
  rows: Array<{ layer: number; rows: string[][] }>;
  transitionsByFromId: Array<{ fromId: string; t: Transition }>;

  lastGuaranteedUpId?: string;
  lastGuaranteedUpTurn?: number;
};

/**
 * Lite DTO (fast turn-search where only the shifting layout + player position changes)
 * - Does NOT copy hexes/transitions (they are stable across turns)
 * - Only stores rows layout, player id, turn, and visible layers
 */
export type GameStateLiteDTO = {
  turn: number;
  visibleLayers: number[];
  playerHexId: string;
  rows: Array<{ layer: number; rows: string[][] }>;

  lastGuaranteedUpId?: string;
  lastGuaranteedUpTurn?: number;
};

/* =========================================================
   Full snapshot (unchanged behavior)
========================================================= */

export function snapshotState(state: GameState): GameStateDTO {
  return {
    scenario: state.scenario,
    turn: state.turn,
    visibleLayers: Array.from(state.visibleLayers),
    playerHexId: state.playerHexId,

    hexes: Array.from(state.hexesById.values()).map((h) => ({
      ...h,
      pos: { ...h.pos },
    })),

    rows: Array.from(state.rows.entries()).map(([layer, r]) => ({
      layer,
      rows: r.map((row) => [...row]),
    })),

    transitionsByFromId: Array.from(state.transitionsByFromId.entries()).map(([fromId, t]) => ({
      fromId,
      t,
    })),

    lastGuaranteedUpId: state.lastGuaranteedUpId,
    lastGuaranteedUpTurn: state.lastGuaranteedUpTurn,
  };
}

export function restoreState(dto: GameStateDTO): GameState {
  const hexesById = new Map<string, Hex>();
  for (const h of dto.hexes) {
    hexesById.set(h.id, { ...h, pos: { ...h.pos } });
  }

  const rows = new Map<number, string[][]>();
  for (const entry of dto.rows) {
    rows.set(entry.layer, entry.rows.map((r) => [...r]));
  }

  const transitionsByFromId = new Map<string, Transition>();
  for (const entry of dto.transitionsByFromId) {
    transitionsByFromId.set(entry.fromId, entry.t);
  }

  return {
    scenario: dto.scenario,
    turn: dto.turn,
    visibleLayers: new Set(dto.visibleLayers),
    playerHexId: dto.playerHexId,
    hexesById,
    rows,
    transitionsByFromId,
    lastGuaranteedUpId: dto.lastGuaranteedUpId,
    lastGuaranteedUpTurn: dto.lastGuaranteedUpTurn,
  };
}

/* =========================================================
   Lite snapshot (for computeReachabilityWithShifts)
========================================================= */

/**
 * Snapshot only the parts that change during shifting-turn simulation.
 * This is MUCH cheaper than snapshotState.
 */
export function snapshotStateLite(state: GameState): GameStateLiteDTO {
  return {
    turn: state.turn,
    visibleLayers: Array.from(state.visibleLayers),
    playerHexId: state.playerHexId,

    rows: Array.from(state.rows.entries()).map(([layer, r]) => ({
      layer,
      rows: r.map((row) => [...row]),
    })),

    lastGuaranteedUpId: state.lastGuaranteedUpId,
    lastGuaranteedUpTurn: state.lastGuaranteedUpTurn,
  };
}

/**
 * Restore from the lite DTO by reusing the immutable parts from a "base" GameState.
 *
 * You must pass the original start state (or any state with the same scenario/hexes/transitions).
 */
export function restoreStateLite(base: GameState, dto: GameStateLiteDTO): GameState {
  // Reuse hexes + transitions maps by reference (read-only in the sim)
  const hexesById = base.hexesById;
  const transitionsByFromId = base.transitionsByFromId;
  const scenario = base.scenario;

  // Rows must be cloned because they mutate with shifting
  const rows = new Map<number, string[][]>();
  for (const entry of dto.rows) {
    rows.set(entry.layer, entry.rows.map((r) => [...r]));
  }

  return {
    scenario,
    turn: dto.turn,
    visibleLayers: new Set(dto.visibleLayers),
    playerHexId: dto.playerHexId,
    hexesById,
    rows,
    transitionsByFromId,
    lastGuaranteedUpId: dto.lastGuaranteedUpId,
    lastGuaranteedUpTurn: dto.lastGuaranteedUpTurn,
  };
}
