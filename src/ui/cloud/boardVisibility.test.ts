import { describe, expect, it } from "vitest";
import { computeBoardVisibility } from "./boardVisibility";

const terrain = new Set(["L1-R0-C0", "L1-R0-C1", "L1-R1-C0", "L1-R1-C1"]);
const edges: Record<string, string[]> = {
  "L1-R0-C0": ["L1-R0-C1"],
  "L1-R0-C1": ["L1-R0-C0", "L1-R1-C0", "L1-R1-C1"],
  "L1-R1-C0": ["L1-R0-C1", "L1-R1-C1"],
  "L1-R1-C1": ["L1-R0-C1", "L1-R1-C0"],
};
const adjacency = (id: string) => new Set(edges[id] ?? []);

describe("computeBoardVisibility", () => {
  it("invisible mode hides all but current hex", () => {
    const map = computeBoardVisibility({
      mode: "invisible",
      currentHexId: "L1-R0-C0",
      legalMoveHexIds: new Set(["L1-R0-C1"]),
      allTerrainHexIds: terrain,
      goalHexId: null,
      portalHexIds: new Set(),
      adjacency,
    });
    expect(map.get("L1-R0-C0")?.visibility).toBe("visible");
    expect(map.get("L1-R0-C1")?.visibility).toBe("hidden");
  });

  it("night mode fades all but current hex", () => {
    const map = computeBoardVisibility({
      mode: "night",
      currentHexId: "L1-R0-C0",
      legalMoveHexIds: new Set(["L1-R0-C1"]),
      allTerrainHexIds: terrain,
      goalHexId: "L1-R1-C0",
      portalHexIds: new Set(["L1-R0-C1"]),
      adjacency,
    });
    expect(map.get("L1-R0-C0")?.visibility).toBe("visible");
    expect(map.get("L1-R0-C1")?.visibility).toBe("faded");
  });

  it("memory mode keeps ember trail and gold-edge legal hints", () => {
    const map = computeBoardVisibility({
      mode: "memory",
      currentHexId: "L1-R0-C0",
      legalMoveHexIds: new Set(["L1-R0-C1"]),
      allTerrainHexIds: terrain,
      goalHexId: null,
      portalHexIds: new Set(),
      adjacency,
      context: { memoryVisitedHexIds: new Set(["L1-R0-C0"]) },
    });
    expect(map.get("L1-R0-C0")?.visibility).toBe("visible");
    expect(map.get("L1-R0-C1")?.visibility).toBe("partial");
    expect(map.get("L1-R1-C0")?.visibility).toBe("hidden");
  });

  it("memory mode marks visited tiles as ember", () => {
    const map = computeBoardVisibility({
      mode: "memory",
      currentHexId: "L1-R0-C1",
      legalMoveHexIds: new Set(),
      allTerrainHexIds: terrain,
      goalHexId: null,
      portalHexIds: new Set(),
      adjacency,
      context: { memoryVisitedHexIds: new Set(["L1-R0-C0"]) },
    });
    expect(map.get("L1-R0-C0")?.visibility).toBe("ember");
    expect(map.get("L1-R0-C1")?.visibility).toBe("visible");
  });

  it("lantern mode uses bright pool and edge silhouettes", () => {
    const map = computeBoardVisibility({
      mode: "lantern",
      currentHexId: "L1-R0-C0",
      legalMoveHexIds: new Set(["L1-R0-C1"]),
      allTerrainHexIds: terrain,
      goalHexId: null,
      portalHexIds: new Set(),
      adjacency,
      context: { lanternRadius: 2 },
    });
    expect(map.get("L1-R0-C0")?.visibility).toBe("visible");
    expect(map.get("L1-R0-C1")?.visibility).toBe("visible");
    expect(map.get("L1-R1-C0")?.visibility).toBe("faded");
    expect(map.get("L1-R1-C1")?.visibility).toBe("faded");
  });

  it("echo mode shows ghost traces only on recent steps", () => {
    const map = computeBoardVisibility({
      mode: "echo",
      currentHexId: "L1-R0-C1",
      legalMoveHexIds: new Set(["L1-R1-C0"]),
      allTerrainHexIds: terrain,
      goalHexId: null,
      portalHexIds: new Set(),
      adjacency,
      context: { echoHexIds: new Set(["L1-R0-C0"]) },
    });
    expect(map.get("L1-R0-C1")?.visibility).toBe("visible");
    expect(map.get("L1-R0-C0")?.visibility).toBe("echo");
    expect(map.get("L1-R1-C0")?.visibility).toBe("hidden");
  });

  it("crystal_vision marks goal as beacon and reveals sight-lines", () => {
    const map = computeBoardVisibility({
      mode: "crystal_vision",
      currentHexId: "L1-R0-C0",
      legalMoveHexIds: new Set(),
      allTerrainHexIds: terrain,
      goalHexId: "L1-R1-C1",
      portalHexIds: new Set(),
      adjacency,
    });
    expect(map.get("L1-R0-C0")?.visibility).toBe("visible");
    expect(map.get("L1-R0-C1")?.visibility).toBe("visible");
    expect(map.get("L1-R1-C1")?.visibility).toBe("beacon");
    expect(map.get("L1-R1-C0")?.visibility).toBe("hidden");
  });
});
