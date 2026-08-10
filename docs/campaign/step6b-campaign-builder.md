# Step 6B — Campaign Map Builder

Creator tool for editing player World Map presentation metadata introduced in Step 6A.

## Campaign model

Same `CampaignMap` / `CampaignNode` types as the player map (`src/campaign/types.ts`).

- Nodes reference existing `worldId` + `scenarioId` + `trackId` (never Scenario JSON filenames).
- Normalized `x` / `y` coordinates.
- `connections[]` for A→B (and A→C branching presentation).
- Optional `entryNodeId`, `type` (future: story / gate / mechanic_intro / world_exit). Only `track` is fully behaved in 6B.

## Draft storage

- Key: `campaign_map_drafts_v1`
- Separate from `track_planner_drafts_v1`, `hexgame-progression`, `hexgame-best:*`
- Production maps live in code (`CAMPAIGN_MAPS`); opening clones into a local draft — production modules are never mutated.

## Progression separation

Builder edits placement/routes only. LOCKED / AVAILABLE / COMPLETED still come from existing progression helpers. Builder never writes `hexgame-progression`.

Unlock semantics for branching connections remain progression-owned (presentation-ready branching only).

## Player renderer reuse

`CampaignMapView` is shared by:

- Player `WorldMapScreen` (`mode="player"`)
- Builder authoring (`mode="authoring"`)
- Builder player preview (`mode="preview"`)

`resolvePlayableCampaignMap()` overlays a local draft onto production when present.

## Future (6C+)

- Grasslands multi-area campaigns
- Story / mechanic intro / gate node behaviors
- GitHub publish/install of campaign JSON
- Animated player marker

Do not invent a second unlock engine.
