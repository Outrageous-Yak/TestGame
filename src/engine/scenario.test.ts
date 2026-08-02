import { describe, expect, it } from "vitest";
import type { Scenario } from "./types";
import { assertScenario } from "./scenario";

function baseScenario(): Scenario {
  return {
    id: "test_scenario",
    name: "Scenario Test",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 2, row: 3, col: 4 },
    missing: [],
    blocked: [],
    movement: { "1": "NONE", "2": "NONE", "3": "NONE", "4": "NONE", "5": "NONE", "6": "NONE", "7": "NONE" },
    transitions: [
      { type: "UP", from: { layer: 1, row: 2, col: 2 }, to: { layer: 2, row: 2, col: 2 } },
      { type: "UP", from: { layer: 2, row: 2, col: 2 }, to: { layer: 3, row: 2, col: 2 } },
      { type: "UP", from: { layer: 3, row: 2, col: 2 }, to: { layer: 4, row: 2, col: 2 } },
      { type: "UP", from: { layer: 4, row: 2, col: 2 }, to: { layer: 5, row: 2, col: 2 } },
      { type: "UP", from: { layer: 5, row: 2, col: 2 }, to: { layer: 6, row: 2, col: 2 } },
      { type: "UP", from: { layer: 6, row: 2, col: 2 }, to: { layer: 7, row: 2, col: 2 } },
    ],
    revealOnEnterGuaranteedUp: false,
  };
}

describe("assertScenario", () => {
  it("accepts a valid 7-layer scenario", () => {
    expect(() => assertScenario(baseScenario())).not.toThrow();
  });

  it("rejects layer 1 movement other than NONE", () => {
    const s = baseScenario();
    s.movement = { ...s.movement, "1": "SEVEN_LEFT_SIX_RIGHT" };
    expect(() => assertScenario(s)).toThrow(/Layer 1 must be NONE/);
  });

  it("rejects start on a blocked hex", () => {
    const s = baseScenario();
    s.blocked = [{ layer: 1, row: 3, col: 1 }];
    expect(() => assertScenario(s)).toThrow(/Start cannot be missing\/blocked/);
  });
});
