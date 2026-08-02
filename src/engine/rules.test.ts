import { describe, expect, it } from "vitest";
import { buildInitialState } from "./board";
import { newGame, tryMove } from "./api";
import { computeMinMovesToGoal } from "./reachabilityOptimal";
import type { Scenario } from "./types";

function oneStepScenario(): Scenario {
  return {
    id: "test_one_step",
    name: "One Step",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 1, row: 3, col: 2 },
    missing: [],
    blocked: [],
    movement: {
      "1": "NONE",
      "2": "NONE",
      "3": "NONE",
      "4": "NONE",
      "5": "NONE",
      "6": "NONE",
      "7": "NONE",
    },
    transitions: [
      { type: "UP", from: { layer: 1, row: 0, col: 0 }, to: { layer: 2, row: 0, col: 0 } },
      { type: "UP", from: { layer: 2, row: 0, col: 0 }, to: { layer: 3, row: 0, col: 0 } },
      { type: "UP", from: { layer: 3, row: 0, col: 0 }, to: { layer: 4, row: 0, col: 0 } },
      { type: "UP", from: { layer: 4, row: 0, col: 0 }, to: { layer: 5, row: 0, col: 0 } },
      { type: "UP", from: { layer: 5, row: 0, col: 0 }, to: { layer: 6, row: 0, col: 0 } },
      { type: "UP", from: { layer: 6, row: 0, col: 0 }, to: { layer: 7, row: 0, col: 0 } },
    ],
    revealOnEnterGuaranteedUp: false,
  };
}

describe("rules and optimal path", () => {
  it("tryMove returns mutated state and detects a one-step win", () => {
    const scenario = oneStepScenario();
    const state = newGame(scenario);
    const targetId = "L1-R3-C2";

    const res = tryMove(state, targetId);

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.state.playerHexId).toBe(targetId);
    expect(res.won).toBe(true);
    expect(res.state.turn).toBe(1);
  });

  it("blocked target wastes a turn without moving the player", () => {
    const scenario = oneStepScenario();
    scenario.blocked = [{ layer: 1, row: 3, col: 2 }];
    const state = newGame(scenario);
    const before = state.playerHexId;

    const res = tryMove(state, "L1-R3-C2");

    expect(res.ok).toBe(false);
    if (res.ok) return;

    expect(res.reason).toBe("BLOCKED");
    expect(res.state.playerHexId).toBe(before);
    expect(res.state.turn).toBe(1);
  });

  it("computeMinMovesToGoal finds 1 for adjacent start and goal", () => {
    const state = buildInitialState(oneStepScenario());
    expect(computeMinMovesToGoal(state, 10)).toBe(1);
  });
});
