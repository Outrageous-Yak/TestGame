# Progression Foundation (Step 2)

Step 2 adds player progression infrastructure without replacing the existing content registry or puzzle engine.

## Architecture diagram

```text
PRODUCTION CONTENT                         PLAYER PROGRESSION
────────────────────                       ────────────────────

World                                      ProgressionSaveV1
│                                          │
├── ScenarioEntry                          ├── completedTracks[worldId::trackId]
│      │                                   │
│      ├── Track                           └── seenMechanicIntroductions[]
│      │     └── scenarioJson → Engine Scenario
│      └── Track
│
└── ScenarioEntry
```

## Terminology

| Term | Meaning |
|------|---------|
| **World** | Top-level menu entry (`WorldEntry`) |
| **ScenarioEntry** | Selectable scenario variant (clear / partly cloudy / full cloud) |
| **Track** | Registered playable level within a scenario |
| **Engine Scenario** | Board JSON loaded at runtime — not the same as ScenarioEntry |

Player-facing labels remain World → Scenario → Track.

## Progression identity

Canonical track key:

```text
progressionTrackKey(worldId, trackId) → "{worldId}::{trackId}"
```

- Uses registry `Track.id`, not `scenarioJson`.
- **Does not** include `scenarioEntryId` (Model A — see below).
- Transform seed / layer combination is **not** part of identity.

### Shared JSON (t5 / t6)

`rainbow_realm::t5` and `rainbow_realm::t6` are separate progression tracks even though both load `scenario5.json`.

### Cloud variant completion — Model A

**YES** — completing Track X in Clear also marks Track X completed in Partly Cloudy and Full Cloud within the same world.

Rationale:

- Track arrays are shared across visibility variants.
- Variants are presentation/visibility modes, not separate curriculum steps.
- Best scores remain variant-specific via `hexgame-best:{scenarioId}:{trackId}`.

## Content vs player state

Static definitions in `src/worlds/` are never mutated for completion.

Player state lives in `hexgame-progression-v1`:

```ts
type ProgressionSaveV1 = {
  version: 1;
  completedTracks: Record<string, TrackCompletionRecord>;
  seenMechanicIntroductions: string[];
};
```

## Unlock derivation

Statuses are derived, not stored:

```text
COMPLETED → track in completedTracks
AVAILABLE → unlocked and not completed
LOCKED    → not unlocked
```

Completion is the fundamental stored fact. Unlocks derive from:

1. `progressionMode` (OPEN vs SEQUENTIAL)
2. Array order (default track/scenario/world order)
3. Optional explicit `requires` metadata

## Progression modes

| Mode | Behavior |
|------|----------|
| **OPEN** (default) | All tracks available; completion still recorded |
| **SEQUENTIAL** | Track N+1 requires Track N complete; first track always available |

Existing Forgotten Citadel and Rainbow Realm content has **no** progression metadata → **OPEN**. No production content was locked in Step 2.

Future tutorial worlds can opt in with `progression: { progressionMode: "SEQUENTIAL" }` on World, ScenarioEntry, or Track.

## Module layout

```text
src/progression/
  types.ts                  — shared types
  progressionTrackKey.ts    — canonical identity helper
  migration.ts              — versioned save normalization
  storage.ts                — load/save/reset (hexgame-progression-v1)
  progression.ts            — pure unlock/completion/next-track logic
  validateProgression.ts    — metadata validation against registry
  mechanicRegistry.ts       — mechanic introduction metadata (no UI yet)
  mechanicIntroductions.ts  — seen-mechanic helpers
  index.ts
```

## Integration points

| Location | Role |
|----------|------|
| `GameController.recordWin` | Records track completion once per victory |
| `GameController.nextTrack` | Uses `resolveNextAvailableTrack` |
| `MenuScreen` | Shows ✓ / Locked; blocks locked track selection |
| `app.tsx` | Guards Start for locked tracks; passes `worldId` to game |

Developer tools (`?dev=true`, Puzzle Studio, Track Planner) bypass player-facing locks via `isDevMode()`.

## Goal → completion flow

```text
attemptMoveToSlot
  → engine reports win
  → GameController recordWin
  → saveBestScore (existing, variant-specific)
  → recordTrackCompletion (new, world+track)
  → saveProgression
  → Goal popup (existing)
```

`recordTrackCompletion` is idempotent per run; replay resets the per-run guard but preserves completion.

## Reset behavior

Start-screen **Reset** clears navigation state only — it does **not** clear progression or best scores.

Developers can reset progression via `resetProgression()` in `src/progression/storage.ts`.

## Mechanic & story metadata

Tracks may declare `progression.introduces: MechanicId[]`. Storage supports `seenMechanicIntroductions` — no popup UI in Step 2.

Optional `story` presentation hooks exist on World / ScenarioEntry / Track progression metadata. No narrative text was authored.

## Validation

`validateProgressionMetadata(worlds)` checks requirement references, self-dependencies, and duplicate orders. Legacy content without metadata passes.

## Future tutorial example (test fixture only)

```text
World: starter_world (SEQUENTIAL)
  Scenario: movement_basics — t1 → t2 → t3
  Scenario: broken_paths — requires movement_basics
```

See `src/progression/progression.test.ts` — not shipped as production content.

## Step 3 readiness

The pure progression engine can be queried by Track Planner for production track status. Track Planner draft content remains separate until explicitly promoted to `src/worlds/`.

Preserve unchanged in Step 3:

- `BoardView`, `FeaturesView`, `VisibilityView`, `AuditView`, `LayerPlaytestView`, `SimulatorView`
- `TrackPlannerScreen.tsx` shell and existing draft storage

Step 3 should extend authoring/production integration — not rebuild the planner.
