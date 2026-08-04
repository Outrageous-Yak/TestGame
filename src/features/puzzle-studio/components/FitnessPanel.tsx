import React from "react";
import type { PuzzleFitnessReport } from "../../../engine/puzzleFitness";

type FitnessPanelProps = {
  fitness: PuzzleFitnessReport | null;
  loading?: boolean;
};

export function FitnessPanel({ fitness, loading }: FitnessPanelProps) {
  if (loading) return <div className="ps-panel"><p className="ps-muted">Computing fitness…</p></div>;
  if (!fitness) return <div className="ps-panel"><p className="ps-muted">Select a track.</p></div>;

  const scores = fitness.categoryScores;
  const categories: Array<{ key: string; label: string; value: number }> = [
    { key: "fairness", label: "Fairness", value: scores.fairness },
    { key: "elegance", label: "Elegance", value: scores.elegance },
    { key: "discovery", label: "Discovery", value: scores.discovery },
    { key: "surprise", label: "Surprise", value: scores.surprise },
    { key: "flow", label: "Flow", value: scores.flow },
    { key: "replay", label: "Replay", value: scores.replay },
    { key: "originality", label: "Originality", value: scores.originality },
    { key: "teaching", label: "Teaching", value: scores.teaching },
    { key: "puzzleIdentity", label: "Identity", value: scores.puzzleIdentity },
  ];

  return (
    <div className="ps-panel">
      <div className="ps-panelHead">
        <span>Puzzle Fitness</span>
        <span className={`ps-fitnessOverall${fitness.overallFitness >= 9 ? " good" : ""}`}>
          {fitness.overallFitness}/10
        </span>
      </div>
      <p className="ps-identity">{fitness.identity.memorableLine}</p>
      <div className="ps-fitnessGrid">
        {categories.map((c) => (
          <div key={c.key} className="ps-fitnessRow">
            <span>{c.label}</span>
            <span className="ps-fitnessBar">
              <span className="ps-fitnessFill" style={{ width: `${c.value * 10}%` }} />
            </span>
            <span>{c.value}</span>
          </div>
        ))}
      </div>
      <div className="ps-subsection">
        <strong>Soft locks</strong>
        <div>Trapped states: {fitness.softLocks.trappedStates}</div>
        <div>Unreachable portals: {fitness.softLocks.unreachablePortalFrom.join(", ") || "none"}</div>
      </div>
      <div className="ps-subsection">
        <strong>Dead gameplay</strong>
        <div>Unused portals: {fitness.deadGameplay.unusedPortals.join(", ") || "none"}</div>
        {fitness.deadGameplay.notes.map((n, i) => (
          <div key={i} className="ps-muted">{n}</div>
        ))}
      </div>
      <div className="ps-subsection">
        <strong>Human review</strong>
        <div>Memorable: {fitness.humanReview.memorable ? "Yes" : "No"}</div>
        <div>Aha moment: {fitness.humanReview.ahaMoment ? "Yes" : "No"}</div>
        <div>Designer elegant: {fitness.humanReview.designerElegant ? "Yes" : "No"}</div>
      </div>
    </div>
  );
}
