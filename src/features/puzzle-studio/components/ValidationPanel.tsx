import React from "react";
import type { TrackValidationReport } from "../../../engine/trackValidator";

type ValidationPanelProps = {
  report: TrackValidationReport | null;
  loading?: boolean;
  onRun?: () => void;
};

export function ValidationPanel({ report, loading, onRun }: ValidationPanelProps) {
  return (
    <div className="ps-panel">
      <div className="ps-panelHead">
        <span>Validation</span>
        {onRun ? (
          <button type="button" className="btn" onClick={onRun} disabled={loading}>
            {loading ? "Running…" : "Run validator"}
          </button>
        ) : null}
      </div>

      {!report ? (
        <p className="ps-muted">Select a track to validate.</p>
      ) : (
        <>
          <div className={`ps-status ${report.valid ? "pass" : "fail"}`}>
            {report.valid ? "Passed" : "Failed"}
          </div>
          <div className="ps-validationMeta">
            <span>Min moves: {report.minMovesToGoal ?? "—"}</span>
            <span>Layers reachable: {report.layersReachable.join(", ") || "none"}</span>
            {report.layersUnreachable.length ? (
              <span className="warn">Unreachable layers: {report.layersUnreachable.join(", ")}</span>
            ) : null}
            {report.shortcutDetected ? <span className="warn">Shortcut detected</span> : null}
          </div>
          <ul className="ps-issueList">
            {report.issues.map((issue, i) => (
              <li key={i} className={`ps-issue ${issue.severity}`}>
                <strong>{issue.code}</strong> — {issue.message}
              </li>
            ))}
            {report.issues.length === 0 ? <li className="ps-issue ok">No issues</li> : null}
          </ul>
        </>
      )}
    </div>
  );
}
