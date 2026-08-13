/**
 * Central Simulator analysis resource budgets.
 * Keep magic numbers here — do not scatter ceilings across call sites.
 */

export type AnalysisAbortReason =
  | "nodes"
  | "time"
  | "frontier"
  | "cancelled"
  | "turns"
  | null;

export type AnalysisBudget = {
  /** Max successful-move depth for BFS. */
  maxTurns: number;
  /** Max nodes explored by Solver BFS. */
  maxSolverNodes: number;
  /** Max nodes explored by Stranding BFS. */
  maxStrandingNodes: number;
  /** Combined Solver + Stranding explored-node ceiling. */
  maxTotalNodes: number;
  /** Wall-clock ms for the whole Simulator run (Solver + Stranding). */
  maxTotalMs: number;
  /** Wall-clock ms for Solver alone. */
  maxSolverMs: number;
  /** Wall-clock ms for Stranding alone. */
  maxStrandingMs: number;
  /** Max BFS frontier (queue length) for either search. */
  maxFrontier: number;
  /** Whether to count alternative optimal paths (bounded). */
  countAlternativePaths: boolean;
  /** Node budget for alternative-path counting. */
  maxPathCountNodes: number;
};

/** Production Track Planner Simulator defaults (browser-safe). */
export const DEFAULT_SIMULATOR_BUDGET: AnalysisBudget = {
  maxTurns: 80,
  /** Kept well below OOM on multi-layer moving-row tracks (DTO-heavy BFS). */
  maxSolverNodes: 25_000,
  maxStrandingNodes: 8_000,
  maxTotalNodes: 30_000,
  maxTotalMs: 8_000,
  maxSolverMs: 6_000,
  maxStrandingMs: 2_000,
  maxFrontier: 12_000,
  countAlternativePaths: true,
  maxPathCountNodes: 8_000,
};

/** Smaller budgets for CI stress tests (fast termination). */
export const CI_STRESS_BUDGET: AnalysisBudget = {
  maxTurns: 40,
  maxSolverNodes: 8_000,
  maxStrandingNodes: 4_000,
  maxTotalNodes: 10_000,
  maxTotalMs: 2_000,
  maxSolverMs: 1_500,
  maxStrandingMs: 800,
  maxFrontier: 5_000,
  countAlternativePaths: false,
  maxPathCountNodes: 2_000,
};

export type SearchLimits = {
  maxTurns: number;
  maxNodes: number;
  maxMs: number;
  maxFrontier: number;
  /** Cooperative cancel — checked each BFS iteration. */
  isCancelled?: () => boolean;
};

export function remainingMs(deadlineMs: number): number {
  return Math.max(0, deadlineMs - performance.now());
}

export function makeDeadline(maxMs: number): number {
  return performance.now() + Math.max(0, maxMs);
}
