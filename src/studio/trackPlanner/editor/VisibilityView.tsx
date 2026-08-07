import React from "react";
import type { PlannerTrack, VisibilityStateType } from "../types";

const VISIBILITY_STATES: VisibilityStateType[] = [
  "REGULAR",
  "PARTLY_CLOUDY",
  "FULL_CLOUD",
  "NIGHT",
  "INVISIBLE",
  "MEMORY",
  "LANTERN",
  "CRYSTAL_VISION",
  "ECHO",
];

type VisibilityViewProps = {
  track: PlannerTrack;
  visibilityTool: VisibilityStateType;
  onTrackChange: (track: PlannerTrack) => void;
};

export function VisibilityView({ track, visibilityTool, onTrackChange }: VisibilityViewProps) {
  const overlay = track.visibility[0] ?? {
    id: "vis_default",
    state: "REGULAR" as VisibilityStateType,
    coverage: "FULL_BOARD" as const,
    positions: [],
  };

  const setState = (state: VisibilityStateType) => {
    onTrackChange({
      ...track,
      visibility: [{ ...overlay, state }],
    });
  };

  const setCoverage = (coverage: "FULL_BOARD" | "CUSTOM") => {
    onTrackChange({
      ...track,
      visibility: [{ ...overlay, coverage }],
    });
  };

  return (
    <div className="tp-visibilityView">
      <p className="tp-hint">
        Visibility overlays are separate from board geometry. Missing hex ≠ Invisible hex.
      </p>
      <div className="tp-visGrid">
        {VISIBILITY_STATES.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn tp-visBtn${overlay.state === s ? " active" : ""}`}
            onClick={() => setState(s)}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      <div className="tp-toolbar">
        <label>
          Coverage
          <select
            className="tp-select"
            value={overlay.coverage}
            onChange={(e) => setCoverage(e.target.value as "FULL_BOARD" | "CUSTOM")}
          >
            <option value="FULL_BOARD">Full board</option>
            <option value="CUSTOM">Custom mask</option>
          </select>
        </label>
        {overlay.state === "LANTERN" ? (
          <label>
            Radius
            <input
              type="number"
              min={1}
              max={4}
              value={overlay.lanternRadius ?? 1}
              onChange={(e) =>
                onTrackChange({
                  ...track,
                  visibility: [{ ...overlay, lanternRadius: Number(e.target.value) }],
                })
              }
            />
          </label>
        ) : null}
        {overlay.state === "MEMORY" ? (
          <label>
            Reveal (sec)
            <input
              type="number"
              min={1}
              max={30}
              value={overlay.memoryRevealSec ?? 5}
              onChange={(e) =>
                onTrackChange({
                  ...track,
                  visibility: [{ ...overlay, memoryRevealSec: Number(e.target.value) }],
                })
              }
            />
          </label>
        ) : null}
      </div>
      <p className="tp-hint">
        Active: <b>{overlay.state}</b> — {overlay.coverage}. Custom mask painting is deferred; use
        FULL_BOARD for v1.
      </p>
      <p className="tp-hint">Toolbar visibility tool: {visibilityTool}</p>
    </div>
  );
}
