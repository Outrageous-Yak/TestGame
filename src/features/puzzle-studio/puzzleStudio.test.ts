import { describe, it, expect } from "vitest";
import { buildStudioCatalog } from "./studioCatalog";
import { isDevMode } from "./devMode";
import type { WorldEntry } from "../../ui/types";

const mockWorld: WorldEntry = {
  id: "test_world",
  name: "Test World",
  menu: {},
  scenarios: [
    {
      id: "sc1",
      name: "Scenario 1",
      scenarioJson: "worlds/test/scenario.json",
      theme: {
        palette: {
          L1: "#111",
          L2: "#222",
          L3: "#333",
          L4: "#444",
          L5: "#555",
          L6: "#666",
          L7: "#777",
        },
        assets: { diceFacesBase: "", diceCornerBorder: "", villainsBase: "" },
      },
      tracks: [
        { id: "t1", name: "Track 1", scenarioJson: "worlds/test/track1.json" },
        { id: "t2", name: "Track 2", scenarioJson: "worlds/test/track2.json" },
      ],
    },
  ],
};

describe("puzzle studio catalog", () => {
  it("flattens worlds into track entries", () => {
    const catalog = buildStudioCatalog([mockWorld]);
    expect(catalog.length).toBe(2);
    expect(catalog[0].worldName).toBe("Test World");
    expect(catalog[0].trackName).toBe("Track 1");
  });
});

describe("devMode", () => {
  it("isDevMode returns false without window", () => {
    expect(isDevMode()).toBe(false);
  });
});
