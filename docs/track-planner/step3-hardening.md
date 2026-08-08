# Track Planner Step 3 — Hardening

Step 3 hardens the **existing** six-view Track Planner (`src/studio/trackPlanner/`) as a trustworthy authoring environment. It does not rebuild the planner or change production gameplay rules.

## Content domains (three separate)

| Domain | Storage | Purpose |
|--------|---------|---------|
| Production registry | `src/worlds/` | Shipped Worlds / ScenarioEntries / Tracks |
| Board drafts | `track_planner_drafts_v1` | Local authoring state |
| Player progression | `hexgame-progression` | Completion / unlocks (Step 2) |
| Best scores | `hexgame-best:{scenarioId}:{trackId}` | Per-variant scores |

Track Planner **never** writes progression or best-score keys.

## Catalog merge

Production content is seeded via `seedBundleFromWorlds()`. Local drafts merge through `buildPlannerCatalog()`:

- **Browse entries** remain one row per `(worldId, scenarioId, trackId)` — cloud/fork variants all appear.
- **Board drafts** overlay by `boardDraftKey(worldId, trackId)` — one canonical board per registered track per world.
- Labels: `Production`, `Modified Draft`, `New Draft`.

Editing a production track clones into a local draft; production JSON and registry objects are not mutated in place.

## Cloud variant board ownership

**One canonical board draft** per `worldId|trackId`. Clear / Partly Cloudy / Full Cloud ScenarioEntries share the same underlying Track registry IDs, so they share one board draft while remaining separate browse rows.

This aligns with Step 2 Model A progression completion.

## Shared JSON (t5 / t6)

`t5` and `t6` may reference the same `scenario5.json` but have distinct registry IDs. Draft storage keys by `rainbow_realm|t5` vs `rainbow_realm|t6` — edits to one do not affect the other.

## Board View (Step 3 focus)

- All **7 layers** rendered vertically (Layer 7 → 1) in one scrollable page.
- **Layer jump** buttons (7–1) scroll/focus each board.
- Tools: Select / Remove hex / Restore hex.
- Missing slots show editor ghost outline and remain clickable for restore.
- Removing a hex does **not** delete Feature metadata; validation warns instead.
- Per-row movement controls (NONE / LEFT / RIGHT + amount); authored amounts preserved (no modulo rewrite).
- **Movement preview** uses engine `applyLayerRowMovement` on a temporary runtime clone; preview steps do not mark dirty state; authoring edits reset preview.
- **Board validation** status: ✓ Board valid / ✕ Board errors (not solvability).

## Undo / Redo / Dirty

Reuses existing `UndoStack` in `TrackEditor`. Preview state is excluded from undo history. `Save draft` writes to `track_planner_drafts_v1`. `Reset to production` / `Delete draft` available for production-backed tracks.

## Scenario bridge

`scenarioBridge.ts` preserves start, goal, missing, movement, portals, cards, villains. Progression metadata remains on `PlannerTrack.progression` through board edits. Runtime export strips `_plannerMeta` (planner-only).

## Mobile / iPhone

Track Planner CSS uses `100dvh`, touch-friendly 44px controls, sticky board toolbar with safe-area padding, vertical scroll (no nested gameplay `touch-action: none` changes).

## Step 4 integration points

- **Feature identity:** logical `Pos` on authored board; FeaturesView already places by layer/row/col.
- **Audit:** extend `auditTrack.ts` for feature-on-missing and hidden portal metadata.
- **Files likely touched:** `FeaturesView.tsx`, `audit/auditTrack.ts`, `features/*`, draft encounter pool fields on `PlannerWorld` / `PlannerScenario`.

## Unchanged in Step 3

Features, Visibility, Audit, Layer Playtest, Simulator views (behavior preserved). Engine mechanics, solver, cloud runtime, cards, encounters, progression semantics.
