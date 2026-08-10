import { describe, it, expect } from "vitest";
import {
  getDefaultCampaignMap,
  resolveMapCurrentTrackKey,
  resolveMapPlayerMarkerNode,
  resolveNodeTrack,
  resolveNodeViewState,
  resolvePlayableCampaignMap,
  addTrackNode,
  addConnection,
  removeConnection,
  removeNode,
  nudgeNode,
  setNodePosition,
  validateCampaignMap,
  upsertCampaignDraft,
  saveCampaignDraftBundle,
  loadCampaignDraftBundle,
  emptyCampaignDraftBundle,
  deleteCampaignDraft,
  CAMPAIGN_MAP_DRAFTS_KEY,
  cloneCampaignMap,
  isTrackNodePlayable,
  type CampaignMap,
  type CampaignNodeViewState,
} from "./index";
import {
  buildCampaignOrigin,
  collectInvalidTrackNodes,
  resolveReturnCampaignMapId,
  snapshotMapNodeStates,
} from "./flow";
import { isCampaignOrigin } from "./playOrigin";
import { createDefaultProgression } from "../progression/storage";
import { recordTrackCompletion } from "../progression";
import { PROGRESSION_STORAGE_KEY } from "../progression/storage";
import type { WorldEntry } from "../ui/types";

const mockWorlds: WorldEntry[] = [
  {
    id: "forgotten_citadel",
    name: "Forgotten Citadel",
    menu: {},
    scenarios: [
      {
        id: "citadel_path",
        name: "Citadel Path",
        scenarioJson: "x",
        theme: {
          palette: { L1: "", L2: "", L3: "", L4: "", L5: "", L6: "", L7: "" },
          assets: { diceFacesBase: "", diceCornerBorder: "", villainsBase: "" },
        },
        tracks: [
          { id: "fc_t01", name: "First Steps", scenarioJson: "a" },
          { id: "fc_t02", name: "Rift Isles", scenarioJson: "b" },
        ],
        progression: { mode: "SEQUENTIAL" },
      },
    ],
  },
];

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    _store: store,
  };
}

describe("campaign map 6A", () => {
  it("default map references existing track ids without duplicating JSON", () => {
    const map: CampaignMap = getDefaultCampaignMap();
    expect(map.worldId).toBe("forgotten_citadel");
    expect(map.nodes.length).toBeGreaterThan(3);
    expect(map.nodes.every((n) => n.trackId && n.scenarioId && n.worldId)).toBe(true);
    expect(map.nodes[0].connections?.length).toBeGreaterThan(0);
  });

  it("resolves LOCKED / AVAILABLE / COMPLETED from progression", () => {
    let progress = createDefaultProgression();
    const map = getDefaultCampaignMap();
    const n0 = map.nodes[0];
    const n1 = map.nodes[1];

    const s0 = resolveNodeViewState(progress, mockWorlds, n0, null);
    const s1 = resolveNodeViewState(progress, mockWorlds, n1, null);
    expect(s0).toBe("AVAILABLE");
    expect(s1).toBe("LOCKED");

    progress = recordTrackCompletion(progress, "forgotten_citadel", "fc_t01");
    const after: CampaignNodeViewState = resolveNodeViewState(progress, mockWorlds, n0, null);
    const next = resolveNodeViewState(progress, mockWorlds, n1, null);
    expect(after).toBe("COMPLETED");
    expect(next).toBe("AVAILABLE");
  });

  it("marks CURRENT from map-local continue without writing progression", () => {
    const progress = createDefaultProgression();
    const before = JSON.stringify(progress);
    const map = getDefaultCampaignMap();
    const key = resolveMapCurrentTrackKey(progress, mockWorlds, map);
    expect(key).toBe("forgotten_citadel|fc_t01");
    expect(JSON.stringify(progress)).toBe(before);

    const view = resolveNodeViewState(progress, mockWorlds, map.nodes[0], key);
    expect(view).toBe("CURRENT");
  });

  it("resolveNodeTrack finds world/scenario/track", () => {
    const map = getDefaultCampaignMap();
    const resolved = resolveNodeTrack(mockWorlds, map.nodes[0]);
    expect(resolved?.track.id).toBe("fc_t01");
    expect(resolved?.scenario.id).toBe("citadel_path");
  });

  it("supports winding connections with gaps (branching-ready)", () => {
    const map = getDefaultCampaignMap();
    const mid = map.nodes[3];
    expect(mid.connections).toEqual(["n_fc_t05"]);
    expect(map.nodes.some((n) => (n.connections?.length ?? 0) === 0)).toBe(true);
  });
});

