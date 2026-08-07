# 7676767 Step 1 — Repository Architecture Audit (Summary)

This document summarizes findings used by Step 2. The original Step 1 audit was performed on branch `cursor/7676767-step1-audit-09fd`; this file captures the authoritative facts referenced during progression implementation.

## Content hierarchy

```text
World (WorldEntry)
  └── ScenarioEntry (UI scenario — theme, cloud mode, track list)
        └── Track (registry id, name, scenarioJson)
              └── Engine Scenario (board JSON loaded at runtime)
```

**Terminology:** UI `ScenarioEntry` is not the engine `Scenario` type (board definition).

## Production registry

| Item | Value |
|------|-------|
| Worlds | `forgotten_citadel`, `rainbow_realm` |
| Registry location | `src/worlds/` |
| Track entries | 32 registered (Forgotten Citadel 13 + Rainbow Realm 22) |
| Unique board JSON files | 31 |

## Track identity notes

- Registry `Track.id` is authoritative for progression — **not** `scenarioJson`.
- Rainbow Realm `t5` and `t6` both reference `scenario5.json` but are separate tracks.
- Cloud variants (`prism_path` / `cloudy` / `full_cloud`, etc.) share the same `Track[]` arrays.

## Best scores

- Key format: `hexgame-best:{scenarioId}:{trackId}` (variant-specific).
- Separate from progression completion identity.

## Track Planner

- Existing six views: Board, Features, Visibility, Audit, Layer Playtest, Simulator.
- Draft storage key: `track_planner_drafts_v1` (separate domain from player progression).

## Engine (do not modify for progression)

Authoritative systems: `board.ts`, `layout.ts`, `moveAttempt.ts`, `endTurn.ts`, `rowMovement/`, `layerTransform/`.

Goal detection: `src/engine/moveAttempt.ts` → UI win handling in `GameController`.

## Baseline tests (at Step 2 start)

328+ tests passing across engine, UI, puzzle studio, and track planner.
