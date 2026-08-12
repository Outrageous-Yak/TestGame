import React, { useEffect, useMemo, useState } from "react";
import type { PlannerTrack } from "../types";
import {
  runSimulator,
  trackSolverFingerprint,
  type SimulatorResult,
  type SolverOutcome,
} from "../simulation/runSimulator";
import { AllLayersBoard } from "../components/LayerBoardGrid";

type SimulatorViewProps = {
  track: PlannerTrack;
};

function solverLabel(outcome: SolverOutcome, minMoves: number | null): string {
  if (outcome === "solvable") return `SOLVER: SOLVABLE — ${minMoves} moves`;
  if (outcome === "search_limit") return "SOLVER: SEARCH LIMIT";
  if (outcome === "structural_error") return "SOLVER: STRUCTURAL ERROR";
  if (outcome === "internal_error") return "SOLVER: INTERNAL ERROR";
  return "SOLVER: NO SOLUTION FOUND";
}

function outcomeClass(outcome: SolverOutcome): string {
  if (outcome === "solvable") return "tp-simOk";
  if (
    outcome === "search_limit" ||
    outcome === "structural_error" ||
    outcome === "internal_error"
  ) {
    return "tp-simWarn";
  }
  return "tp-simBad";
}

export function SimulatorView({ track }: SimulatorViewProps) {
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [running, setRunning] = useState(false);
  const fingerprint = useMemo(() => trackSolverFingerprint(track), [track]);

  const run = () => {
    setRunning(true);
    window.setTimeout(() => {
      try {
        setResult(runSimulator(track));
      } catch (e) {
        setResult(null);
        console.error(e);
      } finally {
        setRunning(false);
      }
    }, 0);
  };

  useEffect(() => {
    setResult(null);
  }, [fingerprint]);

  const overlay = useMemo(() => {
    const ids = new Set(result?.solutionPathHexIds ?? []);
    for (const id of Object.keys(result?.solutionStepByHex ?? {})) ids.add(id);
    for (const id of result?.portalLandingHexIds ?? []) ids.add(id);
    return ids;
  }, [result]);

  const portalLandings = useMemo(
    () => new Set(result?.portalLandingHexIds ?? []),
    [result]
  );

  return (
    <div className="tp-simulatorView">
      <div className="tp-toolbar tp-simToolbar">
        <button type="button" className="btn primary" onClick={run} disabled={running}>
          {running ? "Running…" : "Run Simulator"}
        </button>
        {result ? (
          <button type="button" className="btn" onClick={run} disabled={running}>
            Re-run
          </button>
        ) : null}
      </div>

      {result ? (
        <div className="tp-simResults">
          <p className={outcomeClass(result.solverOutcome)}>
            {solverLabel(result.solverOutcome, result.optimal.minMoves)}
          </p>
          {result.structuralMessage ? (
            <p className="tp-simWarn">{result.structuralMessage}</p>
          ) : null}
          {result.solverOutcome === "solvable" ? (
            <ul className="tp-simStats">
              <li>Optimal moves: {result.optimal.minMoves}</li>
              <li>
                States explored: {result.optimal.stats.visitedStates}
                {" · "}
                {Math.round(result.optimal.stats.runtimeMs)} ms
              </li>
              <li>
                Multiple optimal paths:{" "}
                {result.optimal.hasMultipleOptimalPaths ? "YES" : "NO"}
                {result.optimal.optimalPathCountCapped ? " (count capped)" : ""}
                {result.summary.optimalPathCount > 0
                  ? ` (${result.summary.optimalPathCount}${
                      result.optimal.optimalPathCountCapped ? "+" : ""
                    })`
                  : ""}
              </li>
            </ul>
          ) : null}
          {result.solverOutcome === "search_limit" ? (
            <p className="tp-hint">
              Search hit a safety ceiling before proving reachability. This is not the same as
              unsolvable.
            </p>
          ) : null}
          {result.solverOutcome === "internal_error" ? (
            <p className="tp-simWarn">
              Solver hit an unexpected internal error. This is not the same as NO SOLUTION.
            </p>
          ) : null}
          {result.solverOutcome === "unsolvable" ? (
            <p className="tp-simBad">Goal is unreachable under current solver model.</p>
          ) : null}

          {result.pathSteps.length > 0 ? (
            <div className="tp-simPath">
              <div className="tp-simPathTitle">Canonical optimal path</div>
              <ol className="tp-simPathList">
                {result.pathSteps.map((step) => (
                  <li key={step.moveNumber}>
                    <span className="tp-simPathMove">#{step.moveNumber}</span>{" "}
                    {step.description}
                    {step.portalType ? (
                      <span className="tp-simPortalTag"> {step.portalType}</span>
                    ) : null}
                    <span className="tp-simPathMeta"> → {step.playerAfter}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="tp-hint">Run the full-track solver (Start → Goal). Does not modify the draft.</p>
      )}

      {result && result.solverOutcome === "solvable" ? (
        <AllLayersBoard
          track={track}
          solutionOverlay={overlay}
          solutionStepByHex={result.solutionStepByHex}
          portalLandingHexIds={portalLandings}
          highlightFeatures={false}
        />
      ) : null}
    </div>
  );
}
