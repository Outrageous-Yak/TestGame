# Step 5B — Layer-Entry Snapshot + Safe Restoration Foundation

## Status

Infrastructure only for capture/restore. **STEP 5B DOES NOT IMPLEMENT BANISHMENT.**

No dice. No RNG. No V1–V4 punishments. No Restore button in normal play.
Restoration is **not** attached to Red Encounter Continue in 5B.

**LAYER RESTORE DOES NOT RESET CONSUMED ENCOUNTERS.**

Step **5C** wires restoration to failed Red dice rolls
(`docs/gameplay/red-encounter-dice-banishment.md`).

## Purpose

Provide a deterministic, attempt-local primitive that can:

1. Capture an authoritative restoration point when the player **enters a layer**.
2. Preserve that snapshot while the player plays on that layer.
3. Restore restorable **world** state to that entry point on explicit request.
4. Preserve **attempt history** that must not rewind.

Authoritative rule:

> **RESTORE WORLD STATE. PRESERVE ATTEMPT HISTORY.**

A restoration is not Retry, New Game, Replay, save-load, Undo, or arbitrary time travel.

## Architecture

Reuse existing `GameState`. Do not create a parallel board, move, or row-shift engine.

| Existing primitive | Role in 5B |
|---|---|
| `snapshotState` / `restoreState` | Analysis/debug DTO. **Not** the layer-entry stack. Intentionally **omits** `layerEntrySnapshots`. |
| `snapshotStateLite` / `restoreStateLite` | Solver BFS. Omits snapshots; `analysisSafe` makes capture a no-op. |
| `GameState.layerEntrySnapshots` | Attempt-local `Map<layer, LayerEntryWorldSnapshot>`. |
| `captureLayerEntrySnapshot` / `restoreLayerEntrySnapshot` | Authoritative 5B API (`src/engine/layerEntrySnapshot.ts`). |

Immutable configuration (`scenario`, hex identity/`pos`/`missing`/`blocked`, `transitionsByFromId`) is **shared**, not deep-copied per snapshot.

Mutable restorable world state is deep-copied: rows, reveal flags, visible/active layer sets, player hex id.

## Capture timing

A snapshot represents the state **after layer entry has fully resolved**.

### Initial layer

`buildInitialState` / `newGame`:

1. Build board
2. `enterLayer(start.layer)`
3. `revealHex(start)`
4. **capture** start layer

Turn is still `0`. No `endTurn` yet.

### Portal entry (UP or DOWN)

`attemptMoveToSlot` after a successful transition whose destination **layer differs**:

1. Move onto portal source; reveal source
2. Teleport to destination
3. `activateLayerMovement(dest.layer)`
4. `enterLayer(dest.layer)` (visibleLayers + optional guaranteed-UP reveal)
5. `revealHex(dest)`
6. Goal check
7. `endTurn` (`turn++` + row movement on all **already active** layers, including the newly entered one)
8. **capture destination layer**

The playable entry state therefore includes the row shift caused by the entering move.

Do **not** capture:

- halfway through portal resolution
- UI `+ Layer` / `− Layer` browse (`enterLayer` without movement)
- same-layer walks
- wrong taps
- Reveal items
- Red Encounter Continue
- `passTurn` without a layer change
- `analysisSafe` solver probes

## Re-entry

The snapshot is the **most recent entry to that layer during this attempt**.

Leave L3 (snapshot A) → later enter L3 at B → snapshot L3 **becomes B**.
L1 / L2 / L4 snapshots are left intact.

## Restoration

```ts
restoreLayerEntrySnapshot(state, layer): LayerRestoreResult
// status: restored | no_snapshot | invalid_snapshot | internal_error
```

Mutates the live `GameState` in place. Never `state = snapshot`.

Does **not**:

- decrement `turn`
- rewind elapsed UI time (there is no attempt timer on `GameState`)
- replace `consumedEncounterIds`
- replace `moveHistory`
- replace the snapshot `Map`
- fire portals, cards, or encounter panels
- write localStorage / progression

After restore, callers recompute legal moves / terminal status via existing
`evaluateAttemptTerminal` / `isAuthoritativeStranded`.

## Field ownership

