import { newGame } from "../../../engine/api";
import { analyzeStranding, type StrandingReport } from "../../../engine/strandingAnalysis";
import { authoredTrackToScenario } from "../serialization/scenarioBridge";
import type { PlannerTrack } from "../types";
import { trackSolverFingerprint } from "./runSimulator";

export type { StrandingReport };

export function runStrandingAnalysis(
  track: PlannerTrack,
  maxTurns = 80,
  maxNodes = 400000
): StrandingReport {
  try {
    const scenario = authoredTrackToScenario(track);
    const base = newGame(scenario);
    return analyzeStranding(base, maxTurns, maxNodes);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      outcome: "structural_error",
      severity: "red",
      structuralMessage: message,
      reachableStateCount: 0,
      goalReachingStateCount: 0,
      safeStateCount: 0,
      strandedStateCount: 0,
      riskyPositionCount: 0,
      startCanReachGoal: false,
      hasOptionalStranding: false,
      hasUnavoidableFailure: false,
      searchAborted: false,
      runtimeMs: 0,
      exploredNodes: 0,
      goalReachingKeys: [],
      strandedKeys: [],
      hexSummaries: [],
      layerSummaries: [],
      strandedSamples: [],
      portalWarnings: [],
      exampleBadPath: [],
      exampleBadPathTargets: [],
    };
  }
}

export { trackSolverFingerprint };
