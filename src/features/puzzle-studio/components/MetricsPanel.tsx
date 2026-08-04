import React from "react";
import type { StudioAnalysisResult } from "../studioAnalysis";

type MetricsPanelProps = {
  analysis: StudioAnalysisResult | null;
  loading?: boolean;
};

export function MetricsPanel({ analysis, loading }: MetricsPanelProps) {
  if (loading) return <div className="ps-panel"><p className="ps-muted">Computing metrics…</p></div>;
  if (!analysis) return <div className="ps-panel"><p className="ps-muted">Select a track.</p></div>;

  const { solution, counts, fitness, quality } = analysis;

  return (
    <div className="ps-panel ps-metricsGrid">
      <Metric label="Shortest solution" value={solution.minMoves ?? "—"} />
      <Metric label="Optimal solutions" value={counts.optimal} />
      <Metric label="Solutions within +5" value={counts.withinSlack} />
      <Metric label="Reachable states (search)" value={solution.stats.visitedStates} />
      <Metric label="Portal usage" value={fitness.portalUsage} />
      <Metric label="Layer visits" value={fitness.layerVisits.join(", ") || "—"} />
      <Metric label="Rows shifted" value={fitness.rowShiftEvents} />
      <Metric label="Branching factor" value={solution.stats.branchingFactor.toFixed(2)} />
      <Metric label="Dead ends explored" value={solution.stats.exploredNodes} />
      <Metric label="Puzzle fitness" value={`${fitness.overallFitness}/10`} />
      <Metric label="Difficulty" value={`${fitness.difficulty}/10`} />
      <Metric label="Est. solve time" value={fitness.estimatedSolveMinutes} />
      <Metric label="Originality gate" value={`${fitness.originality.maxPercent.toFixed(1)}%`} />
      <Metric label="Quality score" value={`${quality.qualityScore}/10`} />
      <Metric label="Engineering score" value={`${quality.engineeringScore}/10`} />
      <Metric label="Runtime (ms)" value={solution.stats.runtimeMs} />
      {solution.stats.searchAborted ? (
        <div className="ps-warn">Search aborted (caps reached)</div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ps-metric">
      <div className="ps-metricLabel">{label}</div>
      <div className="ps-metricValue">{value}</div>
    </div>
  );
}