| State | Restore / Preserve / Recompute | Reason |
|---|---|---|
| Player position (`playerHexId`) | Restore | Authoritative world identity at layer entry |
| Active/current layer | Restore via player hex + `movementActiveLayers` / `visibleLayers` | Entry world |
| Hex layout / missing / blocked | N/A (immutable config) | Shared `hexesById` records except `revealed` |
| Row rotations (`rows`) | Restore | Dynamic board at entry, including entry-move shift |
| Portal table | N/A (immutable) | Shared `transitionsByFromId` |
| `Hex.revealed` | Restore | Authoritative engine fog at entry |
| Memory / Echo / Lantern / Crystal / Night overlays | Recompute (UI) | Not stored on `GameState`; presentation derived from current hex + UI sets |
| `turn` (move count) | Preserve | Restoration must not improve score |
| Elapsed attempt time | Preserve (UI; not in GameState) | No timer field exists; do not invent one |
| `consumedEncounterIds` | Preserve | Attempt history; **must survive restore** |
| `moveHistory` | Preserve | Attempt log |
| `layerEntrySnapshots` collection | Preserve | Other layers' snapshots stay |
| Pending RedEncounterPanel | N/A / clear | Snapshots never store modal UI |
| Goal / STRANDED terminal | Recompute | `evaluateAttemptTerminal` on restored world |
| Legal-move caches | Recompute | Probes via lite snapshot |
| `analysisSafe` | N/A | Solver-only |
| Progression / best scores | N/A | Never written by 5B |
| UI `movesTaken` / `currentLayer` | Preserve if 5C wires UI | Not in GameState; 5B has no player Restore control |

## consumedEncounterIds policy

**LAYER RESTORE DOES NOT RESET CONSUMED ENCOUNTERS.**

Example: snapshot consumed `{}`; live consumed `{red_A}`; restore L3 → still `{red_A}`.
Landing on Red A again in the same attempt does not retrigger.

Copy-on-write `Set` isolation from Step 5A is unchanged. Restore does not assign the snapshot's (absent) set.

## Move-count policy

Enter L3 at turn 12, play to 18, restore L3 → turn remains **18**.
Restore itself adds **zero** moves. The next real move increments as usual.

## Timer policy

`GameState` has **no elapsed-time field**. HUD clocks are UI wall-clock for logs only; best score is **moves**.
5B does not add a timer and therefore cannot rewind one.

## Row movement

Restore replaces `state.rows` with a deep clone of the captured occupancy.
The next `endTurn` applies `applyLayerRowMovement` from that restored phase — no double-shift, no skipped shift.

## Portals

Restore places the player on the recorded entry hex. That is **not** a move, so
`attemptMoveToSlot` portal logic does not run. Standing on an entry coordinate
does not re-fire the portal that produced it. The next legitimate portal click still works.

## Visibility

Engine fog (`Hex.revealed`) is restorable world state.

Scenario visibility **modes** (Normal, Partly Cloudy, Cloudy, Night, Invisible,
Memory, Lantern, Echo, Crystal) are UI/scenario presentation. 5B does not change
those rules. Memory/Echo visited sets live in `GameController` and are not
snapshotted (no player-facing restore in 5B). Lantern radius stays a scenario param.

Restoring reveal flags must not be used as a hidden-information cheat in 5C UI;
5B only restores what the engine had at entry.

## Missing / invalid snapshot

| Status | Meaning |
|---|---|
| `no_snapshot` | Layer never captured. Live state unchanged. No throw. |
| `invalid_snapshot` | Failed cheap invariants (player hex missing, layer out of range, row ids unknown). Unchanged. |
| `internal_error` | Unexpected throw while applying. |
| `restored` | World applied; history preserved. |

No Start navigation, no reload, no Solver analysis during restore.

## Mutation isolation

Capture deep-copies rows, layer id arrays, and revealed ids.
`getLayerEntrySnapshot` returns another clone.
Mutating live rows after capture does not change the store.
Mutating live state after restore does not change the store.

## Storage isolation

Snapshots are **attempt-local memory only**.

Retry / Exit / Replay / `newGame` → brand new `GameState` → new Map.

No keys such as `layer-entry-snapshots`, `hexgame-encounters`, or writes to
`hexgame-progression`, `hexgame-best:*`, `track_planner_drafts_v1`,
`campaign_map_drafts_v1`.

## Simulator / analysis policy

- **Do not** put snapshots in `solverStateKey` or lite DTOs.
- Solver must **not** branch on restoration.
- Worker still posts `PlannerTrack`, not `GameState`.
- `restoreStateLite` omits `layerEntrySnapshots`; `analysisSafe` skips capture.

Sevenfold resource-safety remains: bounded `search_limit` + Stranding Unknown
under the default browser budget.

## Track Planner / Layer Playtest

Playtest uses `newGame` / `attemptMove`, so snapshots exist automatically.
Inspect helpers (not a Restore button):

- `playtestLayerEntrySnapshot(state, layer)`
- `playtestLayerEntrySnapshotLayers(state)`

No authoring schema. Snapshots are not track JSON.

## Red encounter (5A) interaction

Unchanged lifecycle:

land on unresolved Red → panel → Continue → consumed → resume / deferred STRANDED.

Continue does **not** restore. Continue does **not** capture.

## Explicit Step 5C deferrals

- Dice / RNG
- Banishment / punishment selection
- V1 / V2 / V3 / V4 effects
- Automatic restore after Red
- Player-facing Restore / banish UI
- Encounter Solver branching
- Persistent checkpoints / save-load
- Commercial Player Shell
