# Track Planner — Layer Playtest

Temporary interactive harness for testing **one layer** of an authored Track.

## Temporary GameState

`freshLayerPlaytestState(track)` builds an in-memory engine `GameState` from the track (or a board-preview scenario if Start/Goal are incomplete).

Playtest actions only mutate that temporary state — never the PlannerTrack draft.

## Player placement

**Place player** sets `playerHexId` on the temporary state. Authored Start is unchanged. Missing geometry is rejected.

## Movement

Taps on adjacent hexes call authoritative `tryMove` / `attemptMove`. Reachable neighbors are highlighted.

## Row advance

**Pass turn** activates the player’s layer (designer convenience) then calls engine `passTurn`, which applies authored row movement for active layers via `applyLayerRowMovement`.

Display uses `hexIdAtSlot` / `findSlot` so logical hex identity ≠ display slot after shifts.

## Portals

Portal moves use production transition semantics. When the player’s layer changes, Layer Playtest switches the active layer to the destination.

## Visibility

Read-only summary from the track’s first visibility overlay (FULL_BOARD presentation labels: Regular / Partly Cloudy / Full Cloud / Night / Invisible / Memory / Lantern / Crystal Vision / Echo).

**Not in this step:** custom-mask runtime, moving overlays, full cloud DOM rendering.

## Cards / encounters

| Type | Playtest support |
|------|------------------|
| RED | Status note when standing on hex |
| BLUE / GREEN / BLACK | Deferred label |
| ? RANDOM / HIDDEN | Deferred label |
| Encounter/villain | Status note |

No combat UI, no progression writes.

## Reset / dirty / storage

Reset rebuilds temporary state from the current track snapshot.

Layer Playtest never calls `applyTrack` / dirty / draft save. It must not write `track_planner_drafts_v1`, `campaign_map_drafts_v1`, `hexgame-progression`, or `hexgame-best:*`.

## Remaining gaps

- Full cloud/atmosphere rendering during playtest
- Custom visibility masks
- Encounter dice UI
- Full multi-layer Simulator / solver (separate stage)
