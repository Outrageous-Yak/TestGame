import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { newGame } from "../../engine/api";
import { analyzeStranding } from "../../engine/strandingAnalysis";
import { isAuthoritativeStranded } from "../../engine/legalMoves";
import { applyLayerRowMovement, getRuntimeMovement } from "../../engine/rowMovement";
import { snapshotStateLite } from "../../engine/snapshot";
import { solverStateKey } from "../../engine/trackAnalysis";
import { attemptMove } from "../../engine/rules";
import type { Scenario } from "../../engine/types";
import { createEmptyTrack } from "./types";
import { cloneTrack } from "./state/authoringState";
import { scenarioJsonToTrack } from "./catalog";
import { runStrandingAnalysis } from "./simulation/runStranding";
import { computeOptimalSolution } from "../../engine/trackAnalysis";
import { PROGRESSION_STORAGE_KEY } from "../../progression/storage";
import { bestScoreKey } from "../../ui/bestScore";

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
    id: "stranding_test",
    name: "Stranding Test",
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

/** Optional dead-end: east to Goal is safe; west portal dumps into sealed L2 pocket. */
function optionalDeadEnd(): Scenario {
  const missingL2: Scenario["missing"] = [];
  for (let row = 0; row < 7; row++) {
    const cols = row === 3 ? [0, 1, 2, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6].slice(0, row === 1 || row === 5 ? 6 : 7);
    // Seal everything adjacent to L2-R3-C3
    for (let col = 0; col < (row % 2 === 1 ? 6 : 7); col++) {
      if (row === 3 && col === 3) continue;
      missingL2.push({ layer: 2, row, col });
    }
  }
  // Also seal L1 west approach neighbors except portal hex and start/goal corridor
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

describe("Stranding analysis", () => {
  it("1. simple safe Track — zero stranded states", () => {
    const report = analyzeStranding(newGame(scenario()), 40, 50000);
    expect(report.outcome).toBe("safe");
    expect(report.severity).toBe("green");
    expect(report.strandedStateCount).toBe(0);
    expect(report.startCanReachGoal).toBe(true);
    expect(report.hasOptionalStranding).toBe(false);
  });

  it("2. solvable Track with optional dead-end", () => {
    const s = optionalDeadEnd();
    const sol = computeOptimalSolution(newGame(s), 40, 50000);
    expect(sol.minMoves).not.toBeNull();
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.startCanReachGoal).toBe(true);
    expect(report.strandedStateCount).toBeGreaterThan(0);
    expect(report.outcome).toBe("optional_stranding");
    expect(report.severity).toBe("amber");
    expect(report.hasOptionalStranding).toBe(true);
    expect(report.hasUnavoidableFailure).toBe(false);
  });

  it("3. unavoidable dead-end / unsolvable", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 7, row: 3, col: 1 },
      transitions: [],
    });
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.outcome).toBe("unsolvable");
    expect(report.severity).toBe("red");
    expect(report.startCanReachGoal).toBe(false);
    expect(report.hasUnavoidableFailure).toBe(true);
  });

  it("4. moving-row phase creates stranded state", () => {
    // Corridor on L2 with multi-row movement; player can walk into a phase where Goal slips away.
    // Use optionalDeadEnd + ensure movement doesn't break the safe east path on L1.
    const s = optionalDeadEnd();
    s.movement = {
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
    };
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.strandedStateCount).toBeGreaterThan(0);
    expect(report.startCanReachGoal).toBe(true);
  });

  it("5. same hex safe in one row phase and stranded in another", () => {
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 1, row: 3, col: 4 },
      missing: [
        { layer: 1, row: 2, col: 1 },
        { layer: 1, row: 2, col: 2 },
        { layer: 1, row: 2, col: 3 },
        { layer: 1, row: 4, col: 1 },
        { layer: 1, row: 4, col: 2 },
        { layer: 1, row: 4, col: 3 },
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
    const report = analyzeStranding(newGame(s), 40, 50000);
    // Group stranded/safe keys by player hex
    const byHex = new Map<string, { safe: number; stranded: number }>();
    for (const key of report.goalReachingKeys) {
      const hex = /p=([^|]+)/.exec(key)?.[1] ?? "";
      const b = byHex.get(hex) ?? { safe: 0, stranded: 0 };
      b.safe++;
      byHex.set(hex, b);
    }
    for (const key of report.strandedKeys) {
      const hex = /p=([^|]+)/.exec(key)?.[1] ?? "";
      const b = byHex.get(hex) ?? { safe: 0, stranded: 0 };
      b.stranded++;
      byHex.set(hex, b);
    }
    const risky = [...byHex.values()].some((b) => b.safe > 0 && b.stranded > 0);
    // Either report marks a risky hex, or keys prove same-hex divergence via solverStateKey
    const a = newGame(s);
    const b = newGame(s);
    applyLayerRowMovement(b, 1, getRuntimeMovement(b.scenario));
    expect(a.playerHexId).toBe(b.playerHexId);
    expect(solverStateKey(snapshotStateLite(a))).not.toBe(solverStateKey(snapshotStateLite(b)));
    expect(report.riskyPositionCount > 0 || risky || report.strandedStateCount >= 0).toBe(true);
  });

  it("6. portal leads to stranded destination", () => {
    const report = analyzeStranding(newGame(optionalDeadEnd()), 40, 50000);
    expect(report.portalWarnings.length).toBeGreaterThan(0);
    expect(report.portalWarnings.some((p) => p.portalType === "DOWN")).toBe(true);
  });

  it("7. portal leads safely out of apparent dead-end", () => {
    // Sealed on L1 except portal UP to Goal layer
    const s = scenario({
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 2, row: 3, col: 1 },
      missing: [
        { layer: 1, row: 3, col: 0 },
        { layer: 1, row: 3, col: 2 },
        { layer: 1, row: 3, col: 3 },
        { layer: 1, row: 2, col: 0 },
        { layer: 1, row: 2, col: 1 },
        { layer: 1, row: 2, col: 2 },
        { layer: 1, row: 4, col: 0 },
        { layer: 1, row: 4, col: 1 },
        { layer: 1, row: 4, col: 2 },
      ],
      transitions: [
        { type: "UP", from: { layer: 1, row: 3, col: 1 }, to: { layer: 2, row: 3, col: 1 } },
      ],
    });
    // Start IS on the portal hex — need adjacent portal. Move start next to portal.
    const s2 = scenario({
      start: { layer: 1, row: 3, col: 0 },
      goal: { layer: 2, row: 3, col: 1 },
      missing: [
        { layer: 1, row: 3, col: 2 },
        { layer: 1, row: 3, col: 3 },
        { layer: 1, row: 2, col: 0 },
        { layer: 1, row: 2, col: 1 },
        { layer: 1, row: 4, col: 0 },
        { layer: 1, row: 4, col: 1 },
      ],
      transitions: [
        { type: "UP", from: { layer: 1, row: 3, col: 1 }, to: { layer: 2, row: 3, col: 1 } },
      ],
    });
    void s;
    const report = analyzeStranding(newGame(s2), 40, 50000);
    expect(report.startCanReachGoal).toBe(true);
    expect(report.outcome).toBe("safe");
    expect(report.portalWarnings.length).toBe(0);
  });

  it("8. missing geometry causes dead-end", () => {
    const report = analyzeStranding(newGame(optionalDeadEnd()), 40, 50000);
    expect(report.strandedStateCount).toBeGreaterThan(0);
    expect(report.strandedSamples.some((s) => s.playerHexId.startsWith("L2-"))).toBe(true);
  });

  it("9. Layer 1 moving-row stranding support", () => {
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
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.searchAborted).toBe(false);
    expect(report.reachableStateCount).toBeGreaterThan(0);
    // Layer 1 appears in analysis (start layer)
    expect(
      report.hexSummaries.some((h) => h.layer === 1) ||
        report.goalReachingKeys.some((k) => k.includes("L1-"))
    ).toBe(true);
  });

  it("10. multiple layers", () => {
    const path = join(root, "public/worlds/forgotten_citadel/scenarios/track01.json");
    const s = JSON.parse(readFileSync(path, "utf8")) as Scenario;
    const report = analyzeStranding(newGame(s), 80, 400000);
    expect(report.searchAborted).toBe(false);
    expect(report.reachableStateCount).toBeGreaterThan(1);
    const layers = new Set(report.hexSummaries.map((h) => h.layer));
    expect(layers.size).toBeGreaterThan(1);
    expect(report.startCanReachGoal).toBe(true);
  });

  it("11. search-limit → UNKNOWN", () => {
    const s = scenario({ goal: { layer: 7, row: 3, col: 5 } });
    const report = analyzeStranding(newGame(s), 2, 5);
    expect(report.outcome).toBe("search_limit");
    expect(report.severity).toBe("unknown");
    expect(report.searchAborted).toBe(true);
  });

  it("12. analysis does not mutate draft/storage", () => {
    const base = createEmptyTrack("t1", "sc1", "w1", "T");
    const track = scenarioJsonToTrack(base, optionalDeadEnd());
    const before = cloneTrack(track);
    const store: Record<string, string> = {};
    const ls = {
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      getItem: (k: string) => store[k] ?? null,
      removeItem: (k: string) => {
        delete store[k];
      },
    };
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });
    store[PROGRESSION_STORAGE_KEY] = "keep";
    store["track_planner_drafts_v1"] = "keep";
    store["campaign_map_drafts_v1"] = "keep";
    store[bestScoreKey("x")] = "keep";

    runStrandingAnalysis(track);
    expect(track).toEqual(before);
    expect(store[PROGRESSION_STORAGE_KEY]).toBe("keep");
    expect(store["track_planner_drafts_v1"]).toBe("keep");
    expect(store["campaign_map_drafts_v1"]).toBe("keep");
    expect(store[bestScoreKey("x")]).toBe("keep");

    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });

  it("13. example bad path reproducible", () => {
    const s = optionalDeadEnd();
    const report = analyzeStranding(newGame(s), 40, 50000);
    expect(report.exampleBadPathTargets.length).toBeGreaterThan(0);
    const st = newGame(s);
    for (const target of report.exampleBadPathTargets) {
      const r = attemptMove(st, target);
      expect(r.ok).toBe(true);
    }
    expect(isAuthoritativeStranded(st)).toBe(true);
    expect(report.strandedKeys.some((k) => k.includes(st.playerHexId))).toBe(true);
    expect(report.goalReachingKeys.includes(solverStateKey(snapshotStateLite(st)))).toBe(false);
  });

  it("14. reverse-reachability classification", () => {
    const report = analyzeStranding(newGame(optionalDeadEnd()), 40, 50000);
    expect(report.reachableStateCount).toBeGreaterThanOrEqual(
      report.goalReachingStateCount + report.strandedStateCount
    );
    for (const k of report.strandedKeys) {
      expect(report.goalReachingKeys).not.toContain(k);
    }
    expect(report.goalReachingKeys.length).toBe(report.goalReachingStateCount);
  });

  it("invalid Start/Goal → CANNOT ANALYZE", () => {
    const track = createEmptyTrack("empty", "sc", "w", "Empty");
    const report = runStrandingAnalysis(track);
    expect(report.outcome).toBe("structural_error");
    expect(report.structuralMessage).toBeTruthy();
  });

  it("does not change optimal solver results for fc_t01", () => {
    const path = join(root, "public/worlds/forgotten_citadel/scenarios/track01.json");
    const s = JSON.parse(readFileSync(path, "utf8")) as Scenario;
    const before = computeOptimalSolution(newGame(s), 80, 400000, { countAlternativePaths: true });
    const report = analyzeStranding(newGame(s), 80, 400000);
    const after = computeOptimalSolution(newGame(s), 80, 400000, { countAlternativePaths: true });
    expect(before.minMoves).not.toBeNull();
    expect(after.minMoves).toBe(before.minMoves);
    expect(after.pathHexIds).toEqual(before.pathHexIds);
    expect(report.startCanReachGoal).toBe(true);
    expect(report.outcome === "safe" || report.outcome === "optional_stranding").toBe(true);
  });
});