describe("campaign builder 6B", () => {
  it("mutates nodes/connections without touching production module identity", () => {
    const prod = getDefaultCampaignMap();
    const prodNode0 = prod.nodes[0];
    let map = cloneCampaignMap(prod);
    map = nudgeNode(map, map.nodes[0].id, 5, 0);
    map = addConnection(map, map.nodes[0].id, map.nodes[2].id);
    map = removeConnection(map, map.nodes[0].id, map.nodes[1].id);
    expect(map.nodes[0].x).not.toBe(prodNode0.x);
    expect(prod.nodes[0].x).toBe(prodNode0.x);
    expect(map.nodes[0].connections).toContain(map.nodes[2].id);
  });

  it("add/remove track node", () => {
    let map = getDefaultCampaignMap();
    const before = map.nodes.length;
    map = addTrackNode(map, {
      worldId: "forgotten_citadel",
      scenarioId: "citadel_path",
      trackId: "fc_t02",
      label: "Extra",
    });
    expect(map.nodes.length).toBe(before + 1);
    const id = map.nodes[map.nodes.length - 1].id;
    map = removeNode(map, id);
    expect(map.nodes.length).toBe(before);
  });

  it("validates missing track refs and dangling connections", () => {
    let map = getDefaultCampaignMap();
    map = addTrackNode(map, { trackId: "nope", scenarioId: "citadel_path" });
    map = addConnection(map, map.nodes[0].id, "missing_node");
    const issues = validateCampaignMap(map, mockWorlds);
    expect(issues.some((i) => i.code === "missing_track_ref")).toBe(true);
    expect(issues.some((i) => i.code === "dangling_connection")).toBe(true);
  });

  it("draft save/reload round-trips and isolates storage keys", () => {
    const ls = memoryStorage({
      [PROGRESSION_STORAGE_KEY]: JSON.stringify(createDefaultProgression()),
      track_planner_drafts_v1: '{"version":1,"worlds":[],"scenarios":[],"tracks":[],"updatedAt":"x"}',
      "hexgame-best:prism_path:t5": "9",
    });
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });

    let map = getDefaultCampaignMap();
    map = nudgeNode(map, map.nodes[0].id, 8, 0);
    map.catalogStatus = "modified_draft";
    saveCampaignDraftBundle(upsertCampaignDraft(emptyCampaignDraftBundle(), map));

    const reloaded = loadCampaignDraftBundle();
    expect(reloaded.maps[0].nodes[0].x).toBe(map.nodes[0].x);
    expect(resolvePlayableCampaignMap(map.id).nodes[0].x).toBe(map.nodes[0].x);

    expect(ls._store[PROGRESSION_STORAGE_KEY]).toContain("completedTracks");
    expect(ls._store.track_planner_drafts_v1).toContain('"tracks":[]');
    expect(ls._store["hexgame-best:prism_path:t5"]).toBe("9");
    expect(ls._store[CAMPAIGN_MAP_DRAFTS_KEY]).toBeTruthy();

    saveCampaignDraftBundle(deleteCampaignDraft(loadCampaignDraftBundle(), map.id));
    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });

  it("opening map for play does not write progression", () => {
    const progress = createDefaultProgression();
    const before = JSON.stringify(progress);
    resolvePlayableCampaignMap();
    resolveMapCurrentTrackKey(progress, mockWorlds, getDefaultCampaignMap());
    expect(JSON.stringify(progress)).toBe(before);
  });
});

describe("campaign flow 6C", () => {
  it("preserves originating campaign/map/node context across launch", () => {
    const map = getDefaultCampaignMap();
    const node = map.nodes[0];
    const origin = buildCampaignOrigin({
      campaignMapId: map.id,
      areaId: map.areaId,
      nodeId: node.id,
      worldId: node.worldId,
      scenarioId: node.scenarioId,
      trackId: node.trackId,
    });
    expect(isCampaignOrigin(origin)).toBe(true);
    expect(resolveReturnCampaignMapId(origin)).toBe(map.id);
    expect(resolveReturnCampaignMapId({ kind: "list" }, map.id)).toBe(map.id);
  });

  it("completion refreshes DONE and NEXT from existing progression", () => {
    let progress = createDefaultProgression();
    const map = getDefaultCampaignMap();
    const before = snapshotMapNodeStates(progress, mockWorlds, map);
    expect(before[map.nodes[0].id]).toBe("CURRENT");
    expect(before[map.nodes[1].id]).toBe("LOCKED");

    progress = recordTrackCompletion(progress, "forgotten_citadel", "fc_t01");
    const after = snapshotMapNodeStates(progress, mockWorlds, map);
    expect(after[map.nodes[0].id]).toBe("COMPLETED");
    expect(after[map.nodes[1].id]).toBe("CURRENT");
  });

  it("invalid Track references fail safely as INVALID", () => {
    let map = getDefaultCampaignMap();
    map = addTrackNode(map, {
      id: "broken_node",
      trackId: "does_not_exist",
      scenarioId: "citadel_path",
      worldId: "forgotten_citadel",
    });
    const invalid = collectInvalidTrackNodes(mockWorlds, map);
    expect(invalid.some((n) => n.id === "broken_node")).toBe(true);
    expect(isTrackNodePlayable(mockWorlds, map.nodes[0])).toBe(true);
    const states = snapshotMapNodeStates(createDefaultProgression(), mockWorlds, map);
    expect(states.broken_node).toBe("INVALID");
  });

  it("player renderer still consumes same CampaignMap / draft overlay", () => {
    const ls = memoryStorage();
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
    let map = getDefaultCampaignMap();
    map = nudgeNode(map, map.nodes[0].id, 6, 0);
    saveCampaignDraftBundle(upsertCampaignDraft(emptyCampaignDraftBundle(), map));
    const playable = resolvePlayableCampaignMap(map.id);
    expect(playable.nodes[0].x).toBe(map.nodes[0].x);
    expect(playable.id).toBe(map.id);
    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });
});

