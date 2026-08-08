import React, { useMemo, useState } from "react";
import type { PlannerScenario, PlannerTrack, VisibilityOverlay, VisibilityStateType } from "../types";
import { LayerBoardGrid } from "../components/LayerBoardGrid";
import { visibilityStateLabel } from "../visibility/visibilityRuntimeMapping";
import {
  addMaskPosition,
  clearMaskPositions,
  inBoardBounds,
  isMissingHex,
  maskPositionsOnLayer,
  removeMaskPosition,
} from "../visibility/visibilityMask";

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

type MaskPaintMode = "add" | "remove" | null;

type VisibilityViewProps = {
  track: PlannerTrack;
  scenario?: PlannerScenario;
  onTrackChange: (track: PlannerTrack) => void;
};

function defaultOverlay(): VisibilityOverlay {
  return { id: "vis_default", state: "REGULAR", coverage: "FULL_BOARD", positions: [] };
}

function overlaySummary(overlay: VisibilityOverlay): string {
  const coverage =
    overlay.coverage === "FULL_BOARD"
      ? "Full board"
      : `Custom mask (${overlay.positions.length} hex${overlay.positions.length === 1 ? "" : "es"})`;
  const extras: string[] = [];
  if (overlay.state === "LANTERN" && overlay.lanternRadius != null) {
    extras.push(`radius ${overlay.lanternRadius}`);
  }
  if (overlay.state === "MEMORY" && overlay.memoryRevealSec != null) {
    extras.push(`${overlay.memoryRevealSec}s reveal`);
  }
  if (overlay.movement && overlay.movement.direction !== "NONE" && overlay.movement.amount > 0) {
    extras.push(`movement ${overlay.movement.direction} ${overlay.movement.amount} (future)`);
  }
  return [coverage, ...extras].join(" · ");
}

