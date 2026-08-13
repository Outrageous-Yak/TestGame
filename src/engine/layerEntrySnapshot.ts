/**
 * Step 5B — Layer-entry snapshot + safe restoration foundation.
 *
 * RESTORE WORLD STATE. PRESERVE ATTEMPT HISTORY.
 *
 * Capture / restore primitives. Step 5C wires restoration to Red dice banishment.
 */

import type { GameState, LayerEntryWorldSnapshot } from "./types";

export type LayerRestoreStatus =
  | "restored"
  | "no_snapshot"
  | "invalid_snapshot"
  | "internal_error";

export type LayerRestoreResult = {
  status: LayerRestoreStatus;
  layer: number;
  state: GameState;
};

function cloneRowTables(
  rows: Array<{ layer: number; rows: string[][] }>
): Array<{ layer: number; rows: string[][] }> {
  return rows.map((entry) => ({
    layer: entry.layer,
    rows: entry.rows.map((row) => [...row]),
  }));
}

function rowsMapToTables(rows: Map<number, string[][]>): Array<{ layer: number; rows: string[][] }> {
  return Array.from(rows.entries()).map(([layer, r]) => ({
    layer,
    rows: r.map((row) => [...row]),
  }));
}

function tablesToRowsMap(tables: Array<{ layer: number; rows: string[][] }>): Map<number, string[][]> {
  const rows = new Map<number, string[][]>();
  for (const entry of tables) {
    rows.set(entry.layer, entry.rows.map((row) => [...row]));
  }
  return rows;
}

function collectedRevealedHexIds(state: GameState): string[] {
  const ids: string[] = [];
  for (const hex of state.hexesById.values()) {
    if (hex.revealed) ids.push(hex.id);
  }
  return ids;
}

/** Deep-clone a stored snapshot so callers cannot mutate the live collection. */
export function cloneLayerEntryWorldSnapshot(
  snap: LayerEntryWorldSnapshot
): LayerEntryWorldSnapshot {
  return {
    layer: snap.layer,
    playerHexId: snap.playerHexId,
    visibleLayers: [...snap.visibleLayers],
    movementActiveLayers: [...snap.movementActiveLayers],
    rows: cloneRowTables(snap.rows),
    revealedHexIds: [...snap.revealedHexIds],
    lastGuaranteedUpId: snap.lastGuaranteedUpId,
    lastGuaranteedUpTurn: snap.lastGuaranteedUpTurn,
  };
}

function readWorldSnapshot(state: GameState, layer: number): LayerEntryWorldSnapshot {
  return {
    layer,
    playerHexId: state.playerHexId,
    visibleLayers: Array.from(state.visibleLayers),
    movementActiveLayers: Array.from(state.movementActiveLayers),
    rows: rowsMapToTables(state.rows),
    revealedHexIds: collectedRevealedHexIds(state),
    lastGuaranteedUpId: state.lastGuaranteedUpId,
    lastGuaranteedUpTurn: state.lastGuaranteedUpTurn,
  };
}

function snapshotLooksValid(state: GameState, snap: LayerEntryWorldSnapshot): boolean {
  if (!Number.isInteger(snap.layer) || snap.layer < 1 || snap.layer > state.scenario.layers) {
    return false;
  }
  if (snap.layer !== Math.trunc(snap.layer)) return false;
  const player = state.hexesById.get(snap.playerHexId);
  if (!player) return false;
  if (player.pos.layer !== snap.layer) return false;
  if (player.missing) return false;
  if (!Array.isArray(snap.rows) || snap.rows.length === 0) return false;
  const layerRows = snap.rows.find((e) => e.layer === snap.layer);
  if (!layerRows || !Array.isArray(layerRows.rows) || layerRows.rows.length === 0) return false;
  for (const entry of snap.rows) {
    for (const row of entry.rows) {
      for (const id of row) {
        if (!state.hexesById.has(id)) return false;
      }
    }
  }
  return true;
}

function applyWorldSnapshot(state: GameState, snap: LayerEntryWorldSnapshot): void {
  const visibleLayers = new Set(snap.visibleLayers);
  const movementActiveLayers = new Set(snap.movementActiveLayers);
  const rows = tablesToRowsMap(snap.rows);
  const revealed = new Set(snap.revealedHexIds);

  state.playerHexId = snap.playerHexId;
  state.visibleLayers = visibleLayers;
  state.movementActiveLayers = movementActiveLayers;
  state.rows = rows;
  state.lastGuaranteedUpId = snap.lastGuaranteedUpId;
  state.lastGuaranteedUpTurn = snap.lastGuaranteedUpTurn;

  for (const hex of state.hexesById.values()) {
    hex.revealed = revealed.has(hex.id);
  }
}

/**
 * Capture the current world state as the most-recent entry snapshot for `layer`.
 * No-op on analysis-safe solver branches (snapshots are a runtime primitive).
 * Replaces any previous snapshot for this layer only.
 */
export function captureLayerEntrySnapshot(state: GameState, layer: number): void {
  if (state.analysisSafe) return;
  const player = state.hexesById.get(state.playerHexId);
  if (!player || player.pos.layer !== layer) return;

  const snap = readWorldSnapshot(state, layer);
  if (!state.layerEntrySnapshots) state.layerEntrySnapshots = new Map();
  state.layerEntrySnapshots.set(layer, snap);
}

/**
 * Restore restorable world state from the most recent entry snapshot for `layer`.
 *
 * PRESERVES attempt history: turn, consumedEncounterIds, moveHistory,
 * and the snapshot collection itself.
 *
 * Does not increment turn. Does not trigger portals, cards, or encounters.
 */
export function restoreLayerEntrySnapshot(state: GameState, layer: number): LayerRestoreResult {
  try {
    const stored = state.layerEntrySnapshots?.get(layer);
    if (!stored) {
      return { status: "no_snapshot", layer, state };
    }
    const cloned = cloneLayerEntryWorldSnapshot(stored);
    if (!snapshotLooksValid(state, cloned)) {
      return { status: "invalid_snapshot", layer, state };
    }
    applyWorldSnapshot(state, cloned);
    return { status: "restored", layer, state };
  } catch {
    return { status: "internal_error", layer, state };
  }
}

/** Isolated clone of the stored snapshot, or null if none. */
export function getLayerEntrySnapshot(
  state: GameState,
  layer: number
): LayerEntryWorldSnapshot | null {
  const stored = state.layerEntrySnapshots?.get(layer);
  if (!stored) return null;
  return cloneLayerEntryWorldSnapshot(stored);
}

export function listLayerEntrySnapshotLayers(state: GameState): number[] {
  if (!state.layerEntrySnapshots) return [];
  return Array.from(state.layerEntrySnapshots.keys()).sort((a, b) => a - b);
}