describe("world map player sprite marker", () => {
  it("1. no progression → marker resolves to initial/current node", () => {
    const map = getDefaultCampaignMap();
    const marker = resolveMapPlayerMarkerNode(null, mockWorlds, map);
    expect(marker?.id).toBe(map.nodes[0].id);
    expect(marker?.trackId).toBe("fc_t01");
  });

  it("2. progress completion → marker resolver updates", () => {
    let progress = createDefaultProgression();
    const map = getDefaultCampaignMap();
    expect(resolveMapPlayerMarkerNode(progress, mockWorlds, map)?.trackId).toBe("fc_t01");
    progress = recordTrackCompletion(progress, "forgotten_citadel", "fc_t01");
    expect(resolveMapPlayerMarkerNode(progress, mockWorlds, map)?.trackId).toBe("fc_t02");
  });

  it("3. all complete → final node selected", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "forgotten_citadel", "fc_t01");
    progress = recordTrackCompletion(progress, "forgotten_citadel", "fc_t02");
    const map = getDefaultCampaignMap();
    const marker = resolveMapPlayerMarkerNode(progress, mockWorlds, map);
    expect(marker?.trackId).toBe("fc_t02");
    expect(resolveMapCurrentTrackKey(progress, mockWorlds, map)).toBeNull();
  });

  it("4. invalid current node fails safely", () => {
    const map: CampaignMap = {
      id: "tiny",
      worldId: "forgotten_citadel",
      areaId: "citadel_path",
      title: "T",
      nodes: [
        {
          id: "broken",
          worldId: "forgotten_citadel",
          scenarioId: "citadel_path",
          trackId: "missing_track",
          x: 10,
          y: 10,
          type: "track",
          connections: [],
        },
        {
          id: "ok",
          worldId: "forgotten_citadel",
          scenarioId: "citadel_path",
          trackId: "fc_t01",
          x: 40,
          y: 20,
          type: "track",
          connections: [],
        },
      ],
    };
    const marker = resolveMapPlayerMarkerNode(createDefaultProgression(), mockWorlds, map);
    expect(marker?.id).toBe("ok");
  });

  it("5. marker uses CampaignNode coordinates", () => {
    const map = getDefaultCampaignMap();
    const marker = resolveMapPlayerMarkerNode(createDefaultProgression(), mockWorlds, map);
    expect(marker).toBeTruthy();
    expect(marker!.x).toBe(map.nodes[0].x);
    expect(marker!.y).toBe(map.nodes[0].y);
  });

  it("6. moving node changes marker location automatically", () => {
    let map = getDefaultCampaignMap();
    const before = resolveMapPlayerMarkerNode(createDefaultProgression(), mockWorlds, map)!;
    const oldX = before.x;
    map = setNodePosition(map, before.id, oldX + 12, before.y + 5);
    const after = resolveMapPlayerMarkerNode(createDefaultProgression(), mockWorlds, map)!;
    expect(after.id).toBe(before.id);
    expect(after.x).toBe(oldX + 12);
    expect(after.y).toBe(before.y + 5);
  });

  it("7. resolving marker does not write progression", () => {
    const ls = memoryStorage({ [PROGRESSION_STORAGE_KEY]: JSON.stringify(createDefaultProgression()) });
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
    const before = ls.getItem(PROGRESSION_STORAGE_KEY);
    resolveMapPlayerMarkerNode(null, mockWorlds, getDefaultCampaignMap());
    resolveMapPlayerMarkerNode(createDefaultProgression(), mockWorlds, getDefaultCampaignMap());
    expect(ls.getItem(PROGRESSION_STORAGE_KEY)).toBe(before);
    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });
});
