# Campaign flow (Steps 6A–6C)

## Player loop

Campaign Map → node (Track) → play → win/exit → **same** Campaign Map

1. Player opens World Map (`CampaignMap` via `resolvePlayableCampaignMap`).
2. Tap AVAILABLE/COMPLETED node → launch with stable IDs:
   `campaignMapId`, `areaId`, `nodeId`, `worldId`, `scenarioId`, `trackId`
3. App stores `CampaignPlayOrigin` (`kind: "campaign"`).
4. Exit / Map returns to World Map with the same `campaignMapId` and reloads `hexgame-progression` so DONE / NEXT refresh without a browser reload.

Classic List launches use `kind: "list"` and still return to World Map safely.

## Authority split

| Concern | Owner |
|---------|--------|
| Node placement, labels, connections | CampaignMap (Builder / drafts) |
| LOCKED / AVAILABLE / COMPLETED | Existing progression (`hexgame-progression`) |
| Best scores | `hexgame-best:*` |
| Track boards/features | Track Planner / scenario JSON |

Connections are **visual journey** only. They do not create unlock rules.

## Data model foundation

```
WORLD
  → AREA / SCENARIO (CampaignMap.areaId)
    → CAMPAIGN NODES
      → TRACK refs (worldId + scenarioId + trackId)
```

Optional future hooks on `CampaignMap`: `nextCampaignMapId`, `nextWorldId`.

Node `type` placeholders: `track` | `story` | `mechanic_intro` | `area_gate` | `world_exit` — only TRACK is fully behaved.

## Broken references

Invalid Track nodes render as disabled **Broken** and cannot launch. Builder validation remains the primary authoring check.

## Storage

- `campaign_map_drafts_v1` — authoring only
- `hexgame-progression` — play/win
- `hexgame-best:*` — scores
- `track_planner_drafts_v1` — Track Planner
