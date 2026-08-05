import { describe, expect, it } from "vitest";
import type { Scenario } from "./types";
import { buildInitialState } from "./board";
import { findSlot, hexIdAtSlot, rowShiftVisual, clockwiseOrderFrom } from "./layout";
import { neighborIdsSameLayer } from "./neighbors";
import { applyShift } from "./rules";
import { SEVEN_LEFT_SIX_RIGHT_ROWS } from "./rowMovement";

const SHIFT_L2_ROWS = Object.fromEntries(
  [0, 1, 2, 3, 4, 5, 6].map((r) => [String(r), SEVEN_LEFT_SIX_RIGHT_ROWS[r as 0 | 1 | 2 | 3 | 4 | 5 | 6]])
);

function testScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "test_layout",
    name: "Layout Test",
    layers: 7,
    start: { layer: 2, row: 3, col: 1 },
    goal: { layer: 2, row: 3, col: 4 },
    missing: [],
    blocked: [],
    movement: {
      "1": "NONE",
      "2": { rows: SHIFT_L2_ROWS },
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

    const slot = findSlot(state, 2, playerId);
    expect(slot).toEqual({ row: 3, col: 1 });
    expect(hexIdAtSlot(state, 2, slot!.row, slot!.col)).toBe(playerId);
  });

  it("applyShift rotates row ids and updates neighbor adjacency", () => {
    const state = buildInitialState(testScenario());
    const playerId = state.playerHexId;
    const before = neighborIdsSameLayer(state, playerId);

    applyShift(state, 2, "SEVEN_LEFT_SIX_RIGHT");

    expect(rowShiftVisual(state, 2, 3)).not.toBe(0);
    const after = neighborIdsSameLayer(state, playerId);
    expect(after).not.toEqual(before);
  });

  it("clockwiseOrderFrom sorts neighbors around the player", () => {
    const state = buildInitialState(testScenario());
    const playerId = state.playerHexId;
    const neighbors = neighborIdsSameLayer(state, playerId).filter((id) => {
      const hex = state.hexesById.get(id);
      return hex && !hex.blocked;
    });

    const ordered = clockwiseOrderFrom(state, 2, playerId, neighbors);
    expect(ordered).toHaveLength(neighbors.length);
    expect(new Set(ordered)).toEqual(new Set(neighbors));
  });
});
