import React, { useEffect, useMemo, useState } from "react";
import type { PlannerScenario, PlannerTrack, PlannerWorld } from "../types";
import { auditTrack, auditSummary, trackStructuralStatus } from "../audit/auditTrack";
import type { EditorView } from "../types";
import {
  runStrandingAnalysis,
  trackSolverFingerprint,
  type StrandingReport,
} from "../simulation/runStranding";
import { AllLayersBoard } from "../components/LayerBoardGrid";

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

const STRAND_LABEL = {
  green: "STRANDING: GREEN — no reachable stranded states",
  amber: "STRANDING: AMBER — optional stranding (safe path remains)",
  red: "STRANDING: RED — Goal unreachable from Start",
  unknown: "STRANDING: UNKNOWN — search limit",
} as const;

function strandClass(sev: StrandingReport["severity"]): string {
  if (sev === "green") return "tp-simOk";
  if (sev === "amber") return "tp-simWarn";
  if (sev === "unknown") return "tp-simWarn";
  return "tp-simBad";
}

export function AuditView({ track, world, scenario, onJumpToFeature }: AuditViewProps) {
  const items = useMemo(() => auditTrack(track, world, scenario), [track, world, scenario]);
  const summary = useMemo(() => auditSummary(items), [items]);
  const structural = useMemo(() => trackStructuralStatus(items), [items]);
  const fingerprint = useMemo(() => trackSolverFingerprint(track), [track]);

  const [stranding, setStranding] = useState<StrandingReport | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setStranding(null);
  }, [fingerprint]);

  const runStranding = () => {
    setRunning(true);
    window.setTimeout(() => {
      try {
        setStranding(runStrandingAnalysis(track));
      } catch (e) {
        console.error(e);
        setStranding(null);
      } finally {
        setRunning(false);
      }
    }, 0);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items]);

  const overlay = useMemo(() => {
    if (!stranding) return new Set<string>();
    const ids = new Set<string>();
    for (const h of stranding.hexSummaries) {
      if (h.classification === "stranded" || h.classification === "risky") {
        ids.add(h.hexId);
      }
    }
    return ids;
  }, [stranding]);

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

      <section className="tp-auditSection tp-strandingSection">
        <h3>STRANDING / REACHABILITY</h3>
        <div className="tp-toolbar tp-simToolbar">
          <button type="button" className="btn primary" onClick={runStranding} disabled={running}>
            {running ? "Analyzing…" : "Run Stranding Analysis"}
          </button>
          {stranding ? (
            <button type="button" className="btn" onClick={runStranding} disabled={running}>
              Re-run
            </button>
          ) : null}
        </div>

        {stranding ? (
          <div className="tp-strandingResults">
            <p className={strandClass(stranding.severity)}>
              {stranding.outcome === "structural_error"
                ? `STRANDING: CANNOT ANALYZE — ${stranding.structuralMessage ?? "structural error"}`
                : STRAND_LABEL[stranding.severity]}
            </p>
            {stranding.outcome !== "structural_error" ? (
              <ul className="tp-simStats">
                <li>Reachable states: {stranding.reachableStateCount}</li>
                <li>Safe (Goal-reaching) states: {stranding.safeStateCount}</li>
                <li>Stranded states: {stranding.strandedStateCount}</li>
                <li>Risky positions: {stranding.riskyPositionCount}</li>
                <li>
                  Optional stranding: {stranding.hasOptionalStranding ? "YES" : "NO"}
                  {" · "}
                  Unavoidable failure: {stranding.hasUnavoidableFailure ? "YES" : "NO"}
                </li>
                <li>
                  Explored: {stranding.exploredNodes} · {Math.round(stranding.runtimeMs)} ms
                </li>
              </ul>
            ) : null}

            {stranding.layerSummaries.length > 0 ? (
              <div className="tp-strandingLayers">
                <div className="tp-simPathTitle">Layers</div>
                <ul className="tp-simStats">
                  {stranding.layerSummaries.map((L) => (
                    <li key={L.layer}>
                      Layer {L.layer}: {L.strandedStateCount} stranded states
                      {L.riskyPositionCount ? `, ${L.riskyPositionCount} risky positions` : ""}
                      {L.strandedPositionCount
                        ? `, ${L.strandedPositionCount} always-stranded positions`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {stranding.portalWarnings.length > 0 ? (
              <div className="tp-strandingPortals">
                <div className="tp-simPathTitle">Portal warnings</div>
                <ul className="tp-simStats">
                  {stranding.portalWarnings.slice(0, 8).map((p, i) => (
                    <li key={`${p.portalHexId}-${i}`}>
                      Portal {p.portalType} at {p.portalHexId} → {p.destinationHexId} → stranded (
                      {p.strandedPlayerHexId})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {stranding.exampleBadPath.length > 0 ? (
              <div className="tp-simPath">
                <div className="tp-simPathTitle">Example bad path (Start → stranded)</div>
                <ol className="tp-simPathList">
                  {stranding.exampleBadPath.map((step) => (
                    <li key={step.moveNumber}>
                      <span className="tp-simPathMove">#{step.moveNumber}</span> {step.moveTarget}
                      {step.portalType ? (
                        <span className="tp-simPortalTag"> {step.portalType}</span>
                      ) : null}
                      <span className="tp-simPathMeta"> → {step.playerAfter}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {stranding.strandedSamples.length > 0 ? (
              <div className="tp-strandingSamples">
                <div className="tp-simPathTitle">Sample stranded states</div>
                <ul className="tp-simStats">
                  {stranding.strandedSamples.slice(0, 5).map((s) => (
                    <li key={s.stateKey}>
                      L{s.layer} {s.playerHexId} · depth {s.depth}
                      {s.rowPhaseHint ? ` · rows[${s.rowPhaseHint}]` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {overlay.size > 0 ? (
              <AllLayersBoard track={track} solutionOverlay={overlay} highlightFeatures={false} />
            ) : null}
          </div>
        ) : (
          <p className="tp-hint">
            Finds legally reachable states from which Goal is impossible. Separate from structural
            Audit and from optimal-path Simulator.
          </p>
        )}
      </section>

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