export function VisibilityView({ track, scenario, onTrackChange }: VisibilityViewProps) {
  const overlays = track.visibility.length ? track.visibility : [defaultOverlay()];
  const [selectedOverlayId, setSelectedOverlayId] = useState(overlays[0]?.id ?? "vis_default");
  const [selectedLayer, setSelectedLayer] = useState(7);
  const [maskPaintMode, setMaskPaintMode] = useState<MaskPaintMode>(null);

  const selectedOverlay =
    overlays.find((o) => o.id === selectedOverlayId) ?? overlays[0] ?? defaultOverlay();

  const updateOverlays = (next: VisibilityOverlay[]) => {
    onTrackChange({ ...track, visibility: next });
  };

  const updateSelected = (patch: Partial<VisibilityOverlay>) => {
    updateOverlays(
      overlays.map((o) => (o.id === selectedOverlay.id ? { ...o, ...patch } : o)),
    );
  };

  const setState = (state: VisibilityStateType) => {
    if (state === "REGULAR") {
      updateOverlays([{ ...selectedOverlay, state, coverage: "FULL_BOARD", positions: [] }]);
      setMaskPaintMode(null);
      return;
    }
    updateSelected({ state });
  };

  const maskOnLayer = useMemo(
    () =>
      selectedOverlay.coverage === "CUSTOM"
        ? maskPositionsOnLayer(selectedOverlay.positions, selectedLayer)
        : [],
    [selectedOverlay.coverage, selectedOverlay.positions, selectedLayer],
  );

  const handleMaskClick = (pos: { layer: number; row: number; col: number }) => {
    if (!maskPaintMode || selectedOverlay.coverage !== "CUSTOM") return;
    if (!inBoardBounds(pos) || isMissingHex(track, pos)) return;
    let next: typeof selectedOverlay.positions;
    if (maskPaintMode === "add") {
      next = addMaskPosition(selectedOverlay.positions, pos);
    } else {
      next = removeMaskPosition(selectedOverlay.positions, pos);
    }
    updateSelected({ positions: next });
  };

  const presentationLabel = scenario
    ? `${scenario.name} presentation`
    : "Scenario presentation";

  return (
    <div className={`tp-visibilityView${maskPaintMode ? " tp-maskPaintActive" : ""}`}>
      <header className="tp-visHeader">
        <h2>Visibility / Weather</h2>
        <p className="tp-hint">
          Editing <strong>{presentationLabel}</strong>. Board and Features are shared across cloud
          variants; visibility is per ScenarioEntry browse row.
        </p>
        <p className="tp-hint">
          Visibility overlays are separate from board geometry. Missing hex ≠ Invisible hex.
        </p>
      </header>

      <aside className="tp-visInventory">
        <h3>Overlays ({overlays.length})</h3>
        <ul className="tp-visInventoryList">
          {overlays.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={`btn tp-listBtn${selectedOverlay.id === o.id ? " active" : ""}`}
                onClick={() => {
                  setSelectedOverlayId(o.id);
                  setMaskPaintMode(null);
                }}
              >
                <span className="tp-visBadge">{visibilityStateLabel(o.state)}</span>
                {overlaySummary(o)}
              </button>
            </li>
          ))}
        </ul>
        {overlays.length > 1 ? (
          <p className="tp-hint tp-visWarn">
            Runtime exports the first overlay only. Additional overlays are authoring metadata.
          </p>
        ) : null}
      </aside>

      <div className="tp-visControls">
        <h3>State</h3>
        <div className="tp-visGrid">
          {VISIBILITY_STATES.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn tp-visBtn${selectedOverlay.state === s ? " active" : ""}`}
              onClick={() => setState(s)}
            >
              {visibilityStateLabel(s)}
            </button>
          ))}
        </div>

        {selectedOverlay.state !== "REGULAR" ? (
          <>
            <h3>Coverage</h3>
            <div className="tp-toolbar">
              <label>
                Coverage
                <select
                  className="tp-select"
                  value={selectedOverlay.coverage}
                  onChange={(e) => {
                    const coverage = e.target.value as "FULL_BOARD" | "CUSTOM";
                    updateSelected({
                      coverage,
                      positions: coverage === "FULL_BOARD" ? [] : selectedOverlay.positions,
                    });
                    if (coverage === "FULL_BOARD") setMaskPaintMode(null);
                  }}
                >
                  <option value="FULL_BOARD">Full board</option>
                  <option value="CUSTOM">Custom mask</option>
                </select>
              </label>
            </div>

            {selectedOverlay.coverage === "CUSTOM" ? (
              <div className="tp-maskTools">
                <p className="tp-hint">
                  Custom masks use canonical logical positions. Runtime application is deferred —
                  metadata is preserved for export.
                </p>
                <div className="tp-maskToolRow">
                  <button
                    type="button"
                    className={`btn${maskPaintMode === "add" ? " active" : ""}`}
                    onClick={() => setMaskPaintMode((m) => (m === "add" ? null : "add"))}
                  >
                    Paint mask
                  </button>
                  <button
                    type="button"
                    className={`btn${maskPaintMode === "remove" ? " active" : ""}`}
                    onClick={() => setMaskPaintMode((m) => (m === "remove" ? null : "remove"))}
                  >
                    Erase mask
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      updateSelected({ positions: clearMaskPositions() });
                      setMaskPaintMode(null);
                    }}
                  >
                    Clear mask
                  </button>
                  {maskPaintMode ? (
                    <button type="button" className="btn" onClick={() => setMaskPaintMode(null)}>
                      Exit paint
                    </button>
                  ) : null}
                </div>
                <p className="tp-selectionHint">
                  Mask: {selectedOverlay.positions.length} position
                  {selectedOverlay.positions.length === 1 ? "" : "s"}
                  {maskPaintMode === "add"
                    ? " — tap hexes to add"
                    : maskPaintMode === "remove"
                      ? " — tap hexes to remove"
                      : ""}
                </p>
              </div>
            ) : null}

            {selectedOverlay.state === "LANTERN" ? (
              <label className="tp-paramField">
                Lantern radius (hex steps)
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={selectedOverlay.lanternRadius ?? 2}
                  onChange={(e) =>
                    updateSelected({ lanternRadius: Number(e.target.value) || 2 })
                  }
                />
              </label>
            ) : null}

            {selectedOverlay.state === "MEMORY" ? (
              <label className="tp-paramField">
                Memory reveal (seconds)
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={selectedOverlay.memoryRevealSec ?? 5}
                  onChange={(e) =>
                    updateSelected({ memoryRevealSec: Number(e.target.value) || 5 })
                  }
                />
              </label>
            ) : null}

            <details className="tp-futureMeta">
              <summary>Future overlay movement (authoring only)</summary>
              <p className="tp-hint">
                Independent moving weather overlays are not implemented in production runtime.
              </p>
              <label>
                Direction
                <select
                  value={selectedOverlay.movement?.direction ?? "NONE"}
                  onChange={(e) =>
                    updateSelected({
                      movement: {
                        direction: e.target.value as "NONE" | "LEFT" | "RIGHT",
                        amount: selectedOverlay.movement?.amount ?? 0,
                      },
                    })
                  }
                >
                  <option value="NONE">None</option>
                  <option value="LEFT">Left</option>
                  <option value="RIGHT">Right</option>
                </select>
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={selectedOverlay.movement?.amount ?? 0}
                  onChange={(e) =>
                    updateSelected({
                      movement: {
                        direction: selectedOverlay.movement?.direction ?? "NONE",
                        amount: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </label>
            </details>
          </>
        ) : (
          <p className="tp-hint">Regular visibility — no special cloud or weather overlay.</p>
        )}
      </div>

      <div className="tp-visBoardWrap">
        <label className="tp-jumpLayer">
          Layer
          <select
            className="tp-select"
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(Number(e.target.value))}
          >
            {[7, 6, 5, 4, 3, 2, 1].map((l) => (
              <option key={l} value={l}>
                Layer {l}
              </option>
            ))}
          </select>
        </label>

        <LayerBoardGrid
          track={track}
          layer={selectedLayer}
          highlightFeatures={false}
          maskPositions={selectedOverlay.coverage === "CUSTOM" ? maskOnLayer : undefined}
          allMaskPositions={
            selectedOverlay.coverage === "CUSTOM" ? selectedOverlay.positions : undefined
          }
          onSlotClick={(pos) => handleMaskClick(pos)}
          allowMissingClick={false}
        />
      </div>
    </div>
  );
}
