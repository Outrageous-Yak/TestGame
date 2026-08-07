import React, { useEffect, useState } from "react";
import type { PlannerTrack } from "../types";
import { runSimulator, type SimulatorResult } from "../simulation/runSimulator";
import { AllLayersBoard } from "../components/LayerBoardGrid";

type SimulatorViewProps = {
  track: PlannerTrack;
};

export function SimulatorView({ track }: SimulatorViewProps) {
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [running, setRunning] = useState(false);
  const [pathIndex, setPathIndex] = useState(0);

  const run = () => {
    setRunning(true);
    window.setTimeout(() => {
      try {
        const r = runSimulator(track);
        setResult(r);
        setPathIndex(0);
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
  }, [track.trackId]);

  const overlay = new Set(result?.solutionPathHexIds ?? []);

  return (
    <div className="tp-simulatorView">
      <div className="tp-toolbar">
        <button type="button" className="btn primary" onClick={run} disabled={running}>
          {running ? "Validating…" : "Validate / Shortest path"}
        </button>
        {result ? (
          <>
            <span
              className={
                result.summary.status === "invalid"
                  ? "tp-simBad"
                  : result.summary.status === "warning"
                    ? "tp-simWarn"
                    : "tp-simOk"
              }
            >
              {result.optimal.minMoves === null
                ? "✕ NO SOLUTION"
                : `✓ SOLVABLE — ${result.optimal.minMoves} moves`}
            </span>
            <span>
              Optimal solutions: {result.optimal.alternativeOptimalCount + 1}
              {result.optimal.alternativeOptimalCount >= 999 ? "+" : ""}
            </span>
            {result.summary.strandedStateCount > 0 ? (
              <span className="tp-simWarn">
                ⚠ {result.summary.strandedStateCount} stranded states
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {result?.optimal.stats.searchAborted ? (
        <p className="tp-hint">Analysis incomplete — state limit reached</p>
      ) : null}

      {result && result.optimal.minMoves !== null ? (
        <AllLayersBoard track={track} solutionOverlay={overlay} highlightFeatures={false} />
      ) : null}

      {result && result.optimal.minMoves === null ? (
        <p className="tp-simBad">Goal is unreachable with current board configuration.</p>
      ) : null}
    </div>
  );
}
