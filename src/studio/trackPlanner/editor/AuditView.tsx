import React, { useMemo } from "react";
import type { PlannerScenario, PlannerTrack, PlannerWorld } from "../types";
import { auditTrack, auditSummary } from "../audit/auditTrack";
import type { EditorView } from "../types";

type AuditViewProps = {
  track: PlannerTrack;
  world?: PlannerWorld;
  scenario?: PlannerScenario;
  onJumpToFeature: (featureId: string, view: EditorView) => void;
};

export function AuditView({ track, world, scenario, onJumpToFeature }: AuditViewProps) {
  const items = useMemo(() => auditTrack(track, world, scenario), [track, world, scenario]);
  const summary = auditSummary(items);

  return (
    <div className="tp-auditView">
      <div className="tp-auditSummary">
        <span className="tp-auditOk">✓ {summary.approved}</span>
        <span className="tp-auditWarn">⚠ {summary.warning}</span>
        <span className="tp-auditErr">✕ {summary.error}</span>
      </div>
      <table className="tp-auditTable">
        <thead>
          <tr>
            <th>Status</th>
            <th>Feature</th>
            <th>Layer</th>
            <th>Position</th>
            <th>Configuration</th>
            <th>Notes</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={`${item.featureId}-${i}`} className={`tp-audit-${item.level}`}>
              <td>
                {item.level === "approved" ? "✓" : item.level === "warning" ? "⚠" : "✕"}
              </td>
              <td>{item.featureLabel}</td>
              <td>{item.layer || "—"}</td>
              <td>{item.position}</td>
              <td>{item.configuration}</td>
              <td>{item.notes || item.message}</td>
              <td>
                {item.featureId !== "structure" ? (
                  <button
                    type="button"
                    className="btn tp-miniBtn"
                    onClick={() => onJumpToFeature(item.featureId, "features")}
                  >
                    Edit
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
