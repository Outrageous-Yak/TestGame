# Track Planner Step 4 — Features + Audit

Step 4 hardens **Features** and **Audit** views in the existing six-view Track Planner. Board authoring (Step 3) remains unchanged in scope.

## Feature model

Features attach to **canonical logical hex identity** (`layer`, `row`, `col` / `L{n}-R{r}-C{c}`), not display slots. Row movement preview shifts display positions but does not mutate authored feature coordinates.

| Kind | Storage | Notes |
|------|---------|-------|
| Start | `{ kind: "start", position }` | One per track; placement replaces prior |
| Goal | `{ kind: "goal", position }` | One per track; placement replaces prior |
| Portal | `{ kind: "portal", source, destination, direction, hidden? }` | Engine `Transition` on export |
| Card | `{ kind: "card", cardType, position, … }` | See card types below |
| Encounter / Villain | standalone features | Legacy/direct placement; pools from world/scenario |

### Card types (`CardColor`)

| Authoring label | `cardType` | Runtime |
|-----------------|------------|---------|
| RED | `RED` | Encounter trigger (`cosmic`) — **supported** |
| BLUE | `BLUE` | Metadata only — **deferred** |
| GREEN | `GREEN` | Metadata only — **deferred** |
| BLACK | `BLACK` | Metadata only — **deferred** |
| ? Random | `RANDOM` | Authoring supported — **runtime resolution deferred** |
| ? Predetermined | `HIDDEN` + `resolvedType` | Exports resolved color — **partial runtime** |

**Hidden flag** (`hidden: boolean`) on cards/portals means *visually concealed but mechanically present* in design intent. Portal/card concealment runtime is **deferred**; Audit reports AMBER when metadata is valid but runtime support pending.

## Feature compatibility

Central rules in `features/featureCompatibility.ts` + `features/featureOccupancyCore.ts`:

- One non-portal occupant per hex (`start`, `goal`, `card`, `encounter`, `villain`)
- Start/Goal placement **replaces** existing instance
- Portals use source hex; destination is separate coordinate
- New placement blocked on **missing** hexes

## Encounter / villain pools

- `PlannerWorld.villainPool` / `encounterPool` — world defaults
- `PlannerScenario.allowedVillains` / `allowedEncounters` — scenario overrides
- FeaturesView reads scenario pool first, then world pool
- RED card inspector: Random from pool vs Specific villain (from pool)

No new combat database in Step 4.

## Features View

Tool palette (wrapped/scrolling on mobile):

`Select · Remove · Start · Goal · Portal UP · Portal DOWN · Red · Blue · Green · Black · ? Random · ? Fixed`

- Tap hex to place (logical coordinates)
- Portal destination: inspector coords, layer/row/col inputs, or **Pick destination on board**
- Track-wide **feature inventory** list — click to jump layer + select
- Inspector shows type-specific fields only

## Audit View

**Structural audit only** — not solvability or pathfinding.

| Status | Meaning |
|--------|---------|
| **GREEN** | Passed structural check |
| **AMBER** | Warning — allowed but suspicious or runtime deferred |
| **RED** | Must fix before export/play |

Track summary: `STRUCTURAL AUDIT: GREEN|AMBER|RED` with error/warning/passed counts.

Checks include: start/goal presence & uniqueness, start=goal, bounds, feature-on-missing, portal destination validity/direction/self-target, duplicate hex occupancy, pool validation, RANDOM/HIDDEN card rules, hidden metadata runtime notes.

Click **Edit feature** to jump to Features view.

## Draft persistence

All feature edits use existing Step 3 draft pipeline:

- `track_planner_drafts_v1` only
- Never `hexgame-progression` or `hexgame-best:*`
- Undo/Redo via `UndoStack` in TrackEditor
- Audit is read-only (does not mark dirty)

## Scenario bridge round-trip

Export includes `_plannerMeta.authoredFeatures` preserving full planner feature array (RANDOM, HIDDEN, hidden flags). Import prefers `authoredFeatures` when present.

Production JSON without `_plannerMeta` still loads via legacy parse (start/goal/transitions/cardTriggers/villains).

## Authoring vs runtime support

See `features/runtimeSupport.ts` for explicit `authoring` / `runtime` flags per card type and hidden metadata.

## Deferred (Step 5+)

- Full visibility overlay authoring (Night, Invisible, custom masks, row-specific weather)
- ? RANDOM runtime resolution
- Hidden portal/card runtime concealment
- Blue/Green/Black gameplay effects
- Full solver / stranding / pathfinding audit
- Automatic scenario generator

## Step 5 readiness pointers

- Visibility states already in types: `REGULAR`, `PARTLY_CLOUDY`, `FULL_CLOUD`, `NIGHT`, `INVISIBLE`, `MEMORY`, `LANTERN`, `CRYSTAL_VISION`, `ECHO`
- Stored on `PlannerTrack.visibility[]` overlays (ScenarioEntry-specific in production via cloud modes)
- Coverage: `FULL_BOARD` or `CUSTOM` with `positions[]`
- Custom cell positions use logical `Pos` — independent of feature hexes
- Overlay `movement` field exists but weather row movement not implemented
- Cloud rendering: `src/ui/cloud/` + scenario `cloudMode` on ScenarioEntry
- Step 5 files likely: `VisibilityView.tsx`, `trackPlanner/types.ts`, `src/ui/cloud/*`, runtime visibility in `GameController`
