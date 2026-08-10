import { describe, expect, it } from "vitest";
import { newGame } from "../../engine/api";
import { posId } from "../../engine/board";
import { attemptMove } from "../../engine/rules";
import { snapshotStateLite } from "../../engine/snapshot";
import {
  computeOptimalSolution,
  solverStateKey,
} from "../../engine/trackAnalysis";
import type { Scenario } from "../../engine/types";
import { applyLayerRowMovement, getRuntimeMovement } from "../../engine/rowMovement";
import { createEmptyTrack } from "./types";
import { cloneTrack, setRowMovement, toggleMissingHex } from "./state/authoringState";
import { scenarioJsonToTrack } from "./catalog";
import { runSimulator, trackSolverFingerprint } from "./simulation/runSimulator";
import { readFileSync } from "fs";
import { join } from "path";

const root = join(import.meta.dirname, "..", "..", "..");

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
    id: "sim_solver_test",
    name: "Simulator Solver Test",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 1, row: 3, col: 3 },
    missing: [],
    blocked: [],
    movement: noneMovement(),
    transitions: [],
    revealOnEnterGuaranteedUp: false,
    ...overrides,
  };
}

function trackFromScenario(s: Scenario, id = "t_sim") {
  const base = createEmptyTrack(id, "sc1", "w1", s.name);
  return scenarioJsonToTrack(base, s);
}

