import type { Scenario } from "../../../engine/types";
import { newGame } from "../../../engine/api";
import { computeOptimalSolution, type OptimalSolution } from "../../../engine/trackAnalysis";
import { analyzePuzzleFitness, type PuzzleFitnessReport } from "../../../engine/puzzleFitness";
import { validateTrack } from "../../../engine/trackValidator";
import { authoredTrackToScenario } from "../serialization/scenarioBridge";
import type { PlannerTrack, TrackValidationSummary } from "../types";

export interface SimulatorResult {
  summary: TrackValidationSummary;
  optimal: OptimalSolution;
  fitness: PuzzleFitnessReport | null;
  validation: ReturnType<typeof validateTrack>;
  scenario: Scenario;
  /** Hex IDs for overlay on selected optimal path. */
  solutionPathHexIds: string[];
  optimalPathIndex: number;
  optimalPathTotal: number;
}

export function runSimulator(track: PlannerTrack): SimulatorResult {
  const scenario = authoredTrackToScenario(track);
  const validation = validateTrack(scenario);
  const base = newGame(scenario);
  const optimal = computeOptimalSolution(base, 80, 400000, { countAlternativePaths: true });
  let fitness: PuzzleFitnessReport | null = null;
  try {
    fitness = analyzePuzzleFitness(scenario);
  } catch {
    fitness = null;
  }

  const stranded = fitness?.softLocks?.trappedStates ?? 0;
  const warnings = validation.warnings?.length ?? 0;
  const errors = validation.errors?.length ?? 0;

  let status: TrackValidationSummary["status"] = "valid";
  if (optimal.minMoves === null) status = "invalid";
  else if (errors > 0 || stranded > 0) status = "warning";
  else if (warnings > 0) status = "warning";

  const summary: TrackValidationSummary = {
    status,
    shortestMoves: optimal.minMoves,
    optimalPathCount: optimal.alternativeOptimalCount + (optimal.minMoves !== null ? 1 : 0),
    warningCount: warnings + (stranded > 0 ? 1 : 0),
    errorCount: errors + (optimal.minMoves === null ? 1 : 0),
    strandedStateCount: stranded,
  };

  return {
    summary,
    optimal,
    fitness,
    validation,
    scenario,
    solutionPathHexIds: optimal.pathHexIds,
    optimalPathIndex: 0,
    optimalPathTotal: Math.max(1, optimal.alternativeOptimalCount + (optimal.pathHexIds.length ? 1 : 0)),
  };
}

export function freshPlaytestState(track: PlannerTrack) {
  const scenario = authoredTrackToScenario(track);
  return newGame(scenario);
}
