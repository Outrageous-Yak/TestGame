/**
 * Stage 1B — Simulator/Solver dead-end hardening regressions.
 */
import { describe, expect, it } from "vitest";
import { newGame } from "./api";
import type { Scenario } from "./types";
import { computeOptimalSolution } from "./trackAnalysis";
import { revealHex } from "./board";
import { restoreStateLite, snapshotStateLite } from "./snapshot";
import { attemptMove } from "./rules";
import { ROW_LENS } from "./board";
import {
  hasLegalSuccessfulMove,
  isAuthoritativeStranded,
  listLegalSuccessfulMoveTargets,
  playerOnGoal,
} from "./legalMoves";
import { runSimulator } from "../studio/trackPlanner/simulation/runSimulator";
import { createEmptyTrack } from "../studio/trackPlanner/types";
import { scenarioJsonToTrack } from "../studio/trackPlanner/catalog";
import { inBounds } from "./board";
import { findSlot, neighborSlots } from "./layout";

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
    id: "harden_dead_end",
    name: "Harden Dead End",
    layers: 7,
    start: { layer: 1, row: 3, col: 3 },
    goal: { layer: 1, row: 3, col: 5 },
    missing: [],
    blocked: [],
    movement: noneMovement(),
    transitions: [],
    revealOnEnterGuaranteedUp: false,
    ...overrides,
  };
}

function allBoardPositions(layer = 1): NonNullable<Scenario["missing"]> {
  const out: NonNullable<Scenario["missing"]> = [];
  for (let row = 0; row < ROW_LENS.length; row++) {
    for (let col = 0; col < ROW_LENS[row]!; col++) {
      out.push({ layer, row, col });
    }
  }
  return out;
}

function missingNeighborsOf(
  base: Scenario,
  hexId: string,
  extraKeep: string[] = []
): NonNullable<Scenario["missing"]> {
  const st = newGame({ ...base, missing: [] });
  const hex = st.hexesById.get(hexId);
  if (!hex) return [];
  const keep = new Set<string>([
    hexId,
    `L${base.start.layer}-R${base.start.row}-C${base.start.col}`,
    `L${base.goal.layer}-R${base.goal.row}-C${base.goal.col}`,
    ...extraKeep,
  ]);
  const slot = findSlot(st, hex.pos.layer, hexId);
  if (!slot) return [];
  const missing: NonNullable<Scenario["missing"]> = [];
  for (const s of neighborSlots(slot.row, slot.col)) {
    const p = { layer: hex.pos.layer, row: s.r, col: s.c };
    if (!inBounds(p, base.layers)) continue;
    const id = `L${p.layer}-R${p.row}-C${p.col}`;
    if (keep.has(id)) continue;
    missing.push(p);
  }
  return missing;
}

function trackOf(s: Scenario) {
  return scenarioJsonToTrack(
    createEmptyTrack("harden", "citadel_path", "forgotten_citadel", s.name),
    s
  );
}

