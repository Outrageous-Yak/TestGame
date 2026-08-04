import React from "react";
import type { Scenario } from "../../../engine/types";
import type { StudioAnalysisResult } from "../studioAnalysis";
import { buildEngineeringReport } from "../studioAnalysis";

type EngineeringPanelProps = {
  scenario: Scenario | null;
  analysis: StudioAnalysisResult | null;
};

export function EngineeringPanel({ scenario, analysis }: EngineeringPanelProps) {
  if (!scenario || !analysis) {
    return (
      <div className="ps-panel">
        <p className="ps-muted">Select a track for engineering view.</p>
      </div>
    );
  }

  const report = buildEngineeringReport(scenario, analysis);

  return (
    <div className="ps-panel ps-engineering">
      <div className="ps-panelHead">Engineering</div>
      <div className="ps-engineeringSections">
        <details open>
          <summary>Combined report</summary>
          <pre className="ps-code">{report}</pre>
        </details>
        <details>
          <summary>JSON</summary>
          <pre className="ps-code">{JSON.stringify(scenario, null, 2)}</pre>
        </details>
        <details>
          <summary>Validator</summary>
          <pre className="ps-code">{JSON.stringify(analysis.validation, null, 2)}</pre>
        </details>
        <details>
          <summary>Replay</summary>
          <pre className="ps-code">{analysis.replayText}</pre>
        </details>
        <details>
          <summary>Fitness</summary>
          <pre className="ps-code">{JSON.stringify(analysis.fitness, null, 2)}</pre>
        </details>
        <details>
          <summary>Originality</summary>
          <pre className="ps-code">{JSON.stringify(analysis.fitness.originality, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}
