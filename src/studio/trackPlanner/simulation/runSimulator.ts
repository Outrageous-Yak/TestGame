import type { Scenario } from "../../../engine/types";
import { newGame } from "../../../engine/api";
import { analyzeStranding, type StrandingOutcome } from "../../../engine/strandingAnalysis";
import { computeOptimalSolution, type OptimalSolution, type ReplayStep } from "../../../engine/trackAnalysis";
import { validateTrack } from "../../../engine/trackValidator";
import { authoredTrackToScenario } from "../serialization/scenarioBridge";
import type { PlannerTrack, TrackValidationSummary } from "../types";
import {
  DEFAULT_SIMULATOR_BUDGET,
  type AnalysisBudget,
  makeDeadline,
  remainingMs,
} from "./analysisBudget";

/** Simulator/solver outcome — distinct from Audit GREEN/RED. */
export type SolverOutcome =
  | "solvable"
  | "unsolvable"
  | "search_limit"
  | "structural_error"
  | "internal_error"
  | "cancelled";

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
  /** Aligned stranding analysis (runtime STRANDED semantics). */
  strandingOutcome: StrandingOutcome | null;
  strandingSummaryLabel: string | null;
  /** True when stranding was skipped/truncated by shared budget. */
  strandingBudgetLimited: boolean;
}

export type RunSimulatorOptions = {
  budget?: Partial<AnalysisBudget>;
  isCancelled?: () => boolean;
};

