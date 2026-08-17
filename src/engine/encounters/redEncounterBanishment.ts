/**
 * Step 5C — Red encounter banishment → layer-entry snapshot restore.
 *
 * BANISHMENT = restore the most recent layer-entry snapshot for the encounter layer.
 * Preserves turn, moveHistory, consumedEncounterIds (caller must consume before restore).
 * Does not increment moves. Does not auto-fire portals.
 */

import type { GameState } from "../types";
import {
  restoreLayerEntrySnapshot,
  type LayerRestoreResult,
  type LayerRestoreStatus,
} from "../layerEntrySnapshot";

export type RedBanishmentResult = {
  status: LayerRestoreStatus;
  layer: number;
  state: GameState;
  /** True only when world state was actually restored. */
  restored: boolean;
};

/**
 * Apply banishment by restoring the layer-entry snapshot for `layer`.
 *
 * On no_snapshot / invalid_snapshot / internal_error: live state is left unchanged
 * (restoreLayerEntrySnapshot already guarantees that). Caller should present a
 * contained failure UI — never Start reload, never treat as success.
 */
export function applyRedEncounterBanishment(state: GameState, layer: number): RedBanishmentResult {
  const result: LayerRestoreResult = restoreLayerEntrySnapshot(state, layer);
  return {
    status: result.status,
    layer: result.layer,
    state: result.state,
    restored: result.status === "restored",
  };
}
