import type { GameState, Hex, Scenario, Transition } from "./types";

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

export function snapshotState(state: GameState): GameStateDTO {
  return {
    scenario: state.scenario,
    turn: state.turn,
    visibleLayers: Array.from(state.visibleLayers),
    playerHexId: state.playerHexId,
    hexes: Array.from(state.hexesById.values()).map(h => ({ ...h, pos: { ...h.pos } })),
    rows: Array.from(state.rows.entries()).map(([layer, r]) => ({ layer, rows: r.map(row => [...row]) })),
    transitionsByFromId: Array.from(state.transitionsByFromId.entries()).map(([fromId, t]) => ({ fromId, t })),
    lastGuaranteedUpId: state.lastGuaranteedUpId,
    lastGuaranteedUpTurn: state.lastGuaranteedUpTurn
  };
}

export function restoreState(dto: GameStateDTO): GameState {
  const hexesById = new Map<string, Hex>();
  for (const h of dto.hexes) hexesById.set(h.id, { ...h, pos: { ...h.pos } });

  const rows = new Map<number, string[][]>();
  for (const entry of dto.rows) rows.set(entry.layer, entry.rows.map(r => [...r]));

  const transitionsByFromId = new Map<string, Transition>();
  for (const entry of dto.transitionsByFromId) transitionsByFromId.set(entry.fromId, entry.t);

  return {
    scenario: dto.scenario,
    turn: dto.turn,
    visibleLayers: new Set(dto.visibleLayers),
    playerHexId: dto.playerHexId,
    hexesById,
    rows,
    transitionsByFromId,
    lastGuaranteedUpId: dto.lastGuaranteedUpId,
    lastGuaranteedUpTurn: dto.lastGuaranteedUpTurn
  };
}