describe("Full simulator + solver", () => {
  it("1. trivial direct path", () => {
    const s = scenario();
    const sol = computeOptimalSolution(newGame(s), 40, 50000, { countAlternativePaths: true });
    expect(sol.minMoves).toBe(2);
    expect(sol.pathHexIds).toEqual(["L1-R3-C2", "L1-R3-C3"]);
    expect(sol.stats.searchAborted).toBe(false);
  });

  it("2. unreachable Goal", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 7, row: 3, col: 1 },
      transitions: [],
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(false);
    expect(runSimulator(trackFromScenario(s)).solverOutcome).toBe("unsolvable");
  });

  it("3. missing-hex barrier", () => {
    const open = computeOptimalSolution(newGame(scenario()), 40, 50000);
    const blocked = computeOptimalSolution(
      newGame(
        scenario({
          missing: [{ layer: 1, row: 3, col: 2 }],
          goal: { layer: 1, row: 3, col: 3 },
        })
      ),
      40,
      50000
    );
    expect(open.minMoves).toBe(2);
    // Still reachable via longer detour around the missing hex
    expect(blocked.minMoves).not.toBeNull();
    expect(blocked.minMoves!).toBeGreaterThan(open.minMoves!);
    expect(blocked.pathHexIds).not.toContain("L1-R3-C2");
  });

  it("4. UP portal", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 2, row: 3, col: 1 },
      transitions: [
        { type: "UP", from: { layer: 1, row: 3, col: 2 }, to: { layer: 2, row: 3, col: 1 } },
      ],
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).toBe(1);
    expect(sol.replay[0]?.portalType).toBe("UP");
    expect(sol.replay[0]?.playerAfter).toBe("L2-R3-C1");
  });

  it("5. DOWN portal", () => {
    const s = scenario({
      start: { layer: 2, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 1 },
      transitions: [
        { type: "DOWN", from: { layer: 2, row: 3, col: 2 }, to: { layer: 1, row: 3, col: 1 } },
      ],
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).toBe(1);
    expect(sol.replay[0]?.portalType).toBe("DOWN");
  });

  it("6. moving row required", () => {
    // Goal sits on a shifting row. Without movement the approach is blocked by missing
    // geometry; after moves activate L2 and shift, adjacency opens via portal route.
    const path = join(root, "public/worlds/forgotten_citadel/scenarios/track01.json");
    const s = JSON.parse(readFileSync(path, "utf8")) as Scenario;
    const sol = computeOptimalSolution(newGame(s), 80, 400000, { countAlternativePaths: true });
    expect(sol.minMoves).not.toBeNull();
    expect(sol.minMoves!).toBeGreaterThan(0);
    // Layer 2 has authored movement; path must visit L2 (portal climb).
    expect(sol.replay.some((r) => r.playerAfter.startsWith("L2-"))).toBe(true);
  });

  it("7. multiple moving rows", () => {
    const s = scenario({
      start: { layer: 2, row: 3, col: 0 },
      goal: { layer: 2, row: 3, col: 5 },
      missing: [
        { layer: 2, row: 2, col: 0 },
        { layer: 2, row: 2, col: 1 },
        { layer: 2, row: 2, col: 2 },
        { layer: 2, row: 2, col: 3 },
        { layer: 2, row: 2, col: 4 },
        { layer: 2, row: 4, col: 0 },
        { layer: 2, row: 4, col: 1 },
        { layer: 2, row: 4, col: 2 },
        { layer: 2, row: 4, col: 3 },
        { layer: 2, row: 4, col: 4 },
      ],
      movement: {
        ...noneMovement(),
        "2": {
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
    });
    const staticBoard = scenario({
      start: { layer: 2, row: 3, col: 0 },
      goal: { layer: 2, row: 3, col: 5 },
      missing: s.missing,
      movement: noneMovement(),
    });
    const withMove = computeOptimalSolution(newGame(s), 40, 50000);
    const without = computeOptimalSolution(newGame(staticBoard), 40, 50000);
    expect(withMove.minMoves).not.toBeNull();
    expect(without.minMoves).not.toBeNull();
    // Multi-row movement changes adjacency over time → different optimal length.
    expect(withMove.minMoves).not.toBe(without.minMoves);
    const layer2Rows = (s.movement as { "2": { rows: Record<string, { direction: string }> } })["2"].rows;
    expect(Object.values(layer2Rows).filter((r) => r.direction !== "NONE").length).toBe(7);
  });

  it("8. Layer 1 movement", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 0 },
      goal: { layer: 1, row: 3, col: 5 },
      missing: [
        { layer: 1, row: 2, col: 0 },
        { layer: 1, row: 2, col: 1 },
        { layer: 1, row: 2, col: 2 },
        { layer: 1, row: 2, col: 3 },
        { layer: 1, row: 2, col: 4 },
        { layer: 1, row: 4, col: 0 },
        { layer: 1, row: 4, col: 1 },
        { layer: 1, row: 4, col: 2 },
        { layer: 1, row: 4, col: 3 },
        { layer: 1, row: 4, col: 4 },
      ],
      movement: {
        ...noneMovement(),
        "1": {
          rows: {
            "0": { direction: "NONE", amount: 0 },
            "1": { direction: "NONE", amount: 0 },
            "2": { direction: "NONE", amount: 0 },
            "3": { direction: "LEFT", amount: 1 },
            "4": { direction: "NONE", amount: 0 },
            "5": { direction: "NONE", amount: 0 },
            "6": { direction: "NONE", amount: 0 },
          },
        },
      },
    });
    const base = newGame(s);
    expect([...base.movementActiveLayers]).toContain(1);
    const sol = computeOptimalSolution(base, 40, 50000);
    expect(sol.minMoves).not.toBeNull();
  });

  it("9. same player position / different row state → different keys", () => {
    const s = scenario({
      movement: {
        ...noneMovement(),
        "1": {
          rows: {
            "0": { direction: "NONE", amount: 0 },
            "1": { direction: "NONE", amount: 0 },
            "2": { direction: "NONE", amount: 0 },
            "3": { direction: "LEFT", amount: 1 },
            "4": { direction: "NONE", amount: 0 },
            "5": { direction: "NONE", amount: 0 },
            "6": { direction: "NONE", amount: 0 },
          },
        },
      },
    });
    const a = newGame(s);
    const b = newGame(s);
    const movement = getRuntimeMovement(b.scenario);
    applyLayerRowMovement(b, 1, movement);
    expect(a.playerHexId).toBe(b.playerHexId);
    const keyA = solverStateKey(snapshotStateLite(a));
    const keyB = solverStateKey(snapshotStateLite(b));
    expect(keyA).not.toBe(keyB);
  });

  it("10. amount > 1 matters", () => {
    const mk = (amount: number): Scenario =>
      scenario({
        start: { layer: 1, row: 3, col: 1 },
        goal: { layer: 1, row: 3, col: 1 },
        movement: {
          ...noneMovement(),
          "1": {
            rows: {
              "0": { direction: "NONE", amount: 0 },
              "1": { direction: "NONE", amount: 0 },
              "2": { direction: "NONE", amount: 0 },
              "3": { direction: "LEFT", amount },
              "4": { direction: "NONE", amount: 0 },
              "5": { direction: "NONE", amount: 0 },
              "6": { direction: "NONE", amount: 0 },
            },
          },
        },
      });

    const one = newGame(mk(1));
    const two = newGame(mk(2));
    applyLayerRowMovement(one, 1, getRuntimeMovement(one.scenario));
    applyLayerRowMovement(two, 1, getRuntimeMovement(two.scenario));
    const rowOne = one.rows.get(1)![3];
    const rowTwo = two.rows.get(1)![3];
    expect(rowOne[0]).not.toBe(rowTwo[0]);
    expect(solverStateKey(snapshotStateLite(one))).not.toBe(solverStateKey(snapshotStateLite(two)));
  });

  it("11. multiple equal optimal paths", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 2 },
      goal: { layer: 1, row: 3, col: 4 },
      // Open board — east along row and detours can share length depending on geometry;
      // fc_t02 is the known multi-optimal fixture.
    });
    const path = join(root, "public/worlds/forgotten_citadel/scenarios/track02.json");
    const fc02 = JSON.parse(readFileSync(path, "utf8")) as Scenario;
    const sol = computeOptimalSolution(newGame(fc02), 80, 400000, { countAlternativePaths: true });
    expect(sol.minMoves).not.toBeNull();
    expect(sol.hasMultipleOptimalPaths).toBe(true);
    expect(sol.alternativeOptimalCount).toBeGreaterThan(1);
    void s;
  });

  it("12. deterministic canonical path", () => {
    const path = join(root, "public/worlds/forgotten_citadel/scenarios/track02.json");
    const s = JSON.parse(readFileSync(path, "utf8")) as Scenario;
    const a = computeOptimalSolution(newGame(s), 80, 400000, { countAlternativePaths: true });
    const b = computeOptimalSolution(newGame(s), 80, 400000, { countAlternativePaths: true });
    expect(a.pathHexIds).toEqual(b.pathHexIds);
    expect(a.minMoves).toBe(b.minMoves);
  });

  it("13. automatic portal not over-counted", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 2, row: 3, col: 1 },
      transitions: [
        { type: "UP", from: { layer: 1, row: 3, col: 2 }, to: { layer: 2, row: 3, col: 1 } },
      ],
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).toBe(1);
    expect(sol.pathHexIds).toHaveLength(1);
    expect(sol.replay).toHaveLength(1);
  });

  it("14. solver does not mutate draft", () => {
    const track = trackFromScenario(scenario());
    const before = cloneTrack(track);
    runSimulator(track);
    expect(track).toEqual(before);
  });

  it("15. invalid Start/Goal graceful failure", () => {
    const track = createEmptyTrack("empty", "sc", "w", "Empty");
    const result = runSimulator(track);
    expect(result.solverOutcome).toBe("structural_error");
    expect(result.structuralMessage).toBeTruthy();
    expect(result.optimal.minMoves).toBeNull();
  });

  it("search limit ≠ unsolvable", () => {
    const s = scenario({ goal: { layer: 7, row: 3, col: 5 } });
    const sol = computeOptimalSolution(newGame(s), 2, 5, { countAlternativePaths: false });
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(true);
  });

  it("invalidates fingerprint when board changes", () => {
    let track = trackFromScenario(scenario());
    const a = trackSolverFingerprint(track);
    track = toggleMissingHex(track, { layer: 1, row: 0, col: 0 }, true);
    const b = trackSolverFingerprint(track);
    expect(a).not.toBe(b);
    track = setRowMovement(track, 1, 3, { direction: "LEFT", amount: 2 });
    expect(trackSolverFingerprint(track)).not.toBe(b);
  });

  it("runSimulator reports solvable for adjacent start/goal", () => {
    const track = trackFromScenario(
      scenario({
        start: { layer: 1, row: 3, col: 1 },
        goal: { layer: 1, row: 3, col: 2 },
      })
    );
    const r = runSimulator(track);
    expect(r.solverOutcome).toBe("solvable");
    expect(r.optimal.minMoves).toBe(1);
    expect(r.summary.optimalPathCount).toBe(r.optimal.alternativeOptimalCount);
  });

  it("portal destination on moving layer", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 2, row: 3, col: 4 },
      transitions: [
        { type: "UP", from: { layer: 1, row: 3, col: 2 }, to: { layer: 2, row: 3, col: 2 } },
      ],
      movement: {
        ...noneMovement(),
        "2": {
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
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).not.toBeNull();
    expect(sol.replay.some((r) => r.portalType === "UP")).toBe(true);
  });

  it("chained UP portals", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 3, row: 3, col: 1 },
      transitions: [
        { type: "UP", from: { layer: 1, row: 3, col: 2 }, to: { layer: 2, row: 3, col: 1 } },
        { type: "UP", from: { layer: 2, row: 3, col: 2 }, to: { layer: 3, row: 3, col: 1 } },
      ],
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).toBe(2);
    expect(sol.replay.filter((r) => r.portalType === "UP")).toHaveLength(2);
  });

  it("move count matches production attemptMove turns", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    const st = newGame(s);
    let turns = 0;
    for (const target of sol.pathHexIds) {
      const r = attemptMove(st, target);
      expect(r.ok).toBe(true);
      turns++;
    }
    expect(turns).toBe(sol.minMoves);
    expect(st.playerHexId).toBe(posId(s.goal));
  });
});
