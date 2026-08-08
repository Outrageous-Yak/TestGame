# Track Planner Step 5 — Visibility / Weather

Step 5 connects **Visibility / Weather authoring** in Track Planner to **runtime export parity** for supported presentation modes. Board and Features (Steps 3–4) are unchanged in scope.

## Ownership model

| Domain | Identity key | Shared across cloud variants? |
|--------|--------------|-------------------------------|
| Board geometry + row movement | `boardDraftKey(worldId, trackId)` | **Yes** |
| Features | `boardDraftKey(worldId, trackId)` | **Yes** |
| Visibility presentation | `visibilityDraftKey(worldId, scenarioId, trackId)` | **No** — per ScenarioEntry browse row |

**Model B:** ScenarioEntry remains the runtime visibility presentation owner. Clear / Partly Cloudy / Full Cloud / Fork variants for the same registered track share one board draft but may have **different visibility drafts**.

Editing visibility in **Citadel Path → Partly Cloudy → t1** does not change **Citadel Path → Clear → t1** visibility.

## Planner visibility model

```ts
interface VisibilityOverlay {
  id: string;
  state: VisibilityStateType;
  coverage: "FULL_BOARD" | "CUSTOM";
  positions: Pos[];           // logical coords when CUSTOM
  movement?: { direction; amount };  // authoring-only / future
  lanternRadius?: number;
  memoryRevealSec?: number;
}
```

`PlannerTrack.visibility: VisibilityOverlay[]` — runtime exports **first overlay only**. Additional overlays are preserved as authoring metadata; Audit warns.

### Visibility states (authoring)

| State | Designer label |
|-------|----------------|
| `REGULAR` | Regular |
| `PARTLY_CLOUDY` | Partly Cloudy |
| `FULL_CLOUD` | Full Cloud |
| `NIGHT` | Night |
| `INVISIBLE` | Invisible |
| `MEMORY` | Memory |
| `LANTERN` | Lantern |
| `CRYSTAL_VISION` | Crystal Vision |
| `ECHO` | Echo |

## Runtime visibility model

Runtime presentation uses **ScenarioEntry** fields (or equivalent export JSON fields):

| Field | Values |
|-------|--------|
| `cloudMode` | `"cloudy"` \| `"full_cloud"` |
| `visibilityMode` | `"night"` \| `"invisible"` \| `"memory"` \| `"lantern"` \| `"crystal_vision"` \| `"echo"` |
| `visibilityParams` | `{ lanternRadius?, memoryRevealSec? }` |

Implementation: `src/ui/cloud/boardVisibility.ts`, `computeCloudVisibility.ts`, `GameController.tsx`.

## Export mapping (`visibilityRuntimeMapping.ts`)

| Planner state | Runtime export |
|---------------|----------------|
| `REGULAR` | *(no cloudMode / visibilityMode)* |
| `PARTLY_CLOUDY` | `cloudMode: "cloudy"` |
| `FULL_CLOUD` | `cloudMode: "full_cloud"` |
| `NIGHT` | `visibilityMode: "night"` |
| `INVISIBLE` | `visibilityMode: "invisible"` |
| `MEMORY` | `visibilityMode: "memory"` + `visibilityParams.memoryRevealSec` |
| `LANTERN` | `visibilityMode: "lantern"` + `visibilityParams.lanternRadius` |
| `CRYSTAL_VISION` | `visibilityMode: "crystal_vision"` |
| `ECHO` | `visibilityMode: "echo"` |

Switching states clears contradictory fields (e.g. NIGHT clears `cloudMode`).

## Import parity

- Production `ScenarioEntry.cloudMode` / `visibilityMode` → default overlay at catalog seed
- Export JSON top-level `cloudMode` / `visibilityMode` / `visibilityParams` → import via `scenarioJsonToTrack`
- Full overlay array → `_plannerMeta.visibilityOverlays` (round-trip for CUSTOM masks, movement metadata)

## Authoring vs runtime parity

| Capability | Authoring | Runtime export | Runtime play |
|------------|-----------|----------------|--------------|
| FULL_BOARD all 9 states | YES | YES | YES (existing fork/cloud scenarios) |
| CUSTOM mask positions | YES | Metadata only | **NO** — Audit AMBER |
| Overlay movement field | YES | Metadata only | **NO** — Audit AMBER |
| Lantern radius | YES | YES | YES (`visibilityParams` → GameController) |
| Memory reveal sec | YES | YES | Metadata stored; timer behavior uses existing Memory rules |
| Multiple overlays | YES (metadata) | First only | First only — Audit AMBER |

## Custom masks

- Painted on board via **Paint mask** / **Erase mask** (logical `Pos`)
- Gaps allowed (`positions[]` is not required to be contiguous)
- Positions are **canonical logical** — static masks do not move with row movement preview
- **Not** the final independent moving-overlay architecture

## Storage

| Key | Purpose |
|-----|---------|
| `track_planner_drafts_v1` | Board drafts + `visibilityDrafts` map |
| `hexgame-progression` | Never written by Track Planner |
| `hexgame-best:*` | Never written by Track Planner |

## Audit (structural)

Visibility section reports GREEN / AMBER / RED for:

- Recognized state and parameters
- Custom mask runtime deferral (AMBER)
- Overlay movement deferral (AMBER)
- Multiple overlay export limits (AMBER)
- Invalid parameters (RED)

Not solvability or pathfinding.

## Moving overlay future architecture

Current runtime: hex-attached `Map<hexId, CloudVisualState>`.

Recommended future:

```
Logical board hexes
  ↓
Display slots (row movement)
  ↓
Independent visibility grid/mask (own layer, offset, direction, wrap)
```

Step 5 preserves `movement` on `VisibilityOverlay` as authoring metadata only.

## Deferred (Step 6+)

- Custom mask runtime application
- Independent moving fog renderer
- Layer Playtest visibility preview
- Full simulator visibility parity

## Step 6 readiness

`LayerPlaytestView` uses `freshPlaytestState` + `tryMove` on a single layer with no visibility rendering. Step 6 should add engine-parity playtest including visibility where supported.
