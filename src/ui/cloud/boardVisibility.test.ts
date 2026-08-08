import { describe, expect, it } from "vitest";
import { computeBoardVisibility } from "./boardVisibility";

const terrain = new Set(["L1-R0-C0", "L1-R0-C1", "L1-R1-C0"]);
const adjacency = () => new Set<string>();

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
    expect(map.get("L1-R1-C0")?.visibility).toBe("hidden");
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
    expect(map.get("L1-R1-C0")?.visibility).toBe("faded");
  });

  it("memory mode reveals visited hexes", () => {
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
    expect(map.get("L1-R0-C0")?.visibility).toBe("visible");
  });

  it("crystal_vision keeps goal visible through haze", () => {
    const map = computeBoardVisibility({
      mode: "crystal_vision",
      currentHexId: "L1-R0-C0",
      legalMoveHexIds: new Set(),
      allTerrainHexIds: terrain,
      goalHexId: "L1-R1-C0",
      portalHexIds: new Set(),
      adjacency,
    });
    expect(map.get("L1-R1-C0")?.visibility).toBe("visible");
  });
});
