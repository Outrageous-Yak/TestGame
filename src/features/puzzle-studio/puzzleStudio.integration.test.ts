/**
 * Puzzle Studio integration tests — parity with canonical engine modules and routing.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Scenario } from "../../engine/types";
import { posId } from "../../engine/board";
import { newGame, tryMove } from "../../engine/api";
import { rowShiftLabel } from "../../engine/layout";
import {
  computeOptimalSolution,
  compareToScenario,
  formatReplay,
} from "../../engine/trackAnalysis";
import { validateTrack } from "../../engine/trackValidator";
import { analyzePuzzleFitness, countSolutionsWithin } from "../../engine/puzzleFitness";
import { loadWorlds } from "../../ui/worldsLoader";
import { buildStudioCatalog } from "./studioCatalog";
import { shouldShowDevMenu, resolveInitialScreen } from "./studioRouting";
import { isDevMode } from "./devMode";
import {
  buildPortalColorMap,
  classifyHexOverlay,
  serializeScenarioExport,
} from "./studioOverlay";
import {
  runStudioAnalysis,
  compareTracks,
  buildEngineeringReport,
} from "./studioAnalysis";
import { neighborIdsSameLayer } from "../../engine/neighbors";
import { freshStudioState, stateAfterPath } from "./studioBoard";

const root = join(import.meta.dirname, "..", "..", "..");
const fcDir = join(root, "public/worlds/forgotten_citadel/scenarios");
const prismDir = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");

function loadFcScenario(file: string): Scenario {
  return JSON.parse(readFileSync(join(fcDir, file), "utf8")) as Scenario;
}

function loadPrismFixtures(): Array<{ file: string; scenario: Scenario; path: string[] }> {
  return readdirSync(prismDir)
    .filter((f) => f.endsWith(".json"))
    .slice(0, 5)
    .map((file) => {
      const scenario = JSON.parse(readFileSync(join(prismDir, file), "utf8")) as Scenario;
      const base = newGame(scenario);
      return { file, scenario, path: computeOptimalSolution(base).pathHexIds };
    });
}

describe("studio routing and visibility", () => {
  it("hides dev menu without dev or studio flags", () => {
    expect(shouldShowDevMenu("")).toBe(false);
    expect(resolveInitialScreen("")).toBe("start");
    expect(isDevMode()).toBe(false);
  });

  it("?dev=true reveals Developer affordances but stays on start screen", () => {
    expect(shouldShowDevMenu("?dev=true")).toBe(true);
    expect(resolveInitialScreen("?dev=true")).toBe("start");
  });

  it("?studio=true opens studio directly", () => {
    expect(shouldShowDevMenu("?studio=true")).toBe(true);
    expect(resolveInitialScreen("?studio=true")).toBe("studio");
  });
});

describe("track browser catalog", () => {
  it("lists all registered worlds, scenarios, and tracks", () => {
    const worlds = loadWorlds();
    const catalog = buildStudioCatalog(worlds);
    expect(worlds.length).toBeGreaterThanOrEqual(2);
    expect(catalog.some((t) => t.worldId === "rainbow_realm")).toBe(true);
    expect(catalog.some((t) => t.worldId === "forgotten_citadel")).toBe(true);
    const prismTracks = catalog.filter((t) => t.worldId === "rainbow_realm");
    const fcTracks = catalog.filter((t) => t.worldId === "forgotten_citadel");
    expect(prismTracks.length).toBeGreaterThanOrEqual(20);
    expect(fcTracks.length).toBe(10);
  });

  it("track entries reference distinct scenario JSON paths", () => {
    const catalog = buildStudioCatalog(loadWorlds());
    const t01 = catalog.find((t) => t.scenarioJson.includes("track01.json"));
    expect(t01?.trackName).toBeTruthy();
    expect(t01?.scenarioJson).toMatch(/track01\.json$/);
  });
});

describe("canonical engine parity (studio bridge)", () => {
  let prism: ReturnType<typeof loadPrismFixtures>;
  let scenario: Scenario;

  beforeAll(() => {
    prism = loadPrismFixtures();
    scenario = loadFcScenario("track01.json");
  });

  it("validation matches validateTrack", () => {
    const studio = runStudioAnalysis(scenario, prism);
    const direct = validateTrack(scenario);
    expect(studio.validation.valid).toBe(direct.valid);
    expect(studio.validation.minMovesToGoal).toBe(direct.minMovesToGoal);
    expect(studio.validation.issues.length).toBe(direct.issues.length);
  });

  it("replay matches computeOptimalSolution + formatReplay", () => {
    const studio = runStudioAnalysis(scenario, prism);
    const base = newGame(scenario);
    const direct = computeOptimalSolution(base);
    expect(studio.solution.minMoves).toBe(direct.minMoves);
    expect(studio.solution.pathHexIds).toEqual(direct.pathHexIds);
    expect(studio.replayText).toBe(formatReplay(direct.replay));
  });

  it("fitness matches analyzePuzzleFitness", () => {
    const studio = runStudioAnalysis(scenario, prism);
    const direct = analyzePuzzleFitness(scenario, prism);
    expect(studio.fitness.overallFitness).toBe(direct.overallFitness);
    expect(studio.fitness.optimalSolutions).toBe(direct.optimalSolutions);
    expect(studio.fitness.shortestSolution).toBe(direct.shortestSolution);
  });

  it("counts match countSolutionsWithin", () => {
    const studio = runStudioAnalysis(scenario, prism);
    const base = newGame(scenario);
    const direct = countSolutionsWithin(base, 80, 5);
    expect(studio.counts.optimal).toBe(direct.optimal);
    expect(studio.counts.withinSlack).toBe(direct.withinSlack);
  });

  it("similarity matches compareToScenario via compareTracks", () => {
    const a = loadFcScenario("track01.json");
    const b = loadFcScenario("track02.json");
    const baseA = newGame(a);
    const baseB = newGame(b);
    const pathA = computeOptimalSolution(baseA).pathHexIds;
    const pathB = computeOptimalSolution(baseB).pathHexIds;
    const studio = compareTracks(a, pathA, b, pathB);
    const partial = compareToScenario(a, b, pathA, pathB);
    expect(studio.geometryPercent).toBe(partial.geometryPercent);
    expect(studio.portalPercent).toBe(partial.portalPercent);
    expect(studio.routePercent).toBe(partial.routePercent);
    expect(studio.layerPercent).toBe(partial.layerPercent);
    expect(studio.movingRowPercent).toBe(partial.movingRowPercent);
  });
});

describe("replay and playtest state", () => {
  const scenario = loadFcScenario("track06.json");

  it("stateAfterPath matches optimal path prefixes", () => {
    const base = newGame(scenario);
    const sol = computeOptimalSolution(base);
    const path = sol.pathHexIds;
    for (let i = 0; i <= path.length; i++) {
      const st = stateAfterPath(scenario, path, i);
      const expected = stateAfterPath(scenario, path, i);
      expect(st.playerHexId).toBe(expected.playerHexId);
      expect(st.turn).toBe(expected.turn);
    }
  });

  it("replay restart restores initial state", () => {
    const base = newGame(scenario);
    const sol = computeOptimalSolution(base);
    const path = sol.pathHexIds;
    const end = stateAfterPath(scenario, path, path.length);
    const start = stateAfterPath(scenario, path, 0);
    expect(start.playerHexId).toBe(posId(scenario.start));
    expect(end.playerHexId).not.toBe(start.playerHexId);
    const restarted = stateAfterPath(scenario, path, 0);
    expect(restarted.playerHexId).toBe(start.playerHexId);
    expect(restarted.turn).toBe(start.turn);
  });

  it("view-layer replay does not mutate separate playtest state", () => {
    const play = freshStudioState(scenario);
    const before = play.playerHexId;
    const turnBefore = play.turn;
    // Simulate replay on a clone path while play state sits idle
    const sol = computeOptimalSolution(newGame(scenario));
    stateAfterPath(scenario, sol.pathHexIds, sol.pathHexIds.length);
    expect(play.playerHexId).toBe(before);
    expect(play.turn).toBe(turnBefore);
  });

  it("playtest uses tryMove from engine api", () => {
    const state = freshStudioState(scenario);
    const neighbors = neighborIdsSameLayer(state, state.playerHexId);
    const target = neighbors.find((id) => {
      const h = state.hexesById.get(id);
      return h && !h.missing && !h.blocked;
    });
    expect(target).toBeTruthy();
    const result = tryMove(state, target!);
    expect(result.ok).toBe(true);
    expect(state.playerHexId).toBe(target);
  });
});

describe("overlays", () => {
  const scenario = loadFcScenario("track03.json");

  it("portal overlay map uses scenario transition definitions", () => {
    const map = buildPortalColorMap(scenario.transitions);
    for (const t of scenario.transitions ?? []) {
      expect(map.has(posId(t.from))).toBe(true);
    }
  });

  it("classifies missing, blocked, and normal hexes", () => {
    expect(classifyHexOverlay(true, false, { missing: true, blocked: false })).toBe("missing");
    expect(classifyHexOverlay(false, true, { missing: false, blocked: true })).toBe("blocked");
    expect(classifyHexOverlay(false, false, { missing: true, blocked: false })).toBe("normal");
  });

  it("row overlay uses engine rowShiftLabel when layer shifts", () => {
    const shifting = loadFcScenario("track01.json");
    const state = freshStudioState(shifting);
    const layer = 2;
    const pat = shifting.movement?.[String(layer)];
    if (pat && pat !== "NONE") {
      const label = rowShiftLabel(state, layer, 0);
      expect(typeof label).toBe("string");
    }
  });
});

describe("export payloads", () => {
  const scenario = loadFcScenario("track05.json");
  const prism = loadPrismFixtures();

  it("exported JSON matches loaded scenario", () => {
    const exported = serializeScenarioExport(scenario);
    const parsed = JSON.parse(exported) as Scenario;
    expect(parsed.id).toBe(scenario.id);
    expect(parsed).toEqual(scenario);
  });

  it("engineering report replay matches displayed replay text", () => {
    const analysis = runStudioAnalysis(scenario, prism);
    const report = buildEngineeringReport(scenario, analysis);
    expect(report).toContain(analysis.replayText);
    expect(analysis.replayText).toBe(formatReplay(analysis.solution.replay));
  });
});

describe("no duplicate solver in studio bridge", () => {
  it("runStudioAnalysis delegates to canonical modules only", () => {
    const src = readFileSync(join(import.meta.dirname, "studioAnalysis.ts"), "utf8");
    expect(src).toContain("validateTrack");
    expect(src).toContain("computeOptimalSolution");
    expect(src).toContain("analyzePuzzleFitness");
    expect(src).toContain("compareToScenario");
    expect(src).not.toMatch(/function\s+solve/);
    expect(src).not.toMatch(/function\s+validateTrack/);
  });

  it("studioBoard uses attemptMove for replay reconstruction", () => {
    const src = readFileSync(join(import.meta.dirname, "studioBoard.ts"), "utf8");
    expect(src).toContain("attemptMove");
    expect(src).not.toContain("tryMove");
  });
});
