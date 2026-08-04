import { describe, expect, it } from "vitest";
import { computeCloudVisibility, type CloudVisualState } from "./computeCloudVisibility";

function adjacencyMap(map: Record<string, string[]>): (id: string) => ReadonlySet<string> {
  return (id) => new Set(map[id] ?? []);
}

const ALL = new Set(["A", "B", "C", "D", "E", "F"]);
const adj = adjacencyMap({
  A: ["B", "C"],
  B: ["A", "D"],
  C: ["A", "E"],
  D: ["B", "F"],
  E: ["C"],
  F: ["D"],
});

function cloudy(args: Partial<Parameters<typeof computeCloudVisibility>[0]> = {}) {
  return computeCloudVisibility({
    mode: "cloudy",
    currentHexId: "A",
    legalMoveHexIds: new Set(["B", "C"]),
    allTerrainHexIds: ALL,
    goalHexId: "F",
    portalHexIds: new Set(["D"]),
    adjacency: adj,
    ...args,
  });
}

function stateOf(map: Map<string, CloudVisualState>, id: string): CloudVisualState {
  const s = map.get(id);
  expect(s).toBeDefined();
  return s!;
}

describe("computeCloudVisibility — Cloudy", () => {
  it("current hex is visible", () => {
    const m = cloudy({ currentHexId: "A" });
    expect(stateOf(m, "A").visibility).toBe("visible");
  });

  it("every legal destination is visible", () => {
    const m = cloudy({ legalMoveHexIds: new Set(["B", "C"]) });
    expect(stateOf(m, "B").visibility).toBe("visible");
    expect(stateOf(m, "C").visibility).toBe("visible");
  });

  it("neighbors one step beyond legal destinations are partial", () => {
    const m = cloudy({ legalMoveHexIds: new Set(["B", "C"]) });
    expect(stateOf(m, "D").visibility).toBe("partial"); // neighbor of B
    expect(stateOf(m, "E").visibility).toBe("partial"); // neighbor of C
  });

  it("removes current hex from partial set", () => {
    const m = cloudy({ currentHexId: "D", legalMoveHexIds: new Set(["B"]) });
    expect(stateOf(m, "D").visibility).toBe("visible");
    expect(stateOf(m, "D").visibility).not.toBe("partial");
    expect(stateOf(m, "B").visibility).toBe("visible");
  });

  it("removes legal destinations from partial set", () => {
    const m = cloudy({ legalMoveHexIds: new Set(["B"]) });
    expect(stateOf(m, "B").visibility).toBe("visible");
    for (const [id, st] of m) {
      if (st.visibility === "partial") {
        expect(id).not.toBe("B");
        expect(id).not.toBe("A");
      }
    }
  });

  it("a hex never receives two visibility states", () => {
    const m = cloudy();
    const counts = new Map<string, number>();
    for (const [id, st] of m) counts.set(st.visibility, (counts.get(st.visibility) ?? 0) + 1);
    expect(m.size).toBe(ALL.size);
    expect([...m.values()].every((st) => ["visible", "partial", "cloud"].includes(st.visibility))).toBe(true);
  });

  it("distant hexes are fully cloudy", () => {
    const m = cloudy({ legalMoveHexIds: new Set(["B"]) });
    expect(stateOf(m, "F").visibility).toBe("cloud");
  });

  it("recalculates after movement (new current + legal set)", () => {
    const before = cloudy({ currentHexId: "A", legalMoveHexIds: new Set(["B"]) });
    const after = cloudy({ currentHexId: "B", legalMoveHexIds: new Set(["D"]) });
    expect(stateOf(before, "A").visibility).toBe("visible");
    expect(stateOf(after, "A").visibility).toBe("cloud");
    expect(stateOf(after, "B").visibility).toBe("visible");
  });

  it("recalculates after portal transition (new legal neighbors)", () => {
    const portalAdj = adjacencyMap({ X: ["Y"], Y: ["X", "Z"], Z: ["Y"] });
    const terrain = new Set(["X", "Y", "Z"]);
    const atX = computeCloudVisibility({
      mode: "cloudy",
      currentHexId: "X",
      legalMoveHexIds: new Set(["Y"]),
      allTerrainHexIds: terrain,
      goalHexId: "Z",
      portalHexIds: new Set(),
      adjacency: portalAdj,
    });
    const atZ = computeCloudVisibility({
      mode: "cloudy",
      currentHexId: "Z",
      legalMoveHexIds: new Set(["Y"]),
      allTerrainHexIds: terrain,
      goalHexId: "Z",
      portalHexIds: new Set(),
      adjacency: portalAdj,
    });
    expect(stateOf(atX, "Z").visibility).toBe("partial");
    expect(stateOf(atZ, "Z").visibility).toBe("visible");
  });

  it("recalculates after layer change (different hex universe)", () => {
    const layer1 = new Set(["A", "B"]);
    const layer2 = new Set(["P", "Q"]);
    const m1 = computeCloudVisibility({
      mode: "cloudy",
      currentHexId: "A",
      legalMoveHexIds: new Set(["B"]),
      allTerrainHexIds: layer1,
      goalHexId: null,
      portalHexIds: new Set(),
      adjacency: adjacencyMap({ A: ["B"], B: ["A"] }),
    });
    const m2 = computeCloudVisibility({
      mode: "cloudy",
      currentHexId: "P",
      legalMoveHexIds: new Set(["Q"]),
      allTerrainHexIds: layer2,
      goalHexId: "Q",
      portalHexIds: new Set(),
      adjacency: adjacencyMap({ P: ["Q"], Q: ["P"] }),
    });
    expect(m1.has("P")).toBe(false);
    expect(m2.has("A")).toBe(false);
    expect(stateOf(m2, "Q").visibility).toBe("visible");
  });

  it("restart resets visibility correctly", () => {
    const start = cloudy({ currentHexId: "A", legalMoveHexIds: new Set(["B"]) });
    const mid = cloudy({ currentHexId: "F", legalMoveHexIds: new Set(["D"]) });
    const reset = cloudy({ currentHexId: "A", legalMoveHexIds: new Set(["B"]) });
    expect(stateOf(mid, "F").visibility).toBe("visible");
    expect(stateOf(reset, "A").visibility).toBe("visible");
    expect(stateOf(reset, "F").visibility).toBe("cloud");
  });
});

