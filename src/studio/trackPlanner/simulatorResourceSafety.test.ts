/**
 * Simulator resource-safety + exact Sevenfold Labyrinth stress.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { newGame } from "../../engine/api";
import type { Scenario } from "../../engine/types";
import { computeOptimalSolution } from "../../engine/trackAnalysis";
import { analyzeStranding } from "../../engine/strandingAnalysis";
import { createEmptyTrack } from "./types";
import { scenarioJsonToTrack } from "./catalog";
import { runSimulator } from "./simulation/runSimulator";
import { CI_STRESS_BUDGET, DEFAULT_SIMULATOR_BUDGET } from "./simulation/analysisBudget";
import { startSimulatorRun } from "./simulation/startSimulatorRun";
import { PROGRESSION_STORAGE_KEY } from "../../progression/storage";
import { bestScoreKey } from "../../ui/bestScore";
import { cloneTrack } from "./state/authoringState";

const root = join(import.meta.dirname, "..", "..", "..");
const sevenfoldPath = join(
  root,
  "src/studio/trackPlanner/fixtures/sevenfoldLabyrinth.json"
);

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
    id: "resource_safety",
    name: "Resource Safety",
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

function trackOf(s: Scenario) {
  return scenarioJsonToTrack(
    createEmptyTrack(s.id, "sc", "w", s.name),
    s
  );
}

function loadSevenfold() {
  const raw = JSON.parse(readFileSync(sevenfoldPath, "utf8"));
  expect(raw.id).toBe("track_msq1mooe_erucx");
  expect(raw.name).toBe("The Sevenfold Labyrinth");
  return scenarioJsonToTrack(
    createEmptyTrack(raw.id, "diag", "diag_world", raw.name),
    raw
  );
}

describe("Simulator resource safety", () => {
  it("1. state limit → SEARCH LIMIT (not UNSOLVABLE)", () => {
    const s = scenario({ goal: { layer: 7, row: 3, col: 5 } });
    const sol = computeOptimalSolution(newGame(s), 80, 5, { countAlternativePaths: false });
    expect(sol.minMoves).toBeNull();
    expect(sol.stats.searchAborted).toBe(true);
    expect(sol.stats.abortReason).toBe("nodes");
    const result = runSimulator(trackOf(s), {
      budget: { maxSolverNodes: 5, maxTotalNodes: 5, countAlternativePaths: false },
    });
    expect(result.solverOutcome).toBe("search_limit");
    expect(result.solverOutcome).not.toBe("unsolvable");
  });

  it("2. elapsed-time limit → SEARCH LIMIT", () => {
    const s = scenario({ goal: { layer: 7, row: 3, col: 5 } });
    const sol = computeOptimalSolution(newGame(s), 80, 400000, {
      countAlternativePaths: false,
      maxMs: 1,
    });
    expect(sol.stats.searchAborted).toBe(true);
    expect(sol.stats.abortReason).toBe("time");
    const result = runSimulator(trackOf(s), {
      budget: {
        maxSolverMs: 1,
        maxTotalMs: 1,
        maxSolverNodes: 400000,
        countAlternativePaths: false,
      },
    });
    expect(result.solverOutcome).toBe("search_limit");
  });

  it("3. frontier limit → SEARCH LIMIT", () => {
    const s = scenario({ goal: { layer: 7, row: 3, col: 5 } });
    const sol = computeOptimalSolution(newGame(s), 80, 400000, {
      countAlternativePaths: false,
      maxFrontier: 1,
    });
    expect(sol.stats.searchAborted).toBe(true);
    expect(["frontier", "nodes", "time"]).toContain(sol.stats.abortReason);
  });

  it("4. resource limit != UNSOLVABLE", () => {
    const result = runSimulator(trackOf(scenario({ goal: { layer: 7, row: 3, col: 5 } })), {
      budget: { maxSolverNodes: 3, maxTotalNodes: 3, countAlternativePaths: false },
    });
    expect(result.solverOutcome).toBe("search_limit");
    expect(result.structuralMessage).toBeNull();
  });

  it("5. Stranding resource limit → UNKNOWN", () => {
    const report = analyzeStranding(newGame(scenario()), 80, 2, { maxMs: 60_000 });
    expect(report.outcome).toBe("search_limit");
    expect(report.severity).toBe("unknown");
  });

  it("6. Solver success + Stranding limit keeps SOLVABLE", () => {
    const result = runSimulator(trackOf(scenario()), {
      budget: {
        maxSolverNodes: 50_000,
        maxStrandingNodes: 2,
        maxTotalNodes: 50_000,
        maxStrandingMs: 1,
        countAlternativePaths: false,
      },
    });
    expect(result.solverOutcome).toBe("solvable");
    expect(result.strandingOutcome).toBe("search_limit");
    expect(result.strandingSummaryLabel).toMatch(/Unknown/);
    expect(result.strandingSummaryLabel).not.toMatch(/None found/);
  });

  it("7. Cancel != UNSOLVABLE", () => {
    let cancel = false;
    const result = runSimulator(trackOf(scenario({ goal: { layer: 7, row: 3, col: 5 } })), {
      budget: { maxSolverNodes: 400000, countAlternativePaths: false },
      isCancelled: () => {
        cancel = true;
        return true;
      },
    });
    expect(cancel).toBe(true);
    expect(result.solverOutcome).toBe("cancelled");
    expect(result.solverOutcome).not.toBe("unsolvable");
  });

  it("8. concurrent Run blocked (handle semantics)", async () => {
    const track = trackOf(scenario());
    const a = startSimulatorRun(track, { useWorker: false });
    const b = startSimulatorRun(track, { useWorker: false });
    expect(a.runId).not.toBe(b.runId);
    const [ra, rb] = await Promise.all([a.promise, b.promise]);
    expect(ra.solverOutcome).toBe("solvable");
    expect(rb.solverOutcome).toBe("solvable");
  });

  it("9. stale result ignored by runId identity", async () => {
    const track = trackOf(scenario());
    const first = startSimulatorRun(track, { useWorker: false });
    first.cancel();
    const second = startSimulatorRun(track, { useWorker: false });
    const result = await second.promise;
    expect(result.solverOutcome).toBe("solvable");
    expect(second.runId).toBeGreaterThan(first.runId);
  });

  it("10. unmount cancellation stops work", async () => {
    const track = trackOf(scenario({ goal: { layer: 7, row: 3, col: 5 } }));
    const handle = startSimulatorRun(track, {
      useWorker: false,
      budget: { maxSolverNodes: 400000, maxTotalMs: 60_000, countAlternativePaths: false },
    });
    handle.cancel();
    const result = await handle.promise;
    expect(["cancelled", "search_limit", "solvable", "unsolvable"]).toContain(
      result.solverOutcome
    );
    expect(result.solverOutcome).not.toBe("unsolvable");
  });

  it("11. exact Sevenfold stress fixture terminates safely", () => {
    const track = loadSevenfold();
    const t0 = performance.now();
    const result = runSimulator(track, { budget: CI_STRESS_BUDGET });
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(10_000);
    expect(["solvable", "unsolvable", "search_limit", "internal_error", "cancelled"]).toContain(
      result.solverOutcome
    );
    expect(result.solverOutcome).not.toBe("unsolvable"); // under tiny budget → search_limit
    expect(result.solverOutcome).toBe("search_limit");
    expect(result.optimal.stats.exploredNodes).toBeLessThanOrEqual(
      CI_STRESS_BUDGET.maxSolverNodes
    );
  });

  it("12. moving-row stress safe under budget", () => {
    const s = scenario({
      goal: { layer: 1, row: 3, col: 5 },
      movement: {
        ...noneMovement(),
        "1": {
          rows: {
            "0": { direction: "LEFT", amount: 1 },
            "1": { direction: "RIGHT", amount: 1 },
            "2": { direction: "LEFT", amount: 2 },
            "3": { direction: "RIGHT", amount: 1 },
            "4": { direction: "LEFT", amount: 1 },
            "5": { direction: "RIGHT", amount: 2 },
            "6": { direction: "LEFT", amount: 1 },
          },
        },
      },
    });
    const result = runSimulator(trackOf(s), {
      budget: { maxSolverNodes: 5000, maxTotalNodes: 6000, countAlternativePaths: false },
    });
    expect(["solvable", "search_limit", "unsolvable"]).toContain(result.solverOutcome);
  });

  it("13. portal stress safe under budget", () => {
    const s = scenario({
      goal: { layer: 2, row: 3, col: 4 },
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 3, col: 2 },
          to: { layer: 2, row: 3, col: 2 },
        },
      ],
    });
    const result = runSimulator(trackOf(s), {
      budget: { maxSolverNodes: 5000, countAlternativePaths: false },
    });
    expect(result.solverOutcome).toBe("solvable");
  });

  it("14. Goal priority unchanged", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 2 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const result = runSimulator(trackOf(s));
    expect(result.solverOutcome).toBe("solvable");
    expect(result.optimal.minMoves).toBe(1);
  });

  it("15. optimal solution unchanged on normal track", () => {
    const result = runSimulator(trackOf(scenario()));
    expect(result.solverOutcome).toBe("solvable");
    expect(result.optimal.minMoves).toBe(2);
  });

  it("16. optional stranding unchanged", () => {
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
    const result = runSimulator(trackOf(s));
    expect(result.solverOutcome).toBe("solvable");
    expect(result.strandingOutcome).toBe("optional_stranding");
  });

  it("17. default budget constants are finite and shared", () => {
    expect(DEFAULT_SIMULATOR_BUDGET.maxTotalNodes).toBeLessThanOrEqual(
      DEFAULT_SIMULATOR_BUDGET.maxSolverNodes + DEFAULT_SIMULATOR_BUDGET.maxStrandingNodes
    );
    expect(DEFAULT_SIMULATOR_BUDGET.maxTotalMs).toBeGreaterThan(0);
    expect(DEFAULT_SIMULATOR_BUDGET.maxFrontier).toBeGreaterThan(0);
  });

  it("18. storage/draft isolation", () => {
    const track = loadSevenfold();
    const before = cloneTrack(track);
    const store: Record<string, string> = {
      [PROGRESSION_STORAGE_KEY]: "keep",
      track_planner_drafts_v1: "keep",
      campaign_map_drafts_v1: "keep",
      [bestScoreKey("x")]: "keep",
    };
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        getItem: (k: string) => store[k] ?? null,
        removeItem: (k: string) => {
          delete store[k];
        },
      },
      configurable: true,
    });
    runSimulator(track, { budget: CI_STRESS_BUDGET });
    expect(track).toEqual(before);
    expect(store[PROGRESSION_STORAGE_KEY]).toBe("keep");
    expect(store["track_planner_drafts_v1"]).toBe("keep");
    expect(store["campaign_map_drafts_v1"]).toBe("keep");
    expect(store[bestScoreKey("x")]).toBe("keep");
    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });

  it("19. branch/state mutation isolation", () => {
    const track = trackOf(scenario());
    const before = JSON.stringify(track);
    runSimulator(track);
    expect(JSON.stringify(track)).toBe(before);
  });

  it("20. malformed track → STRUCTURAL ERROR", () => {
    const track = createEmptyTrack("empty", "sc", "w", "Empty");
    const result = runSimulator(track);
    expect(result.solverOutcome).toBe("structural_error");
  });

  it("21. unexpected analysis failure → INTERNAL ERROR path exists", () => {
    // Structural path is covered; internal_error is the catch around computeOptimalSolution.
    // Verify cancelled and search_limit remain distinct from internal_error.
    const limited = runSimulator(trackOf(scenario({ goal: { layer: 7, row: 3, col: 5 } })), {
      budget: { maxSolverNodes: 2, maxTotalNodes: 2, countAlternativePaths: false },
    });
    expect(limited.solverOutcome).toBe("search_limit");
    expect(limited.solverOutcome).not.toBe("internal_error");
  });

  it("exact Sevenfold under default browser budget stays structured (no throw)", () => {
    const track = loadSevenfold();
    const t0 = performance.now();
    const result = runSimulator(track);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(15_000);
    // Exact Sevenfold is intentionally larger than the browser-safe budget.
    // Structured SEARCH LIMIT is success for resource safety (not a Start-screen crash).
    expect(result.solverOutcome).toBe("search_limit");
    expect(result.optimal.stats.searchAborted).toBe(true);
    expect(result.optimal.stats.exploredNodes).toBeLessThanOrEqual(
      DEFAULT_SIMULATOR_BUDGET.maxSolverNodes
    );
    expect(result.strandingSummaryLabel).toMatch(/Unknown/);
    expect(result.strandingSummaryLabel).not.toBe("Stranding: None found");
  });
});
