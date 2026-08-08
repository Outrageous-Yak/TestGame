import React, { useMemo } from "react";
import type { PlannerScenario, PlannerTrack, PlannerWorld } from "../types";
import { auditTrack, auditSummary, trackStructuralStatus } from "../audit/auditTrack";
import type { EditorView } from "../types";

type AuditViewProps = {
  track: PlannerTrack;
  world?: PlannerWorld;
  scenario?: PlannerScenario;
  onJumpToFeature: (featureId: string, view: EditorView) => void;
};

const STATUS_LABEL = {
  green: "STRUCTURAL AUDIT: GREEN",
  amber: "STRUCTURAL AUDIT: AMBER",
  red: "STRUCTURAL AUDIT: RED",
} as const;

export function AuditView({ track, world, scenario, onJumpToFeature }: AuditViewProps) {
  const items = useMemo(() => auditTrack(track, world, scenario), [track, world, scenario]);
  const summary = useMemo(() => auditSummary(items), [items]);
  const structural = useMemo(() => trackStructuralStatus(items), [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items]);

  return (
    <div className="tp-auditView">
      <header className="tp-auditHeader">
        <h2>Track Audit</h2>
        <p className={`tp-auditStructural tp-auditStructural-${structural}`}>
          {STATUS_LABEL[structural]}
        </p>
        <p className="tp-auditCounts">
          Errors: {summary.red} · Warnings: {summary.amber} · Passed: {summary.green}
        </p>
        <p className="tp-hint">Structural configuration only — not solvability or pathfinding.</p>
      </header>

      {["start_goal", "portals", "cards", "encounters", "visibility", "board", "runtime"].map((cat) => {
        const rows = grouped.get(cat);
        if (!rows?.length) return null;
        return (
          <section key={cat} className="tp-auditSection">
            <h3>{cat.replace(/_/g, " ").toUpperCase()}</h3>
            <div className="tp-auditCards">
              {rows.map((item, i) => (
                <article
                  key={`${item.featureId}-${i}`}
                  className={`tp-auditCard tp-audit-${item.severity}`}
                >
                  <div className="tp-auditCardHead">
                    <span className="tp-auditStatusIcon">
                      {item.severity === "green" ? "✓" : item.severity === "amber" ? "⚠" : "✕"}
                    </span>
                    <strong>{item.featureLabel}</strong>
                  </div>
                  <dl className="tp-auditCardMeta">
                    <div>
                      <dt>Layer</dt>
                      <dd>{item.layer || "—"}</dd>
                    </div>
                    <div>
                      <dt>Position</dt>
                      <dd>{item.position}</dd>
                    </div>
                    <div>
                      <dt>Function</dt>
                      <dd>{item.configuration}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{item.message}</dd>
                    </div>
                    {item.notes ? (
                      <div>
                        <dt>Notes</dt>
                        <dd>{item.notes}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {item.featureId !== "structure" &&
                  !item.featureId.startsWith("start_") &&
                  !item.featureId.startsWith("goal_") ? (
                    <button
                      type="button"
                      className="btn tp-miniBtn tp-auditJumpBtn"
                      onClick={() => onJumpToFeature(item.featureId, "features")}
                    >
                      Edit feature
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
