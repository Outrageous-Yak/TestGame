/**
 * Stage 1A — diagnostic probes for Simulator/Solver dead-end / isolation failure class.
 * These tests document behaviour before/alongside hardening; they must not crash.
 */
import { describe, expect, it } from "vitest";
import { newGame } from "./api";
import type { Scenario } from "./types";
import { computeOptimalSolution, solverStateKey } from "./trackAnalysis";
import { snapshotStateLite, restoreStateLite } from "./snapshot";
import { attemptMove } from "./rules";
import { neighborIdsSameLayer } from "./neighbors";
import { analyzeStranding } from "./strandingAnalysis";
import { revealHex, inBounds, ROW_LENS } from "./board";
import { runSimulator } from "../studio/trackPlanner/simulation/runSimulator";
import { createEmptyTrack } from "../studio/trackPlanner/types";
import { scenarioJsonToTrack } from "../studio/trackPlanner/catalog";
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
    id: "diag_dead_end",
    name: "Diag Dead End",
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
    const len = ROW_LENS[row]!;
    for (let col = 0; col < len; col++) {
      out.push({ layer, row, col });
    }
  }
  return out;
}

/** Mark every neighbor slot of `hexId` missing (keeps start/goal + extras). */
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

function countSuccessfulMoves(stateScenario: Scenario, fromState = newGame(stateScenario)): number {
  let success = 0;
  for (const id of neighborIdsSameLayer(fromState, fromState.playerHexId)) {
    const probe = newGame(stateScenario);
    // Replay to same player position/turn if needed by reconstructing via snapshot
    const dto = snapshotStateLite(fromState);
    const st = restoreStateLite(probe, dto);
    if (attemptMove(st, id).ok) success++;
  }
  return success;
}

describe("1A diagnosis — zero-outgoing / isolation", () => {
  it("D1: isolated present start hex → zero successful moves, solver no crash, unsolvable", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({
      ...base,
      missing: missingNeighborsOf(base, "L1-R3-C3"),
    });
    const state = newGame(s);
    expect(countSuccessfulMoves(s, state)).toBe(0);
    const sol = computeOptimalSolution(state);
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(false);
    expect(sol.pathHexIds).toEqual([]);
  });

  it("D2: disconnected start/goal islands → no crash, unsolvable", () => {
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
    const sol = computeOptimalSolution(newGame(s));
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(false);
  });

  it("D3: row movement after legal move — solver/stranding tolerate isolation class", () => {
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
    const before = neighborIdsSameLayer(state, state.playerHexId).filter((id) => {
      const h = state.hexesById.get(id);
      return h && !h.missing && !h.blocked;
    });
    expect(before.length).toBeGreaterThan(0);
    expect(attemptMove(state, before[0]!).ok).toBe(true);
    // After move+shift, may have zero successful exits — still valid GameState
    expect(countSuccessfulMoves(s, state)).toBeGreaterThanOrEqual(0);

    const sol = computeOptimalSolution(newGame(s));
    expect(sol.stats.exploredNodes).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(sol.pathHexIds)).toBe(true);
    const strand = analyzeStranding(newGame(s));
    expect(["safe", "optional_stranding", "unsolvable", "search_limit", "structural_error"]).toContain(
      strand.outcome
    );
  });

  it("D4: goal with zero outgoing neighbors is still SUCCESS for solver", () => {
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
  });

  it("D5: dead-end branch + alternate viable path still finds Goal", () => {
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
    expect(sol.minMoves!).toBeGreaterThanOrEqual(1);
  });

  it("D6: search limit returns aborted, not conflated crash", () => {
    const sol = computeOptimalSolution(newGame(scenario()), 80, 1);
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(true);
  });

  it("D7: unreachable portal does not crash solver", () => {
    const base = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 2 },
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 0, col: 0 },
          to: { layer: 2, row: 0, col: 0 },
        },
      ],
    });
    const s = scenario({
      ...base,
      missing: missingNeighborsOf(base, "L1-R0-C0"),
    });
    const sol = computeOptimalSolution(newGame(s));
    expect(sol.minMoves).toBe(1);
  });

  it("D8: analysisSafe lite restore — revealHex does not mutate shared hex flags", () => {
    const s = scenario({
      revealOnEnterGuaranteedUp: true,
      transitions: [
        { type: "UP", from: { layer: 1, row: 3, col: 4 }, to: { layer: 2, row: 3, col: 3 } },
        { type: "UP", from: { layer: 2, row: 0, col: 0 }, to: { layer: 3, row: 0, col: 0 } },
      ],
      goal: { layer: 2, row: 3, col: 3 },
    });
    const base = newGame(s);
    const dto = snapshotStateLite(base);
    const a = restoreStateLite(base, dto);
    const b = restoreStateLite(base, dto);
    expect(a.analysisSafe).toBe(true);
    const before = b.hexesById.get(b.playerHexId)!.revealed;
    revealHex(a, a.playerHexId);
    expect(b.hexesById.get(b.playerHexId)!.revealed).toBe(before);
    const sol = computeOptimalSolution(base);
    expect(sol.stats.exploredNodes).toBeGreaterThanOrEqual(0);
  });

  it("D9: planner runSimulator on isolated track returns unsolvable safely", () => {
    const baseSc = scenario({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
    });
    const s = scenario({
      ...baseSc,
      missing: missingNeighborsOf(baseSc, "L1-R3-C3"),
    });
    const track = scenarioJsonToTrack(
      createEmptyTrack("diag_iso", "citadel_path", "forgotten_citadel", "Diag Iso"),
      s
    );
    const result = runSimulator(track);
    expect(result.solverOutcome).toBe("unsolvable");
    expect(result.pathSteps).toEqual([]);
    expect(result.optimal.minMoves).toBeNull();
  });
});

describe("1A diagnosis — runtime/solver parity on short sequence", () => {
  it("D10: after each successful move, runtime state matches solver transition model key", () => {
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
    const runtime = newGame(s);
    const solverBase = newGame(s);
    let dto = snapshotStateLite(solverBase);

    for (const target of ["L1-R3-C2", "L1-R3-C3", "L1-R3-C4"]) {
      expect(solverStateKey(dto)).toBe(solverStateKey(snapshotStateLite(runtime)));
      expect(attemptMove(runtime, target).ok).toBe(true);
      const st = restoreStateLite(solverBase, dto);
      expect(attemptMove(st, target).ok).toBe(true);
      dto = snapshotStateLite(st);
      expect(runtime.playerHexId).toBe(st.playerHexId);
      expect(runtime.turn).toBe(st.turn);
      expect(solverStateKey(snapshotStateLite(runtime))).toBe(solverStateKey(dto));
    }
  });
});
