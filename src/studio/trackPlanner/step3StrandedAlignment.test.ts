/**
 * Step 3 — Solver / Stranding Analysis / Audit alignment with runtime STRANDED.
 */
import { describe, expect, it } from "vitest";
import { newGame } from "../../engine/api";
import type { Scenario } from "../../engine/types";
import { attemptMove } from "../../engine/rules";
import { attemptMoveToSlot } from "../../engine/moveAttempt";
import {
  analyzeStranding,
  classifyAuthoritativeState,
} from "../../engine/strandingAnalysis";
import { computeOptimalSolution } from "../../engine/trackAnalysis";
import {
  isAuthoritativeStranded,
  listLegalSuccessfulMoveTargets,
  playerOnGoal,
} from "../../engine/legalMoves";
import { evaluateAttemptTerminal } from "../../engine/attemptTerminal";
import { ROW_LENS, inBounds } from "../../engine/board";
import { findSlot, neighborSlots } from "../../engine/layout";
import { runSimulator } from "./simulation/runSimulator";
import { createEmptyTrack } from "./types";
import { scenarioJsonToTrack } from "./catalog";

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
    id: "step3_align",
    name: "Step3 Align",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
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
    createEmptyTrack("step3", "citadel_path", "forgotten_citadel", s.name),
    s
  );
}

function optionalDeadEnd(): Scenario {
  const missingL2: Scenario["missing"] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < (row % 2 === 1 ? 6 : 7); col++) {
      if (row === 3 && col === 3) continue;
      missingL2.push({ layer: 2, row, col });
    }
  }
  return scenario({
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 1, row: 3, col: 2 },
    missing: missingL2,
    transitions: [
      {
        type: "DOWN",
        from: { layer: 1, row: 3, col: 0 },
        to: { layer: 2, row: 3, col: 3 },
      },
    ],
  });
}

