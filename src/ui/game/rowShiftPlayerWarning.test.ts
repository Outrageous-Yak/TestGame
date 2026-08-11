import { describe, expect, it } from "vitest";
import { newGame } from "../../engine/api";
import type { Scenario } from "../../engine/types";
import { rowShiftLabel } from "../../engine/layout";
import { getRuntimeMovement } from "../../engine/rowMovement";
import {
  PLAYER_ROW_SHIFT_WARNING,
  currentLayerHasRowShift,
  playerRowShiftWarning,
} from "./rowShiftPlayerWarning";

function noneMovement(): Scenario["movement"] {
  return {
    "1": "NONE",
    "2": "NONE",
    "3": "NONE",
    "4": "NONE",
    "5": "NONE",
    "6": "NONE",
    "7": "NONE",
  };
}

function scenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "row_warn_test",
    name: "Row Warn",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 1, row: 3, col: 2 },
    missing: [],
    blocked: [],
    movement: noneMovement(),
    transitions: [],
    revealOnEnterGuaranteedUp: false,
    ...overrides,
  };
}

describe("player row-shift warning", () => {
  it("1. static layer → warning absent", () => {
    const state = newGame(scenario());
    expect(currentLayerHasRowShift(state, 1)).toBe(false);
    expect(playerRowShiftWarning(state, 1)).toBeNull();
  });

  it("2. one moving row → warning present", () => {
    const state = newGame(
      scenario({
        movement: {
          ...noneMovement(),
          "2": {
            rows: {
              "0": { direction: "NONE", amount: 0 },
              "1": { direction: "LEFT", amount: 1 },
              "2": { direction: "NONE", amount: 0 },
              "3": { direction: "NONE", amount: 0 },
              "4": { direction: "NONE", amount: 0 },
              "5": { direction: "NONE", amount: 0 },
              "6": { direction: "NONE", amount: 0 },
            },
          },
        },
      })
    );
    expect(playerRowShiftWarning(state, 2)).toBe(PLAYER_ROW_SHIFT_WARNING);
    expect(playerRowShiftWarning(state, 1)).toBeNull();
  });

  it("3. multiple moving rows → warning present", () => {
    const state = newGame(
      scenario({
        movement: {
          ...noneMovement(),
          "3": {
            rows: {
              "0": { direction: "LEFT", amount: 1 },
              "1": { direction: "RIGHT", amount: 1 },
              "2": { direction: "LEFT", amount: 1 },
              "3": { direction: "RIGHT", amount: 1 },
              "4": { direction: "LEFT", amount: 1 },
              "5": { direction: "RIGHT", amount: 1 },
              "6": { direction: "LEFT", amount: 1 },
            },
          },
        },
      })
    );
    expect(playerRowShiftWarning(state, 3)).toBe(PLAYER_ROW_SHIFT_WARNING);
  });

  it("4. amount > 1 → warning present (still non-spoilery)", () => {
    const state = newGame(
      scenario({
        movement: {
          ...noneMovement(),
          "1": {
            rows: {
              "0": { direction: "NONE", amount: 0 },
              "1": { direction: "NONE", amount: 0 },
              "2": { direction: "NONE", amount: 0 },
              "3": { direction: "LEFT", amount: 2 },
              "4": { direction: "NONE", amount: 0 },
              "5": { direction: "NONE", amount: 0 },
              "6": { direction: "NONE", amount: 0 },
            },
          },
        },
      })
    );
    expect(playerRowShiftWarning(state, 1)).toBe(PLAYER_ROW_SHIFT_WARNING);
    expect(playerRowShiftWarning(state, 1)).not.toMatch(/L2|R2|LEFT|RIGHT/i);
  });

  it("5. player warning does not expose technical L/R sequence", () => {
    const state = newGame(
      scenario({
        movement: {
          ...noneMovement(),
          "2": {
            rows: {
              "0": { direction: "LEFT", amount: 1 },
              "1": { direction: "RIGHT", amount: 2 },
              "2": { direction: "NONE", amount: 0 },
              "3": { direction: "LEFT", amount: 1 },
              "4": { direction: "NONE", amount: 0 },
              "5": { direction: "NONE", amount: 0 },
              "6": { direction: "NONE", amount: 0 },
            },
          },
        },
      })
    );
    const warn = playerRowShiftWarning(state, 2)!;
    expect(warn).toBe(PLAYER_ROW_SHIFT_WARNING);
    expect(warn).not.toMatch(/\bL\d+\b/);
    expect(warn).not.toMatch(/\bR\d+\b/);
    expect(warn.toLowerCase()).not.toContain("left");
    expect(warn.toLowerCase()).not.toContain("right");
  });

  it("6. developer detailed movement information remains available", () => {
    const state = newGame(
      scenario({
        movement: {
          ...noneMovement(),
          "4": {
            rows: {
              "0": { direction: "NONE", amount: 0 },
              "1": { direction: "NONE", amount: 0 },
              "2": { direction: "RIGHT", amount: 1 },
              "3": { direction: "NONE", amount: 0 },
              "4": { direction: "NONE", amount: 0 },
              "5": { direction: "NONE", amount: 0 },
              "6": { direction: "NONE", amount: 0 },
            },
          },
        },
      })
    );
    const movement = getRuntimeMovement(state.scenario);
    expect(movement[4].rows[2]).toEqual({ direction: "RIGHT", amount: 1 });
    expect(playerRowShiftWarning(state, 4)).toBe(PLAYER_ROW_SHIFT_WARNING);
    // Engine label helper still exported for authoring overlays after shifts
    expect(typeof rowShiftLabel).toBe("function");
  });
});
