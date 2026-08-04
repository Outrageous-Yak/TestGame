import React, { useMemo } from "react";
import type { StudioTrackRef } from "../studioCatalog";
import type { SimilarityBreakdown } from "../../../engine/trackAnalysis";

type SimilarityPanelProps = {
  catalog: StudioTrackRef[];
  trackAKey: string;
  trackBKey: string;
  onTrackAChange: (key: string) => void;
  onTrackBChange: (key: string) => void;
  similarity: SimilarityBreakdown | null;
  loading?: boolean;
};

export function SimilarityPanel({
  catalog,
  trackAKey,
  trackBKey,
  onTrackAChange,
  onTrackBChange,
  similarity,
  loading,
}: SimilarityPanelProps) {
  const options = useMemo(
    () =>
      catalog.map((t) => (
        <option key={t.key} value={t.key}>
          {t.worldName} — {t.trackName}
        </option>
      )),
    [catalog]
  );

  return (
    <div className="ps-panel">
      <div className="ps-panelHead">Similarity</div>
      <div className="ps-simPickers">
        <label>
          Track A
          <select value={trackAKey} onChange={(e) => onTrackAChange(e.target.value)}>
            {options}
          </select>
        </label>
        <label>
          Track B
          <select value={trackBKey} onChange={(e) => onTrackBChange(e.target.value)}>
            {options}
          </select>
        </label>
      </div>
      {loading ? <p className="ps-muted">Comparing…</p> : null}
      {similarity ? (
        <table className="ps-simTable">
          <tbody>
            <SimRow label="Geometry" value={similarity.geometryPercent} />
            <SimRow label="Portals" value={similarity.portalPercent} />
            <SimRow label="Routes" value={similarity.routePercent} />
            <SimRow label="Layers" value={similarity.layerPercent} />
            <SimRow label="Moving rows" value={similarity.movingRowPercent} />
            <SimRow label="Gate (max)" value={similarity.maxPercent} highlight />
            <SimRow label="Full max" value={similarity.fullMaxPercent} />
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function SimRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "highlight" : ""}>
      <td>{label}</td>
      <td>{value.toFixed(1)}%</td>
    </tr>
  );
}
