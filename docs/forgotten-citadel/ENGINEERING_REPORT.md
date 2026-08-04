# Forgotten Citadel — Engineering Report

## Reference pack analysis

The attached starter pack contains three **source-derived** tracks (metadata only changed):

| Reference | Source Prism Path file | Mechanics |
|-----------|------------------------|-----------|
| Vertical Loop | `scenario7.json` (t7) | Multi-layer UP chain + one DOWN |
| Shifting Vault | `scenario17.json` (bm18) | L2–4 shift, missing hexes, rim UP chain |
| Citadel Core | `scenario21.json` (bm22) | L2–5 shift, cards, villains, full east UP chain |

These were used to confirm schema compatibility, not copied into production.

## Scenario schema (engine v0.1)

| Field | Type | Notes |
|-------|------|-------|
| `id`, `name` | string | Required |
| `layers` | number | Must be `7` |
| `objective`, `description` | string | Optional UI text |
| `notes` | string[] | Optional player hints |
| `start`, `goal` | `{ layer, row, col }` | Required; must be in bounds, not missing/blocked |
| `missing` | Pos[] | Holes in the grid |
| `blocked` | Pos[] | Waste-turn hexes (engine-supported) |
| `movement` | `Record<layer, pattern>` | Layer 1 must be `NONE` |
| `transitions` | `{ type: UP\|DOWN, from, to }[]` | Unique `from` per transition |
| `villains` | `{ requiredRoll, triggers[] }` | Triggers: `layer`, `row`, optional `col` |
| `cardTriggers` | `{ card, layer, row, col }[]` | UI encounter cards |
| `revealOnEnterGuaranteedUp` | boolean | Default `true`; FC tracks use `false` |

### Movement patterns

- `NONE` — static layer
- `SEVEN_LEFT_SIX_RIGHT` — 7-wide rows shift left, 6-wide rows shift right each turn
- `TOP3_RIGHT_BOTTOM4_LEFT` — alternate pattern (unused in FC v1)

### Board geometry

Row lengths: `[7, 6, 7, 6, 7, 6, 7]` (rows 0–6).  
**Critical:** row 1, 3, 5 have **6** columns (0–5); row 0, 2, 4, 6 have **7** columns (0–6).

### Portal rules

- Stepping on `from` teleports to `to` on another layer immediately
- `DOWN` portals supported by engine (`rules.ts`)
- One transition per source hex

## Comparison to Prism Path

- Same JSON schema and validation (`assertScenario`)
- FC tracks use original geometry (fingerprints differ from all 21 Prism Path boards)
- FC emphasizes DOWN portals, missing-island routing, and portal sequencing
- Prism Path has more Brain Melter scale puzzles; FC v1 caps at 10 progressive tracks

## Track validator (`src/engine/trackValidator.ts`)

Automated quality gate:

- Schema via `assertScenario`
- Coordinate bounds and duplicate detection
- Geometry fingerprint vs Prism Path (no accidental copies)
- BFS solvability via `computeMinMovesToGoal` (shift-aware)
- Layer reachability from start
- Optional intended-solution path simulation + shortcut detection

Run: `npm run validate:tracks` or `npm test -- src/engine/trackValidator.test.ts`

## Forgotten Citadel v1 delivery

10 original tracks in `public/worlds/forgotten_citadel/scenarios/`, registered under world `forgotten_citadel` / scenario `citadel_path`.