describe("computeCloudVisibility — Full Cloud", () => {
  function fullCloud(args: Partial<Parameters<typeof computeCloudVisibility>[0]> = {}) {
    return computeCloudVisibility({
      mode: "full_cloud",
      currentHexId: "A",
      legalMoveHexIds: new Set(["B", "C"]),
      allTerrainHexIds: ALL,
      goalHexId: "F",
      portalHexIds: new Set(["D"]),
      adjacency: adj,
      ...args,
    });
  }

  it("current hex is visible", () => {
    expect(stateOf(fullCloud(), "A").visibility).toBe("visible");
  });

  it("every other terrain hex is cloudy", () => {
    const m = fullCloud();
    for (const id of ALL) {
      if (id === "A") continue;
      expect(stateOf(m, id).visibility).toBe("cloud");
    }
  });

  it("legal moves are flagged for move overlays", () => {
    const m = fullCloud({ legalMoveHexIds: new Set(["B", "C"]) });
    expect(stateOf(m, "B").isLegalMove).toBe(true);
    expect(stateOf(m, "C").isLegalMove).toBe(true);
    expect(stateOf(m, "D").isLegalMove).toBe(false);
  });

  it("legal move overlays do not change terrain visibility", () => {
    const m = fullCloud({ legalMoveHexIds: new Set(["B"]) });
    expect(stateOf(m, "B").visibility).toBe("cloud");
    expect(stateOf(m, "B").isLegalMove).toBe(true);
  });

  it("goal remains independently flagged", () => {
    const m = fullCloud({ goalHexId: "F" });
    expect(stateOf(m, "F").hasGoal).toBe(true);
    expect(stateOf(m, "F").visibility).toBe("cloud");
  });

  it("portals remain independently flagged", () => {
    const m = fullCloud({ portalHexIds: new Set(["D"]) });
    expect(stateOf(m, "D").hasPortal).toBe(true);
    expect(stateOf(m, "D").visibility).toBe("cloud");
  });

  it("empty legal move set behaves safely", () => {
    const m = fullCloud({ legalMoveHexIds: new Set() });
    expect(stateOf(m, "A").visibility).toBe("visible");
    expect([...m.values()].every((v) => !v.isLegalMove)).toBe(true);
  });
});
