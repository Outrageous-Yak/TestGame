# Progression Foundation (Step 2)

This document describes the player progression layer added in Step 2. It extends the existing content registry without replacing it.

## Hierarchy (terminology)

```
PRODUCTION CONTENT (static)          PLAYER STATE (mutable)
────────────────────────────         ────────────────────────
World                                  ProgressionSaveV1
 └── ScenarioEntry (UI menu)              ├── completedTracks
      └── Track (registry entry)          └── seenMechanicIntroductions
           └── scenarioJson → Engine Scenario (board JSON)
```

### Critical distinction

| Term | Meaning |
|------|---------|
| **ScenarioEntry** | UI menu variant: theme, `cloudMode`, shared `tracks[]` |
| **Scenario** (engine) | Board definition loaded from JSON (`src/engine/types.ts`) |

Player-facing labels remain **World → Scenario → Track**. Code comments use **ScenarioEntry** where the UI type is meant.

## Progression identity

### Track completion key (Model A)

```
progressionTrackKey(worldId, trackId) → "forgotten_citadel|fc_t01"
```

**Cloud variants share completion.** Completing `fc_t01` in Citadel Path also marks `fc_t01` complete in Partly Cloudy and Full Cloud variants within the same world.

**Rationale:** Variants share the same underlying `Track` registry and puzzle boards; cloud mode is a visibility overlay, not a separate challenge ladder.

### Best score key (unchanged)

```
hexgame-best:{scenarioEntryId}:{trackId}
```

Best scores remain **per ScenarioEntry variant** because that was the pre-Step-2 behaviour.

### Shared JSON ≠ shared Track identity

`t5` and `t6` both reference `scenario5.json` but have distinct registry IDs (`t5`, `t6`). Progression keys use **registered track id**, not JSON path.

## Storage

| Key | Purpose |
|-----|---------|
| `hexgame-progression` | Versioned progression save (`ProgressionSaveV1`) |
| `hexgame-best:{scenarioId}:{trackId}` | Best move count (unchanged) |

```ts
type ProgressionSaveV1 = {
  version: 1;
  completedTracks: Record<string, { completionCount: number; firstCompletedAt: string }>;
  seenMechanicIntroductions: string[];
};
```

Corrupt saves reset to defaults without touching other localStorage keys.

## Unlock derivation

Statuses are **derived**, not stored:

```
LOCKED | AVAILABLE | COMPLETED
```

### Default compatibility (`OPEN` mode)

Worlds/scenarios without `progression.mode` default to **OPEN**:

- All tracks remain selectable (current production behaviour for Forgotten Citadel and Rainbow Realm)
- Completion checkmarks still appear after wins
- No new locks on existing content

### Sequential mode (opt-in)

When `progression.mode: "SEQUENTIAL"` is set on a world or scenario:

- First track in array order is available
- Each subsequent required track unlocks when the previous required track is completed
- Explicit `requires` arrays can override or add prerequisites

## Completion rules

| Level | Rule |
|-------|------|
| **Track** | Recorded on engine win (`won === true`) in `GameController.recordWin` |
| **ScenarioEntry** | All non-optional tracks in that entry's `tracks[]` are completed (Model A: same track IDs across cloud variants) |
| **World** | All scenarios complete (or all tracks complete when scenarios share track sets) |

## Flow

```
attemptMoveToSlot → won
  → GameController.recordWin
      → saveBestScore (scenarioEntryId + trackId)
      → recordTrackCompletion (worldId + trackId)
      → markMechanicsIntroducedByTrack (if metadata)
      → saveProgression
  → Goal popup (Replay / Next Track / Menu)
```

`getNextAvailableTrack` skips **LOCKED** tracks when resolving "Play next level".

## Developer bypass

`?dev=true` sets `bypassProgressionLocks` on `MenuScreen` so Puzzle Studio / debug flows are unaffected. Track Planner was already ungated on the Start screen.

## Mechanic introductions

`src/progression/mechanicIntroductions.ts` holds metadata only. Tracks may declare `progression.introduces: MechanicId[]`. Seen state is stored; popup UI is deferred.

## Story presentation hooks

Optional `progression.intro` / `progression.completion` on worlds and scenarios, and `progression.story` on tracks. No story text authored in Step 2.

## Module layout

```
src/progression/
  types.ts
  keys.ts
  storage.ts
  progression.ts      # pure unlock/completion logic
  validate.ts         # content metadata validation
  mechanicIntroductions.ts
  index.ts
```

## Future Steps

- **Step 3:** Harden existing Track Planner (`src/studio/trackPlanner/`) — do not rebuild
- **Step 8:** Player-facing world map consumes `getContinueTarget` and completion state