describe("1B hardening — zero-outgoing / isolation", () => {
  it("1. isolated present hex → zero transitions, no crash, unsolvable", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({ ...base, missing: missingNeighborsOf(base, "L1-R3-C3") });
    const state = newGame(s);
    expect(listLegalSuccessfulMoveTargets(state)).toEqual([]);
    expect(hasLegalSuccessfulMove(state)).toBe(false);
    expect(isAuthoritativeStranded(state)).toBe(true);
    const sol = computeOptimalSolution(state);
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(false);
    expect(runSimulator(trackOf(s)).solverOutcome).toBe("unsolvable");
  });

  it("2. disconnected geometry → safe analysis", () => {
    const missing = allBoardPositions(1).filter((p) => {
      const keepStart = p.row === 3 && (p.col === 0 || p.col === 1);
      const keepGoal = p.row === 3 && (p.col === 4 || p.col === 5);
      return !keepStart && !keepGoal;
    });
    const s = scenario({
      start: { layer: 1, row: 3, col: 0 },
      goal: { layer: 1, row: 3, col: 5 },
      missing,
    });
    expect(computeOptimalSolution(newGame(s)).minMoves).toBeNull();
    expect(runSimulator(trackOf(s)).solverOutcome).toBe("unsolvable");
  });

  it("3. row movement creates isolation class — resulting state remains valid", () => {
    const missing = allBoardPositions(1).filter((p) => {
      const keep =
        (p.row === 3 && (p.col === 1 || p.col === 2)) || (p.row === 5 && p.col === 1);
      return !keep;
    });
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 5, col: 1 },
      missing,
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
    const state = newGame(s);
    const targets = listLegalSuccessfulMoveTargets(state);
    expect(targets.length).toBeGreaterThan(0);
    expect(attemptMove(state, targets[0]!).ok).toBe(true);
    // Post-move state is still a valid GameState (may or may not be stranded).
    expect(state.hexesById.has(state.playerHexId)).toBe(true);
    expect(() => computeOptimalSolution(newGame(s))).not.toThrow();
  });

  it("4. dead-end branch + viable alternate → still finds Goal", () => {
    const missing = allBoardPositions(1).filter((p) => {
      const onPath =
        (p.row === 3 && (p.col === 2 || p.col === 3 || p.col === 4 || p.col === 5)) ||
        (p.row === 2 && p.col === 2);
      return !onPath;
    });
    const s = scenario({
      start: { layer: 1, row: 3, col: 2 },
      goal: { layer: 1, row: 3, col: 5 },
      missing,
    });
    const sol = computeOptimalSolution(newGame(s));
    expect(sol.minMoves).not.toBeNull();
  });

  it("5. all reachable branches dead-end → NO SOLUTION (exhaustive)", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({ ...base, missing: missingNeighborsOf(base, "L1-R3-C3") });
    const sol = computeOptimalSolution(newGame(s));
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(false);
    expect(runSimulator(trackOf(s)).solverOutcome).toBe("unsolvable");
  });

  it("6. search limit → UNKNOWN/LIMIT, not NO SOLUTION", () => {
    const sol = computeOptimalSolution(newGame(scenario()), 80, 1);
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(true);
    // runSimulator uses large caps; exercise mapping via aborted flag semantics
    expect(sol.stats.searchAborted && sol.minMoves === null).toBe(true);
  });

  it("7. unreachable portal → no crash", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 2 },
      transitions: [
        { type: "UP", from: { layer: 1, row: 0, col: 0 }, to: { layer: 2, row: 0, col: 0 } },
      ],
    });
    const s = scenario({ ...base, missing: missingNeighborsOf(base, "L1-R0-C0") });
    expect(computeOptimalSolution(newGame(s)).minMoves).toBe(1);
  });

  it("8. analysisSafe lite restore — revealHex does not mutate shared hex flags", () => {
    const base = newGame(scenario());
    const dto = snapshotStateLite(base);
    const a = restoreStateLite(base, dto);
    const b = restoreStateLite(base, dto);
    expect(a.analysisSafe).toBe(true);
    const before = b.hexesById.get(b.playerHexId)!.revealed;
    revealHex(a, a.playerHexId);
    expect(b.hexesById.get(b.playerHexId)!.revealed).toBe(before);
  });

  it("9. existing static solvable track — same optimal count", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000, { countAlternativePaths: true });
    expect(sol.minMoves).toBe(2);
    expect(sol.pathHexIds).toEqual(["L1-R3-C2", "L1-R3-C3"]);
  });

  it("10. existing moving-row solvable track — solvable", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 3 },
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
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).not.toBeNull();
    expect(sol.stats.searchAborted).toBe(false);
  });

  it("11. Goal with zero ordinary outgoing moves → SUCCESS not stranded", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 2 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const s = scenario({
      ...base,
      missing: missingNeighborsOf(base, "L1-R3-C3", ["L1-R3-C2"]),
    });
    const sol = computeOptimalSolution(newGame(s));
    expect(sol.minMoves).toBe(1);
    const onGoal = newGame(s);
    attemptMove(onGoal, "L1-R3-C3");
    expect(playerOnGoal(onGoal)).toBe(true);
    expect(isAuthoritativeStranded(onGoal)).toBe(false);
  });

  it("12. multiple valid solution paths — optimal preserved", () => {
    // Open board: many paths; optimal remains Manhattan-ish along row.
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000, { countAlternativePaths: true });
    expect(sol.minMoves).toBe(2);
    expect(sol.hasMultipleOptimalPaths || sol.alternativeOptimalCount >= 1).toBe(true);
  });
});
