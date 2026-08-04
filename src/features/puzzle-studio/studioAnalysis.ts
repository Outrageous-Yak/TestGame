import type { Scenario } from "../../engine/types";
import { newGame } from "../../engine/api";
import {
  computeOptimalSolution,
  compareToScenario,
  analyzeTrackQuality,
  formatReplay,
  formatQualityReport,
  type OptimalSolution,
  type SimilarityBreakdown,
} from "../../engine/trackAnalysis";
import {
  validateTrack,
  geometryFingerprint,
  type TrackValidationReport,
} from "../../engine/trackValidator";
import {
  analyzePuzzleFitness,
  countSolutionsWithin,
  formatFitnessReport,
  type PuzzleFitnessReport,
} from "../../engine/puzzleFitness";
import { loadScenario } from "../../ui/game/helpers";
import { PRISM_PATH_TRACKS } from "../../worlds/rainbow_realm/prismPathShared";

export type PrismReference = {
  file: string;
  label: string;
  scenario: Scenario;
  path: string[];
};

export type StudioAnalysisResult = {
  validation: TrackValidationReport;
  solution: OptimalSolution;
  counts: { optimal: number; withinSlack: number };
  fitness: PuzzleFitnessReport;
  quality: ReturnType<typeof analyzeTrackQuality>;
  fingerprint: string;
  heatMap: Map<string, number>;
  replayText: string;
};

export async function loadPrismReference(): Promise<PrismReference[]> {
  const out: PrismReference[] = [];
  for (const track of PRISM_PATH_TRACKS) {
    try {
      const scenario = await loadScenario(track.scenarioJson);
      const base = newGame(scenario);
      const sol = computeOptimalSolution(base);
      out.push({
        file: track.scenarioJson,
        label: track.name,
        scenario,
        path: sol.pathHexIds,
      });
    } catch {
      /* skip unloadable reference tracks */
    }
  }
  return out;
}

function buildHeatMap(solution: OptimalSolution): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (id: string) => counts.set(id, (counts.get(id) ?? 0) + 1);

  for (const step of solution.replay) {
    bump(step.fromHexId);
    bump(step.toHexId);
    bump(step.playerAfter);
  }
  for (const id of solution.pathHexIds) bump(id);

  return counts;
}

export function runStudioAnalysis(
  scenario: Scenario,
  prism: PrismReference[]
): StudioAnalysisResult {
  const prismData = prism.map((p) => ({
    file: p.file,
    scenario: p.scenario,
    path: p.path,
  }));

  const base = newGame(scenario);
  const validation = validateTrack(scenario);
  const solution = computeOptimalSolution(base);
  const counts = countSolutionsWithin(base, 80, 5);
  const fitness = analyzePuzzleFitness(scenario, prismData);
  const quality = analyzeTrackQuality(scenario, prismData);

  return {
    validation,
    solution,
    counts,
    fitness,
    quality,
    fingerprint: geometryFingerprint(scenario),
    heatMap: buildHeatMap(solution),
    replayText: formatReplay(solution.replay),
  };
}

export async function analyzeScenarioAsync(
  scenario: Scenario,
  prism: PrismReference[]
): Promise<StudioAnalysisResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(runStudioAnalysis(scenario, prism)), 0);
  });
}

export function compareTracks(
  a: Scenario,
  pathA: string[],
  b: Scenario,
  pathB: string[]
): SimilarityBreakdown {
  const partial = compareToScenario(a, b, pathA, pathB);
  const maxPercent = Math.max(
    partial.geometryPercent,
    partial.portalPercent,
    partial.routePercent
  );
  const fullMaxPercent = Math.max(
    partial.geometryPercent,
    partial.portalPercent,
    partial.routePercent,
    partial.layerPercent,
    partial.movingRowPercent
  );
  return { ...partial, maxPercent, fullMaxPercent };
}

export function buildEngineeringReport(
  scenario: Scenario,
  analysis: StudioAnalysisResult
): string {
  return [
    "# Puzzle Studio Engineering Report",
    "",
    `Track: ${scenario.name} (${scenario.id})`,
    `Fingerprint: ${analysis.fingerprint}`,
    "",
    "## Validation",
    analysis.validation.valid ? "PASSED" : "FAILED",
    analysis.validation.issues.map((i) => `- [${i.severity}] ${i.code}: ${i.message}`).join("\n"),
    "",
    "## Quality",
    formatQualityReport(analysis.quality),
    "",
    "## Fitness",
    formatFitnessReport(analysis.fitness),
    "",
    "## Replay",
    analysis.replayText,
    "",
    "## JSON",
    JSON.stringify(scenario, null, 2),
  ].join("\n");
}

export async function loadScenarioForTrack(scenarioJson: string): Promise<Scenario> {
  return loadScenario(scenarioJson);
}
