import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PlannerTrack } from "../types";
import {
  trackSolverFingerprint,
  type SimulatorResult,
  type SolverOutcome,
} from "../simulation/runSimulator";
import { startSimulatorRun, type SimulatorRunHandle } from "../simulation/startSimulatorRun";
import { AllLayersBoard } from "../components/LayerBoardGrid";

type SimulatorViewProps = {
  track: PlannerTrack;
};

function solverLabel(outcome: SolverOutcome, minMoves: number | null): string {
  if (outcome === "solvable") return `SOLVER: SOLVABLE — ${minMoves} moves`;
  if (outcome === "search_limit") return "SOLVER: SEARCH LIMIT";
  if (outcome === "structural_error") return "SOLVER: STRUCTURAL ERROR";
  if (outcome === "internal_error") return "SOLVER: INTERNAL ERROR";
  if (outcome === "cancelled") return "SOLVER: CANCELLED";
  return "SOLVER: NO SOLUTION FOUND";
}

function outcomeClass(outcome: SolverOutcome): string {
  if (outcome === "solvable") return "tp-simOk";
  if (
    outcome === "search_limit" ||
    outcome === "structural_error" ||
    outcome === "internal_error" ||
    outcome === "cancelled"
  ) {
    return "tp-simWarn";
  }
  return "tp-simBad";
}

export function SimulatorView({ track }: SimulatorViewProps) {
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [running, setRunning] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const fingerprint = useMemo(() => trackSolverFingerprint(track), [track]);
  const activeRun = useRef<SimulatorRunHandle | null>(null);
  const mounted = useRef(true);
  const fingerprintRef = useRef(fingerprint);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeRun.current?.cancel();
      activeRun.current = null;
    };
  }, []);

  useEffect(() => {
    fingerprintRef.current = fingerprint;
    setResult(null);
    setStatusNote(null);
    // Track changed — cancel any in-flight analysis so stale results cannot apply.
    if (activeRun.current) {
      activeRun.current.cancel();
      activeRun.current = null;
      setRunning(false);
    }
  }, [fingerprint]);

  const run = () => {
    if (running || activeRun.current) return;

    setRunning(true);
    setStatusNote("Running analysis…");
    const startedFor = fingerprint;
    const handle = startSimulatorRun(track);
    activeRun.current = handle;

    handle.promise
      .then((next) => {
        if (!mounted.current) return;
        if (activeRun.current?.runId !== handle.runId) return;
        if (fingerprintRef.current !== startedFor) return;
        setResult(next);
        setStatusNote(null);
      })
      .catch((e) => {
        if (!mounted.current) return;
        if (activeRun.current?.runId !== handle.runId) return;
        if (fingerprintRef.current !== startedFor) return;
        console.error(e);
        setResult({
          summary: {
            status: "invalid",
            shortestMoves: null,
            optimalPathCount: 0,
            warningCount: 0,
            errorCount: 1,
            strandedStateCount: 0,
          },
          optimal: {
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
          },
          validation: null,
          scenario: null,
          solutionPathHexIds: [],
          solutionStepByHex: {},
          portalLandingHexIds: [],
          optimalPathIndex: 0,
          optimalPathTotal: 0,
          solverOutcome: "internal_error",
          structuralMessage: e instanceof Error ? e.message : String(e),
          pathSteps: [],
          strandingOutcome: null,
          strandingSummaryLabel: null,
          strandingBudgetLimited: false,
        });
        setStatusNote(null);
      })
      .finally(() => {
        if (activeRun.current?.runId === handle.runId) {
          activeRun.current = null;
        }
        if (mounted.current) setRunning(false);
      });
  };

  const cancel = () => {
    activeRun.current?.cancel();
    activeRun.current = null;
    setRunning(false);
    setStatusNote("Cancelled — not an unsolvable verdict.");
  };

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
        {running ? (
          <button type="button" className="btn" onClick={cancel}>
            Cancel
          </button>
        ) : null}
        {result && !running ? (
          <button type="button" className="btn" onClick={run}>
            Re-run
          </button>
        ) : null}
      </div>

      {statusNote ? <p className="tp-hint">{statusNote}</p> : null}

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
          {result.solverOutcome === "cancelled" ? (
            <p className="tp-hint">Analysis cancelled. Run again when ready.</p>
          ) : null}
          {result.solverOutcome === "internal_error" ? (
            <p className="tp-simWarn">
              Solver hit an unexpected internal error. This is not the same as NO SOLUTION.
            </p>
          ) : null}
          {result.solverOutcome === "unsolvable" ? (
            <p className="tp-simBad">Goal is unreachable under current solver model.</p>
          ) : null}
          {result.strandingSummaryLabel ? (
            <p className="tp-hint">{result.strandingSummaryLabel}</p>
          ) : null}
          {result.solverOutcome === "solvable" &&
          result.strandingOutcome === "optional_stranding" ? (
            <p className="tp-hint">
              Track is solvable — optional stranding branches exist (runtime STRANDED traps).
            </p>
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
        <p className="tp-hint">
          Run the full-track solver (Start → Goal). Heavy tracks are resource-bounded and will not
          crash the app. Does not modify the draft.
        </p>
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
