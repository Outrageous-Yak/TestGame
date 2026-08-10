import { describe, it, expect } from "vitest";
import {
  getDefaultCampaignMap,
  resolveMapCurrentTrackKey,
  resolveNodeTrack,
  resolveNodeViewState,
  type CampaignMap,
  type CampaignNodeViewState,
} from "./index";
import { createDefaultProgression } from "../progression/storage";
import { recordTrackCompletion } from "../progression";
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
