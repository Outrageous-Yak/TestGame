import React from "react";
import type { OverlayOptions } from "./BoardViewer";

type StudioToolbarProps = {
  trackLabel: string;
  viewLayer: number;
  onLayerChange: (layer: number) => void;
  overlays: OverlayOptions;
  onOverlayChange: (patch: Partial<OverlayOptions>) => void;
  replayMode: boolean;
  onToggleReplayMode: () => void;
  onBack: () => void;
  onReanalyze: () => void;
  analyzing: boolean;
};

export function StudioToolbar({
  trackLabel,
  viewLayer,
  onLayerChange,
  overlays,
  onOverlayChange,
  replayMode,
  onToggleReplayMode,
  onBack,
  onReanalyze,
  analyzing,
}: StudioToolbarProps) {
  return (
    <div className="ps-toolbar">
      <button type="button" className="btn" onClick={onBack}>← Back</button>
      <span className="ps-toolbarTitle">Puzzle Studio</span>
      <span className="ps-toolbarTrack">{trackLabel}</span>

      <div className="ps-layerPicker">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((l) => (
          <button
            key={l}
            type="button"
            className={`btn${viewLayer === l ? " primary" : ""}`}
            onClick={() => onLayerChange(l)}
          >
            L{l}
          </button>
        ))}
      </div>

      <label className="ps-toggle">
        <input
          type="checkbox"
          checked={overlays.portals}
          onChange={(e) => onOverlayChange({ portals: e.target.checked })}
        />
        Portals
      </label>
      <label className="ps-toggle">
        <input
          type="checkbox"
          checked={overlays.missing}
          onChange={(e) => onOverlayChange({ missing: e.target.checked })}
        />
        Missing
      </label>
      <label className="ps-toggle">
        <input
          type="checkbox"
          checked={overlays.blocked}
          onChange={(e) => onOverlayChange({ blocked: e.target.checked })}
        />
        Blocked
      </label>
      <label className="ps-toggle">
        <input
          type="checkbox"
          checked={overlays.rowMovement}
          onChange={(e) => onOverlayChange({ rowMovement: e.target.checked })}
        />
        Rows
      </label>
      <label className="ps-toggle">
        <input
          type="checkbox"
          checked={overlays.heatMap}
          onChange={(e) => onOverlayChange({ heatMap: e.target.checked })}
        />
        Heat map
      </label>
      <label className="ps-toggle">
        <input
          type="checkbox"
          checked={overlays.animateRows}
          onChange={(e) => onOverlayChange({ animateRows: e.target.checked })}
        />
        Animate rows
      </label>

      <button type="button" className={`btn${replayMode ? " primary" : ""}`} onClick={onToggleReplayMode}>
        {replayMode ? "Playtest" : "Replay"}
      </button>
      <button type="button" className="btn" onClick={onReanalyze} disabled={analyzing}>
        {analyzing ? "Analyzing…" : "Re-analyze"}
      </button>
    </div>
  );
}
