import type { Scenario } from "../../../engine/types";
import { newGame } from "../../../engine/api";
import { computeOptimalSolution, type OptimalSolution, type ReplayStep } from "../../../engine/trackAnalysis";
import { validateTrack } from "../../../engine/trackValidator";
import { authoredTrackToScenario } from "../serialization/scenarioBridge";
import type { PlannerTrack, TrackValidationSummary } from "../types";

/** Simulator/solver outcome — distinct from Audit GREEN/RED. */
export type SolverOutcome = "solvable" | "unsolvable" | "search_limit" | "structural_error";

export interface SimulatorResult {
  summary: TrackValidationSummary;
  optimal: OptimalSolution;
  validation: ReturnType<typeof validateTrack> | null;
  scenario: Scenario | null;
  /** Hex IDs for overlay on selected optimal path (move targets). */
  solutionPathHexIds: string[];
  /** Move number overlay keyed by hex id (tap targets + portal landings). */
  solutionStepByHex: Record<string, number>;
  /** Portal landing hex ids (distinct from tap targets). */
  portalLandingHexIds: string[];
  optimalPathIndex: number;
  optimalPathTotal: number;
  solverOutcome: SolverOutcome;
  /** Human-readable structural failure (missing Start/Goal, etc.). */
  structuralMessage: string | null;
  pathSteps: ReplayStep[];
}

function emptyOptimal(): OptimalSolution {
  return {
    minMoves: null,
    pathHexIds: [],
    replay: [],
    alternativeOptimalCount: 0,
    hasMultipleOptimalPaths: false,
    optimalPathCountCapped: false,
    stats: {
      exploredNodes: 0,
      visitedStates: 0,
      maxQueueDepth: 0,
      maxTurnsSearched: 0,
      branchingFactor: 0,
      searchAborted: false,
      runtimeMs: 0,
    },
  };
}

function buildStepOverlay(replay: ReplayStep[]): {
  solutionStepByHex: Record<string, number>;
  portalLandingHexIds: string[];
} {
  const solutionStepByHex: Record<string, number> = {};
  const portalLandingHexIds: string[] = [];
  for (const step of replay) {
    if (!solutionStepByHex[step.toHexId]) {
      solutionStepByHex[step.toHexId] = step.moveNumber;
    }
    if (step.portalDestination) {
      portalLandingHexIds.push(step.portalDestination);
      if (!solutionStepByHex[step.portalDestination]) {
        solutionStepByHex[step.portalDestination] = step.moveNumber;
      }
    }
    if (!solutionStepByHex[step.playerAfter]) {
      solutionStepByHex[step.playerAfter] = step.moveNumber;
    }
  }
  return { solutionStepByHex, portalLandingHexIds };
}

/**
 * Read-only full-track simulator. Does not mutate the planner draft.
 * Uses authoritative engine BFS (`computeOptimalSolution` + `attemptMove`).
 */
export function runSimulator(track: PlannerTrack): SimulatorResult {
  let scenario: Scenario;
  try {
    scenario = authoredTrackToScenario(track);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const optimal = emptyOptimal();
    return {
      summary: {
        status: "invalid",
        shortestMoves: null,
        optimalPathCount: 0,
        warningCount: 0,
        errorCount: 1,
        strandedStateCount: 0,
      },
      optimal,
      validation: null,
      scenario: null,
      solutionPathHexIds: [],
      solutionStepByHex: {},
      portalLandingHexIds: [],
      optimalPathIndex: 0,
      optimalPathTotal: 0,
      solverOutcome: "structural_error",
      structuralMessage: message,
      pathSteps: [],
    };
  }

  const validation = validateTrack(scenario);
  const base = newGame(scenario);
  const optimal = computeOptimalSolution(base, 80, 400000, { countAlternativePaths: true });

  const warnings = validation.warnings?.length ?? 0;
  const errors = validation.errors?.length ?? 0;

  let solverOutcome: SolverOutcome;
  if (optimal.stats.searchAborted && optimal.minMoves === null) {
    solverOutcome = "search_limit";
  } else if (optimal.minMoves === null) {
    solverOutcome = "unsolvable";
  } else {
    solverOutcome = "solvable";
  }

  let status: TrackValidationSummary["status"] = "valid";
  if (solverOutcome === "search_limit") status = "warning";
  else if (solverOutcome === "unsolvable") status = "invalid";
  else if (errors > 0) status = "warning";
  else if (warnings > 0) status = "warning";

  const pathCount =
    optimal.minMoves === null ? 0 : Math.max(1, optimal.alternativeOptimalCount || 1);

  const summary: TrackValidationSummary = {
    status,
    shortestMoves: optimal.minMoves,
    optimalPathCount: pathCount,
    warningCount: warnings + (solverOutcome === "search_limit" ? 1 : 0),
    errorCount: errors + (solverOutcome === "unsolvable" ? 1 : 0),
    strandedStateCount: 0,
  };

  const { solutionStepByHex, portalLandingHexIds } = buildStepOverlay(optimal.replay);

  return {
    summary,
    optimal,
    validation,
    scenario,
    solutionPathHexIds: optimal.pathHexIds,
    solutionStepByHex,
    portalLandingHexIds,
    optimalPathIndex: 0,
    optimalPathTotal: pathCount,
    solverOutcome,
    structuralMessage: null,
    pathSteps: optimal.replay,
  };
}

export function freshPlaytestState(track: PlannerTrack) {
  const scenario = authoredTrackToScenario(track);
  return newGame(scenario);
}

/** Fingerprint of authored content that affects solver results (invalidates stale UI). */
export function trackSolverFingerprint(track: PlannerTrack): string {
  return JSON.stringify({
    id: track.trackId,
    layers: track.layers,
    features: track.features,
  });
}