function strandingSummaryLabel(
  outcome: StrandingOutcome | null,
  budgetLimited: boolean
): string | null {
  if (budgetLimited && (!outcome || outcome === "search_limit")) {
    return "Stranding: Unknown (analysis limit)";
  }
  if (!outcome) return null;
  switch (outcome) {
    case "safe":
      return "Stranding: None found";
    case "optional_stranding":
      return "Stranding: Possible";
    case "unsolvable":
      return "Stranding: Unavoidable";
    case "search_limit":
      return "Stranding: Unknown (search limit)";
    case "structural_error":
      return "Stranding: Cannot analyze";
    default:
      return null;
  }
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
      abortReason: null,
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

function mergeBudget(partial?: Partial<AnalysisBudget>): AnalysisBudget {
  return { ...DEFAULT_SIMULATOR_BUDGET, ...partial };
}

function cancelledResult(
  validation: ReturnType<typeof validateTrack> | null,
  scenario: Scenario | null,
  message: string
): SimulatorResult {
  const optimal = emptyOptimal();
  optimal.stats.searchAborted = true;
  optimal.stats.abortReason = "cancelled";
  return {
    summary: {
      status: "warning",
      shortestMoves: null,
      optimalPathCount: 0,
      warningCount: 1,
      errorCount: 0,
      strandedStateCount: 0,
    },
    optimal,
    validation,
    scenario,
    solutionPathHexIds: [],
    solutionStepByHex: {},
    portalLandingHexIds: [],
    optimalPathIndex: 0,
    optimalPathTotal: 0,
    solverOutcome: "cancelled",
    structuralMessage: message,
    pathSteps: [],
    strandingOutcome: null,
    strandingSummaryLabel: null,
    strandingBudgetLimited: false,
  };
}

/**
 * Read-only full-track simulator. Does not mutate the planner draft.
 * Uses authoritative engine BFS (`computeOptimalSolution` + `attemptMove`)
 * under a shared resource budget so heavy tracks cannot OOM/crash the app.
 */
export function runSimulator(
  track: PlannerTrack,
  options: RunSimulatorOptions = {}
): SimulatorResult {
  const budget = mergeBudget(options.budget);
  const isCancelled = options.isCancelled;
  const runDeadline = makeDeadline(budget.maxTotalMs);

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
      strandingOutcome: null,
      strandingSummaryLabel: null,
      strandingBudgetLimited: false,
    };
  }

  if (isCancelled?.()) {
    return cancelledResult(null, scenario, "Analysis cancelled.");
  }

  const validation = validateTrack(scenario, {
    structuralOnly: true,
    maxTurns: budget.maxTurns,
    maxNodes: Math.min(budget.maxSolverNodes, 25_000),
  });
  // Structural failures must surface as STRUCTURAL ERROR — do not enter Solver.
  if (!validation.valid) {
    const message =
      validation.issues.find((i) => i.severity === "error")?.message ??
      "Track failed structural validation";
    const optimal = emptyOptimal();
    return {
      summary: {
        status: "invalid",
        shortestMoves: null,
        optimalPathCount: 0,
        warningCount: validation.issues.filter((i) => i.severity === "warning").length,
        errorCount: Math.max(
          1,
          validation.issues.filter((i) => i.severity === "error").length
        ),
        strandedStateCount: 0,
      },
      optimal,
      validation,
      scenario,
      solutionPathHexIds: [],
      solutionStepByHex: {},
      portalLandingHexIds: [],
      optimalPathIndex: 0,
      optimalPathTotal: 0,
      solverOutcome: "structural_error",
      structuralMessage: message,
      pathSteps: [],
      strandingOutcome: null,
      strandingSummaryLabel: null,
      strandingBudgetLimited: false,
    };
  }

  const base = newGame(scenario);

  const solverNodeCap = Math.min(budget.maxSolverNodes, budget.maxTotalNodes);
  const solverMsCap = Math.min(budget.maxSolverMs, remainingMs(runDeadline));

  let optimal: OptimalSolution;
  try {
    optimal = computeOptimalSolution(base, budget.maxTurns, solverNodeCap, {
      countAlternativePaths: budget.countAlternativePaths,
      maxMs: solverMsCap,
      maxFrontier: budget.maxFrontier,
      maxPathCountNodes: budget.maxPathCountNodes,
      isCancelled,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const failed = emptyOptimal();
    return {
      summary: {
        status: "invalid",
        shortestMoves: null,
        optimalPathCount: 0,
        warningCount: 0,
        errorCount: 1,
        strandedStateCount: 0,
      },
      optimal: failed,
      validation,
      scenario,
      solutionPathHexIds: [],
      solutionStepByHex: {},
      portalLandingHexIds: [],
      optimalPathIndex: 0,
      optimalPathTotal: 0,
      solverOutcome: "internal_error",
      structuralMessage: `Internal solver error: ${message}`,
      pathSteps: [],
      strandingOutcome: null,
      strandingSummaryLabel: null,
      strandingBudgetLimited: false,
    };
  }

  if (isCancelled?.() || optimal.stats.abortReason === "cancelled") {
    return cancelledResult(validation, scenario, "Analysis cancelled.");
  }

  const solverNodesUsed = optimal.stats.exploredNodes;
  const remainingNodes = Math.max(0, budget.maxTotalNodes - solverNodesUsed);
  const strandingNodeCap = Math.min(budget.maxStrandingNodes, remainingNodes);
  const strandingMsCap = Math.min(budget.maxStrandingMs, remainingMs(runDeadline));

  let strandingReport: ReturnType<typeof analyzeStranding> | null = null;
  let strandingBudgetLimited = false;

  const skipStranding =
    strandingNodeCap < 64 ||
    strandingMsCap < 50 ||
    (optimal.stats.searchAborted && optimal.minMoves === null);

  if (skipStranding) {
    strandingBudgetLimited = true;
  } else {
    try {
      strandingReport = analyzeStranding(base, budget.maxTurns, strandingNodeCap, {
        maxMs: strandingMsCap,
        maxFrontier: budget.maxFrontier,
        isCancelled,
      });
      if (strandingReport.searchAborted) {
        strandingBudgetLimited = true;
      }
    } catch {
      strandingReport = null;
      strandingBudgetLimited = true;
    }
  }

  if (isCancelled?.()) {
    return cancelledResult(validation, scenario, "Analysis cancelled.");
  }

  const warnings = validation.warnings?.length ?? 0;
  const errors = validation.errors?.length ?? 0;

  let solverOutcome: SolverOutcome;
  if (optimal.stats.abortReason === "cancelled") {
    solverOutcome = "cancelled";
  } else if (optimal.stats.searchAborted && optimal.minMoves === null) {
    solverOutcome = "search_limit";
  } else if (optimal.minMoves === null) {
    solverOutcome = "unsolvable";
  } else {
    solverOutcome = "solvable";
  }

  let status: TrackValidationSummary["status"] = "valid";
  if (solverOutcome === "search_limit" || solverOutcome === "cancelled") status = "warning";
  else if (solverOutcome === "unsolvable") status = "invalid";
  else if (errors > 0) status = "warning";
  else if (warnings > 0) status = "warning";

  const pathCount =
    optimal.minMoves === null ? 0 : Math.max(1, optimal.alternativeOptimalCount || 1);

  const strandingOutcome: StrandingOutcome | null = skipStranding
    ? "search_limit"
    : strandingReport?.outcome ?? null;

  const summary: TrackValidationSummary = {
    status,
    shortestMoves: optimal.minMoves,
    optimalPathCount: pathCount,
    warningCount:
      warnings +
      (solverOutcome === "search_limit" || strandingBudgetLimited ? 1 : 0),
    errorCount: errors + (solverOutcome === "unsolvable" ? 1 : 0),
    strandedStateCount: strandingReport?.strandedStateCount ?? 0,
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
    strandingOutcome,
    strandingSummaryLabel: strandingSummaryLabel(strandingOutcome, strandingBudgetLimited),
    strandingBudgetLimited,
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
