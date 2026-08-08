# 7676767 Step 1 — Repository Audit & Architecture Plan

**Audit date:** 2026-08-07  
**Branch:** `cursor/7676767-step1-audit-09fd`  
**Base commit:** `353a349` (Merge pull request #73)  
**Scope:** Audit and planning only — no production behaviour changes.

---

## Git state at audit start

| Item | Value |
|------|-------|
| Branch | `cursor/7676767-step1-audit-09fd` (from `origin/main`) |
| Commit | `353a349` |
| Unrelated dirty files | `dist/index.html`, `docs/forgotten-citadel/PRODUCTION_AUDIT.md`, `docs/forgotten-citadel/PUZZLE_FITNESS.md` (not part of this audit) |

## Test & build (verified this run)

| Command | Result |
|---------|--------|
| `npm test` | **331 tests passed**, 34 files, ~51s |
| `npm run build` | **Success** (`vite build`, 165 modules, no errors) |

---

## Executive status table

| Area | Status | Future work |
|------|--------|-------------|
| Board engine | **COMPLETE** | Reuse `src/engine/board.ts`, `layout.ts` |
| Logical/display model | **COMPLETE** (dual model) | Simulator must use `state.rows` + `hexIdAtSlot` |
| Row movement | **COMPLETE** | Reuse `endTurn` → `applyLayerRowMovement` |
| Portals | **COMPLETE** | Engine `moveAttempt.ts`; UI hints only |
| Cards | **PARTIAL** | Risk encounter implemented; others visual/audio only |
| Visibility | **PARTIAL** | Runtime: cloudy + full_cloud; planner has future types |
| Worlds | **INFRASTRUCTURE EXISTS** | TS registry, no manifest JSON; 2 worlds |
| Scenarios | **PARTIAL** | UI scenario ≠ engine scenario; no zone entity |
| Tracks | **INFRASTRUCTURE EXISTS** | Formal `Track` type; 32 registry entries |
| Progression | **MISSING** | Best score only; no unlocks |
| Puzzle Studio | **COMPLETE** (dev) | Analysis + playtest; `?dev=true` gate |
| Track Planner | **PARTIAL** | All 6 views exist; drafts localStorage only |
| Validation | **PARTIAL** | Solvability yes; stranding stubbed |
| Solver | **PARTIAL** | `computeOptimalSolution` authoritative for engine rules |
| Stranding analysis | **MISSING** | `trappedStates` always 0 |
| Track Planner (player) | **MISSING** | Creator tool exists; no player-facing map |

---

## 1. Repository architecture

### Entry & routing

- **Entry:** `src/main.tsx` → `src/ui/app.tsx`
- **Screens:** `"start" | "world" | "characters" | "scenario" | "game" | "studio" | "trackPlanner"` (`src/ui/types.ts`)
- **Deep links:** `?dev=true` (developer menu), `?studio=true` (boot to Puzzle Studio) — `src/features/puzzle-studio/studioRouting.ts`

### Directory map

| Path | Purpose |
|------|---------|
| `src/engine/` | Pure game rules: board, moves, row movement, transforms, validation, solvers |
| `src/ui/` | React app: screens, `GameController`, cloud/weather, audio, helpers |
| `src/worlds/` | World + track registries (TypeScript, not JSON manifests) |
| `src/features/puzzle-studio/` | Dev analysis tool (catalog, board viewer, export) |
| `src/studio/trackPlanner/` | Creator tool: 6 editor views, drafts, scenario bridge |
| `src/features/sprite-builder/` | Custom player sprites |
| `public/worlds/` | Board JSON + world assets |
| `public/scenarios/` | 3 standalone dev scenarios (not in world registry) |
| `scripts/` | CLI track analysis (`analyze-fc-track.mjs`, etc.) |
| `docs/` | Engineering reports, fitness audits |
| `.github/workflows/` | `pages-publish.yml` — GitHub Pages deploy |

### UI architecture

- React 18 + Vite; no router library — screen state in `app.tsx`
- `GameController.tsx` (~2000 lines) — primary gameplay orchestration
- Shared rendering helpers: `src/ui/game/helpers.ts`, `hexTileVisual.ts`

### Engine architecture

- Mutable `GameState` object; no Redux
- Public API: `src/engine/api.ts` (`newGame`, `tryMove`, `getMinMovesToGoal`, `getReachable`)
- Authoritative move: `attemptMoveToSlot` in `src/engine/moveAttempt.ts`

---

## 2. Board geometry (verified)

**Authoritative source:** `ROW_LENS = [7, 6, 7, 6, 7, 6, 7]` in `src/engine/board.ts`

| Property | Value |
|----------|-------|
| Rows | 7 (indices 0–6) |
| Cells per layer | 46 (`BOARD_SLOT_COUNT` in `src/engine/layerTransform/boardSlot.ts`) |
| Layers | 7 (indices 1–7); `assertScenario` enforces `layers === 7` |
| Total slots | 322 |
| Display grid | 14-column CSS honeycomb; 6-wide rows offset — `hexGridPlacement()` in `helpers.ts` |

**Duplication risk:** `ROW_LENS` is imported widely; local re-iteration in `GameController` loops. No conflicting alternate row-length arrays found.

---

## 3. Coordinate system

```ts
// src/engine/types.ts
export type Pos = { layer: number; row: number; col: number };
```

| Convention | Value |
|------------|-------|
| Layer | 1-based (1–7) |
| Row, col | 0-based |
| Hex ID | `L{layer}-R{row}-C{col}` via `posId()` / `idToCoord()` |
| Bounds | `inBounds(pos, layers)` in `board.ts` |
| Neighbors | `neighborSlots(row, col)` → `neighborIdsSameLayer(state, hexId)` |

Serialization: positions in scenario JSON as `{ layer, row, col }`. IDs are derived, not stored separately in JSON.

---

## 4. Logical vs display (ghost) position — CRITICAL

### Two parallel models

| Concept | Storage | Mutates on row shift? |
|---------|---------|----------------------|
| **Logical / authored identity** | `hex.id`, `hex.pos` (fixed at `buildInitialState`) | **No** |
| **Runtime board slot** | `state.rows: Map<layer, string[][]>` — hex ID arrays per row | **Yes** — `rotateRowIds` |

### What moves when a row shifts?

**Only the permutation of hex ID strings within `state.rows[layer][row]`.**  
`playerHexId` stays the same string; the player token follows the hex to its new visual slot via `hexIdAtSlot`.

### Features attachment

| Feature | Attached to |
|---------|-------------|
| Missing/blocked | Logical `Pos` at build → `hex.missing` / `hex.blocked` |
| Goal | Logical pos → `hex.kind === "GOAL"` |
| Portals | `transitionsByFromId` keyed by `posId(from)` — **logical hex ID** |
| Card triggers | `cardTriggers` matched via `idToCoord(landedId)` — **logical coords in hex ID** |
| Villain triggers | Same — logical layer/row/col in scenario JSON |

### Ghost grid

`GhostGrid` in `GameController` renders fixed skeleton from `ROW_LENS`; toggle `showGhost`. Independent of `state.rows`.

### Save/resume

`moveHistory` records slot coords for failed moves. No mid-game localStorage checkpoint exists.

---

## 5. Player position

- **Authoritative:** `state.playerHexId: string`
- **UI:** `idToCoord(playerHexId)` for layer; `currentLayer` is view selector
- **Init:** `posId(scenario.start)` in `buildInitialState`
- **Portal:** may change `playerHexId` to destination hex ID
- **Row movement:** does not change `playerHexId`; changes which slot displays that ID

---

## 6. Movement & turn lifecycle (actual order)

```
handleSlotPointerUp (GameController)
  → attemptMoveAtSlot(row, col)
    → [UI] villain hex? → block, no engine call
    → attemptMoveToSlot(state, { layer, row, col })
      → inBounds? → IGNORED (no turn)
      → hexIdAtSlot → IGNORED if empty
      → same layer? → failTurn UNREACHABLE
      → missing? → failTurn MISSING_HEX
      → neighbor? → failTurn UNREACHABLE
      → blocked? → failTurn BLOCKED
      → playerHexId = targetId
      → revealHex
      → portal? → teleport, activateLayerMovement, enterLayer, revealHex
      → won check (goal kind)
      → endTurn() — turn++, apply row movement on movementActiveLayers
      → record MOVE in moveHistory
    → [UI] card triggers, sounds, layer reveal, goal UI
```

**Failed moves:** `failTurn` → `endTurn({ applyRowMovement: false })` — turn increments, **no row shift**.

**Pass turn:** `passTurn(state)` → `endTurn()` with row movement (used in Layer Playtest).

---

## 7. Invalid move behaviour

| Result | Turn++ | Row shift | Move count (UI) | Notes |
|--------|--------|-----------|-----------------|-------|
| MOVED | Yes | Yes (active layers) | Yes | |
| UNREACHABLE | Yes | No | Yes | Adjacent check failed |
| MISSING | Yes | No | Yes | Adjacent missing hex |
| BLOCKED | Yes | No | Yes | Adjacent blocked |
| IGNORED | **No** | No | No | OOB or empty slot |

**WAIT actions:** Failed adjacent taps (unreachable/missing/blocked) consume a turn without row movement — usable as intentional waits for the future solver. IGNORED taps do not.

**Encounters:** UI blocks `attemptMoveToSlot` until dice roll 6 — not modelled in engine solvers.

---

## 8. Row movement

### Schema (`src/engine/rowMovement/types.ts`)

Per layer key `"1"`..`"7"`:
- `"NONE"` | legacy preset | `{ rows: { "0".."6": { direction, amount } } }`
- Directions: `LEFT | RIGHT | NONE`
- Layer 1 must be `"NONE"` (`validateRowMovement.ts`)
- Amount: `effectiveRowShiftAmount` = `amount % rowLength`

### Runtime

- Normalized to `scenario.runtimeMovement` via `attachRuntimeMovement`
- Only layers in `state.movementActiveLayers` rotate (`endTurn.ts`)
- Initialized to `[start.layer]`; expanded on portal entry (`activateLayerMovement`)

### Layer transform interaction

`transformRowMovementInstruction` remaps directions when scenario layer is transformed (`transformRowMovement.ts`).

---

## 9. Missing hexes

- **Schema:** `missing?: Pos[]` in scenario JSON
- **Runtime:** `hex.missing = true`; slot may still exist in `state.rows` with that hex ID
- **Move:** adjacent missing → failed turn, no shift
- **Rendering:** slot can render as empty; cloud mode treats missing as permanently cloud-covered
- **Distinction:** `MISSING ≠ INVISIBLE` — missing is geometry; cloudy/full_cloud is overlay (`computeCloudVisibility.ts` merges both for cloud rendering but missing has distinct handling)

---

## 10. Portals

- **Schema:** `{ type: "UP"|"DOWN", from: Pos, to: Pos }`
- **Index:** `transitionsByFromId` by `posId(from)`
- **Trigger:** on successful move landing on `from` hex (after player move, before `endTurn`)
- **Validation:** one portal per `from`; from/to not missing/blocked
- **Tied to:** logical hex ID (authored position), not board slot
- **Row movement after portal:** `endTurn` still runs row shift after portal resolution

---

## 11. Cards (factual classification)

Runtime keys: `cosmic | risk | terrain | shadow` (`CardKey` in `ui/types.ts`)  
Planner colors: `RED | BLUE | GREEN | BLACK` mapped via `CARD_COLOR_TO_RUNTIME` in `trackPlanner/types.ts`

| Card | Planner color | Status |
|------|---------------|--------|
| cosmic | RED | **PARTIAL** — evil laugh + villain voice + flip animation; no mechanic |
| risk | GREEN | **IMPLEMENTED** — dice encounter (roll 6), villain overlay |
| terrain | BLUE | **VISUAL ONLY** — flyout + flip on trigger |
| shadow | BLACK | **VISUAL ONLY** — same; rarely used in data |

Cards are **UI-only** — not in engine `Scenario` type. Engine solvers ignore cards/encounters.

Card triggers match **logical coords** from hex ID, not runtime slot.

---

## 12. Worlds, scenarios, tracks

### Worlds (2)

| ID | Name | UI scenarios |
|----|------|--------------|
| `forgotten_citadel` | Forgotten Citadel | 3 (clear, partly cloudy, full cloud) |
| `rainbow_realm` | Rainbow Realm | 3 (same cloud variants) |

Registered in `src/worlds/index.ts`. Assets theme-configured per `ScenarioTheme`.

### Scenario (dual meaning)

1. **UI `ScenarioEntry`** — menu variant with `cloudMode`, shared `tracks[]`
2. **Engine `Scenario`** — board JSON (one file = one playable board)

**Can UI Scenario = future geographical chapter?** **Yes, with extension.** Already groups tracks and cloud variants. Needs stable ordering, unlock metadata, intro text — not present today.

### Tracks

- Type: `{ id, name, scenarioJson }` (`ui/types.ts`)
- **32 registry entries** (10 FC + 22 RR); **31 unique JSON files** (`t5`/`t6` share `scenario5.json`)
- **No** unlock/completion gates — all selectable; `bestScore` per scenario+track in localStorage

### Hierarchy fit

```
GAME → WORLD → SCENARIO → TRACK
```

**MINOR EXTENSION REQUIRED** — structure exists in TS registries; needs progression metadata, formal manifests, player-facing map.

---

## 13. Puzzle Studio vs Track Planner

### Puzzle Studio (`?dev=true`)

| Capability | Status |
|------------|--------|
| Load all tracks | PRODUCTION READY |
| Board display + overlays | PRODUCTION READY |
| Optimal replay | PRODUCTION READY |
| validateTrack / fitness | PRODUCTION READY |
| Playtest tryMove | REUSABLE |
| Editing | ANALYSIS ONLY (read-only boards) |

### Track Planner (Start screen button — no dev gate)

| View | Status |
|------|--------|
| Board | REUSABLE WITH CHANGES |
| Features | REUSABLE WITH CHANGES |
| Visibility | REUSABLE — planner-only types not exported to runtime |
| Audit | REUSABLE |
| Layer Playtest | REUSABLE — uses `attemptMoveToSlot` |
| Simulator | REUSABLE — wraps engine validation |

Drafts: `track_planner_drafts_v1` localStorage.

---

## 14. Validation & solver

### Authoritative solver

`computeOptimalSolution` (`trackAnalysis.ts`) — BFS via `attemptMoveToSlot`, includes row shifts, portals, 400k node cap.

### Gaps

- No encounter/card/dice in solver
- `computeReachability` — static, no shifts (legacy, unused by game UI)
- `detectSoftLocks` — portal reachability only; `trappedStates` always 0
- `stateSignature` duplicated in 4 files

### 4^7 transforms

Confirmed: 4 canonical IDs × 7 layers = 16,384 combinations; structural test in `layerTransform.test.ts`.

---

## 15. Visibility

| Mode | Config | Implementation |
|------|--------|----------------|
| Regular | `cloudMode` absent | No fog |
| Partly Cloudy | `"cloudy"` | `computeCloudVisibility` — player + neighbors visible |
| Full Cloud | `"full_cloud"` | Only current hex visible (+ goal/portal hints) |

Cloud state is **overlay on hex IDs** (per-hex map from `computeCloudVisibility`), not independent row-scrolling fog. Missing hexes forced to cloud in cloudy modes.

Future planner types (NIGHT, INVISIBLE, etc.): **REQUIRES REFACTOR** for independent moving overlays.

---

## 16. Forgotten Citadel hex tiles

- Theme: `hexTile` / `hexTileMovable` in `forgotten_citadel/tracks.ts`
- Logic: `selectHexTileArtUrl()` in `hexTileVisual.ts` — white tile only during reach-pulse flash on reachable hexes
- Tests: `hexTileVisual.test.ts`

---

## 17. Save / resume / replay

| Mechanism | Key | Scope |
|-----------|-----|-------|
| Best score | `hexgame-best:{scenarioId}:{trackId}` | Per track |
| Layer transforms | `hexgame-track-variation:{trackId}` | Transform seed/selection |
| Sprites | `hexgame-pixelSprites:v1` | Custom characters |
| SFX toggle | `testgame.soundEffects.enabled` | Audio |
| Planner drafts | `track_planner_drafts_v1` | Creator drafts |

**No mid-game resume.** Replay after win uses `replayAfterWin` intent → new transform selection (`trackRunLifecycle.ts`).

---

## 18. Audio

- SFX: `soundEffects.ts` (move, portal, goal, failed move)
- BGM: `backgroundMusic.ts` per theme
- Storm: `stormAudio.ts` + `StormWeather.tsx` (full_cloud)
- Villain voice: `villainVoice.ts` — only `bad1` mapped
- 4 separate `AudioContext` instances — no central bus

---

## 19. Authoritative engine boundaries

| System | Module | Function(s) | Simulator-ready? |
|--------|--------|-------------|------------------|
| Geometry | `engine/board.ts` | `ROW_LENS`, `posId`, `inBounds` | Yes |
| Slot layout | `engine/layout.ts` | `hexIdAtSlot`, `findSlot`, `neighborSlots` | Yes |
| Neighbors | `engine/neighbors.ts` | `neighborIdsSameLayer` | Yes |
| Move legality | `engine/moveAttempt.ts` | `attemptMoveToSlot` | Yes |
| Turn + rows | `engine/endTurn.ts` | `endTurn`, `passTurn` | Yes |
| Row shift | `engine/rowMovement/` | `applyLayerRowMovement` | Yes |
| Portals | `engine/moveAttempt.ts` | inline in move success path | Yes |
| Goal | `engine/moveAttempt.ts` | `now.kind === "GOAL"` | Yes |
| Transforms | `engine/layerTransform/` | `buildRuntimeScenario` | Yes |
| Solvability | `engine/trackAnalysis.ts` | `computeOptimalSolution` | Yes |
| Cards/encounters | `ui/game/GameController.tsx` | — | **No** |
| Visibility | `ui/cloud/` | — | **No** |

---

## 20. UI-coupled rules (extract before Step 7)

| Rule | Location | Recommendation |
|------|----------|----------------|
| Reachable hex highlight | `GameController` useMemo | Extract shared helper |
| Encounter dice gate | `GameController` | Optional engine hook or simulator flag |
| Card triggers | `GameController` + `helpers.ts` | Engine extension for Step 7 parity |
| Full-layer reveal on enter | `revealWholeLayer` in UI | Document as non-engine behaviour |
| Reveal ring item | `GameController` | UI-only power-up |
| Cloud visibility | `computeCloudVisibility` | Keep UI until visibility engine exists |

---

## 21. Step 2 proposal (do not implement)

### Files likely created
- `src/progression/types.ts` — `GameProgress`, `WorldProgress`, `TrackCompletion`
- `src/progression/storage.ts` — localStorage with version migration
- `public/worlds/manifest.json` or extend `src/worlds/*/world.ts`

### Files likely modified
- `src/worlds/*/tracks.ts` — `order`, `unlockAfter`, `introMechanicId`
- `src/ui/screens/MenuScreen.tsx` — lock UI
- `src/ui/types.ts` — progression fields on `Track`

### Schema changes
- Add optional `order`, `unlockRequires`, `mechanicIntro` to track registry
- Progress blob: `{ version, completedTracks: Record<trackId, { bestMoves, completedAt }> }`

### Risks
- Dual scenario meaning (cloud variants share tracks)
- No world map UI yet

### Size
- ~8–12 files, ~600–900 LOC, 20–30 tests

---

## 22. Steps 3–8 dependencies

| Step | Reuse | Missing | Risk |
|------|-------|---------|------|
| 3 Track Planner shell | `TrackPlannerScreen`, `LayerBoardGrid`, `BoardView` | Player-facing polish, built-in vs draft merge | Low — shell exists |
| 4 Features + Audit | `FeaturesView`, `auditTrack`, `scenarioBridge` | BLACK card runtime, RANDOM resolution | Medium |
| 5 Visibility | `VisibilityView`, `computeCloudVisibility` | Export visibility to scenario JSON; moving overlays | High |
| 6 Layer Playtest | `LayerPlaytestView`, `attemptMoveToSlot` | Encounter/card parity | Medium |
| 7 Simulator | `computeOptimalSolution`, `runSimulator` | Extract UI rules; failed-turn search | Medium |
| 8 Stranding + progression | `puzzleFitness` stubs, Step 2 storage | Real `trappedStates`; import/export pipeline | High |

---

## 23. Recommended PR sequence

1. Step 2: Progression types + storage (no UI)
2. Step 2b: Menu unlock UI + completion recording
3. Step 3: Track Planner entry polish (already on Start)
4. Step 4–5: Feature/visibility export parity
5. Step 6: Layer playtest engine parity
6. Step 7: Unified simulator module
7. Step 8: Stranding + player progression map

---

## Critical questions — answers

1. **Authoritative hex:** `hex.id` (logical) + `state.rows` slot mapping (display)
2. **Player position:** `state.playerHexId`
3. **Logical vs display:** ID/pos fixed; `state.rows` permutes on row shift
4. **Row move:** hex ID permutation in `state.rows`; player ID unchanged
5. **Features:** logical hex (authored pos / hex ID)
6. **Portals:** logical hex ID (`posId(from)`)
7. **Invalid move consumes turn?** Yes (UNREACHABLE/MISSING/BLOCKED); not IGNORED
8. **Invalid move triggers rows?** No
9. **Turn order:** move → portal → endTurn (rows) → UI features
10. **Row movement:** `endTurn` → `applyLayerRowMovement`
11. **Neighbors:** `neighborIdsSameLayer` → `layout.neighborSlots` on runtime rows
12. **Legality:** `attemptMoveToSlot`
13. **Portals:** `moveAttempt.ts` on successful landing
14. **Goal:** `hex.kind === "GOAL"` after move
15. **Cards:** risk=encounter; cosmic=audio; terrain/shadow=visual
16. **Scenario today:** UI menu variant OR engine board JSON
17. **Track today:** `{ id, name, scenarioJson }` registry entry
18. **World→Scenario→Track:** structure exists; progression metadata missing
19. **Puzzle Studio reuse:** validation, solver, board viewer, replay
20. **Step 7 reuse:** `computeOptimalSolution` / `attemptMoveToSlot` BFS
21. **Moving rows in solver?** Yes
22. **Failed-turn/wait?** Yes via `failTurn` paths; not in default optimal solver counts
23. **Soft locks?** No real detection
24. **Transforms:** identity, reflect-horizontal, symmetry-b, symmetry-c
25. **Transforms + rows:** movement directions remapped per layer transform
26. **Transforms + portals/features:** scenario coords transformed at build time
27. **Partly cloudy:** `cloudMode: "cloudy"`
28. **Full cloud:** `cloudMode: "full_cloud"`
29. **Visibility overlay independence:** Currently hex-attached; not independent rows
30. **Pre-simulator refactor:** Extract card/encounter/visibility from `GameController` or document exclusions

---

*End of Step 1 audit document.*