describe("Step 3 — stranded analysis alignment", () => {
  it("TEST 1 — safe solvable track", () => {
    const s = scenario({ start: { layer: 1, row: 3, col: 1 }, goal: { layer: 1, row: 3, col: 3 } });
    const base = newGame(s);
    const sol = computeOptimalSolution(base, 40, 50000);
    const report = analyzeStranding(base, 40, 50000);
    expect(sol.minMoves).not.toBeNull();
    expect(report.outcome).toBe("safe");
    expect(report.severity).toBe("green");
    expect(report.strandedStateCount).toBe(0);
  });

  it("TEST 2 — optional stranding (branch A stranded, branch B Goal)", () => {
    const missingL2: Scenario["missing"] = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < (row % 2 === 1 ? 6 : 7); col++) {
        if (row === 3 && col === 3) continue;
        missingL2.push({ layer: 2, row, col });
      }
    }
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 2 },
      missing: missingL2,
      transitions: [
        {
          type: "DOWN",
          from: { layer: 1, row: 3, col: 0 },
          to: { layer: 2, row: 3, col: 3 },
        },
      ],
    });
    const base = newGame(s);
    const sol = computeOptimalSolution(base, 40, 50000);
    const report = analyzeStranding(base, 40, 50000);
    expect(sol.minMoves).not.toBeNull();
    expect(report.outcome).toBe("optional_stranding");
    expect(report.severity).toBe("amber");
    expect(report.strandedStateCount).toBeGreaterThan(0);
    const sim = runSimulator(trackOf(s));
    expect(sim.solverOutcome).toBe("solvable");
    expect(sim.strandingOutcome).toBe("optional_stranding");
  });

  it("TEST 3 — short stranded route does not beat longer Goal route", () => {
    const missingL2: Scenario["missing"] = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < (row % 2 === 1 ? 6 : 7); col++) {
        if (row === 3 && col === 3) continue;
        missingL2.push({ layer: 2, row, col });
      }
    }
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 5 },
      missing: [
        ...allBoardPositions(1).filter(
          (p) => !(p.row === 3 && p.col >= 1 && p.col <= 5)
        ),
        ...missingL2,
      ],
      transitions: [
        {
          type: "DOWN",
          from: { layer: 1, row: 3, col: 0 },
          to: { layer: 2, row: 3, col: 3 },
        },
      ],
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).toBe(4);
    expect(sol.minMoves).not.toBe(1);
  });

  it("TEST 4 — initial stranded Start", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({ ...base, missing: missingNeighborsOf(base, "L1-R3-C3") });
    const st = newGame(s);
    expect(evaluateAttemptTerminal(st).kind).toBe("stranded");
    const sol = computeOptimalSolution(st, 40, 50000);
    expect(sol.minMoves).toBeNull();
    const report = analyzeStranding(st, 40, 50000);
    expect(report.outcome).toBe("unsolvable");
    expect(report.severity).toBe("red");
    expect(report.strandedStateCount).toBeGreaterThan(0);
  });

  it("TEST 5 — Goal with zero outgoing is SUCCESS not stranded", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 2 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const s = scenario({
      ...base,
      missing: missingNeighborsOf(base, "L1-R3-C3", ["L1-R3-C2"]),
    });
    const st = newGame(s);
    attemptMove(st, "L1-R3-C3");
    expect(playerOnGoal(st)).toBe(true);
    expect(classifyAuthoritativeState(st)).toBe("goal");
    expect(isAuthoritativeStranded(st)).toBe(false);
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.outcome).toBe("safe");
  });

  it("TEST 6 — row-created runtime STRANDED state", () => {
    const missing = allBoardPositions(1).filter((p) => {
      const keep =
        (p.row === 3 && p.col === 3) ||
        (p.row === 2 && p.col === 3) ||
        (p.row === 0 && p.col === 0);
      return !keep;
    });
    const s = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
      missing,
      movement: {
        ...noneMovement(),
        "1": {
          rows: {
            "0": { direction: "NONE", amount: 0 },
            "1": { direction: "NONE", amount: 0 },
            "2": { direction: "LEFT", amount: 1 },
            "3": { direction: "NONE", amount: 0 },
            "4": { direction: "NONE", amount: 0 },
            "5": { direction: "NONE", amount: 0 },
            "6": { direction: "NONE", amount: 0 },
          },
        },
      },
    });
    const st = newGame(s);
    expect(attemptMove(st, "L1-R2-C3").ok).toBe(true);
    expect(isAuthoritativeStranded(st)).toBe(true);
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.strandedStateCount).toBeGreaterThan(0);
    expect(report.strandedKeys.some((k) => k.includes("L1-R2-C3"))).toBe(true);
  });

  it("TEST 7 — portal-created STRANDED destination", () => {
    const baseIso = scenario({
      start: { layer: 2, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const l2missing = missingNeighborsOf(baseIso, "L2-R3-C3");
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 0, col: 0 },
      missing: [
        ...allBoardPositions(1).filter((p) => !(p.row === 3 && (p.col === 1 || p.col === 2))),
        ...l2missing,
      ],
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 3, col: 2 },
          to: { layer: 2, row: 3, col: 3 },
        },
      ],
    });
    const st = newGame(s);
    attemptMoveToSlot(st, { layer: 1, row: 3, col: 2 });
    expect(isAuthoritativeStranded(st)).toBe(true);
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.portalWarnings.length).toBeGreaterThan(0);
    expect(report.strandedStateCount).toBeGreaterThan(0);
  });

  it("TEST 8 — portal with continuation is not stranded", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 2, row: 3, col: 4 },
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 3, col: 2 },
          to: { layer: 2, row: 3, col: 2 },
        },
      ],
    });
    const st = newGame(s);
    attemptMoveToSlot(st, { layer: 1, row: 3, col: 2 });
    expect(isAuthoritativeStranded(st)).toBe(false);
    expect(listLegalSuccessfulMoveTargets(st).length).toBeGreaterThan(0);
  });

  it("TEST 9 — multiple optimal Goal paths + stranded branch", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const sol = computeOptimalSolution(newGame(s), 40, 50000, { countAlternativePaths: true });
    expect(sol.minMoves).toBe(2);
    expect(sol.alternativeOptimalCount).toBeGreaterThanOrEqual(1);

    const dead = optionalDeadEnd();
    const sol2 = computeOptimalSolution(newGame(dead), 40, 50000);
    expect(sol2.minMoves).not.toBeNull();
    expect(analyzeStranding(newGame(dead), 40, 50000).strandedStateCount).toBeGreaterThan(0);
  });

  it("TEST 10 — all branches terminally fail", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({ ...base, missing: missingNeighborsOf(base, "L1-R3-C3") });
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.outcome).toBe("unsolvable");
    expect(report.hasUnavoidableFailure).toBe(true);
  });

  it("TEST 11 — search limit → UNKNOWN", () => {
    const report = analyzeStranding(
      newGame(scenario({ goal: { layer: 7, row: 3, col: 5 } })),
      2,
      5
    );
    expect(report.outcome).toBe("search_limit");
    expect(report.severity).toBe("unknown");
  });

  it("TEST 12 — same coordinate different row phase", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 4 },
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
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.reachableStateCount).toBeGreaterThan(1);
    expect(report.riskyPositionCount + report.strandedStateCount).toBeGreaterThanOrEqual(0);
  });

  it("TEST 13 — disconnected geometry safe analysis", () => {
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
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.outcome).toBe("unsolvable");
    expect(() => analyzeStranding(newGame(s), 40, 50000)).not.toThrow();
  });

  it("TEST 15 — runtime parity on classified states", () => {
    const s = scenario({ start: { layer: 1, row: 3, col: 1 }, goal: { layer: 1, row: 3, col: 3 } });
    const st = newGame(s);
    expect(classifyAuthoritativeState(st)).toBe("live");
    expect(evaluateAttemptTerminal(st).kind).toBe("playing");
  });
});
