import { describe, expect, it } from "vitest";
import type { Scenario } from "./types";
import { buildInitialState } from "./board";
import { findSlot, hexIdAtSlot, rowShiftVisual } from "./layout";
import { neighborIdsSameLayer } from "./neighbors";
import { applyShift } from "./rules";

function testScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "test_layout",
    name: "Layout Test",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 2, row: 3, col: 4 },
    missing: [],
    blocked: [],
    movement: {
      "1": "NONE",
      "2": "SEVEN_LEFT_SIX_RIGHT",
      "3": "NONE",
      "4": "NONE",
      "5": "NONE",
      "6": "NONE",
      "7": "NONE",
    },
    transitions: [
      { type: "UP", from: { layer: 1, row: 2, col: 2 }, to: { layer: 2, row: 2, col: 2 } },
    ],
    revealOnEnterGuaranteedUp: false,
    ...overrides,
  };
}

describe("layout", () => {
  it("findSlot locates a hex in the current row order", () => {
    const state = buildInitialState(testScenario());
    const playerId = state.playerHexId;

    const slot = findSlot(state, 1, playerId);
    expect(slot).toEqual({ row: 3, col: 1 });
    expect(hexIdAtSlot(state, 1, slot!.row, slot!.col)).toBe(playerId);
  });

  it("applyShift rotates row ids and updates neighbor adjacency", () => {
    const state = buildInitialState(testScenario());
    const playerId = state.playerHexId;
    const before = neighborIdsSameLayer(state, playerId);

    applyShift(state, 1, "SEVEN_LEFT_SIX_RIGHT");

    expect(rowShiftVisual(state, 1, 3)).not.toBe(0);
    const after = neighborIdsSameLayer(state, playerId);
    expect(after).not.toEqual(before);
  });
});
