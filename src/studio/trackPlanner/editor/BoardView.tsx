import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PlannerTrack, Pos } from "../types";
import { emptyLayerBoard } from "../types";
import { AllLayersBoard, LayerBoardGrid } from "../components/LayerBoardGrid";
import { RowMovementControls } from "../components/RowMovementControls";
import { setRowMovement, toggleMissingHex } from "../state/authoringState";
import { validateBoard } from "../boardValidation";
import { buildMovementPreviewState } from "../boardMovementPreview";

type BoardViewProps = {
  track: PlannerTrack;
  selectedLayer: number;
  boardTool: "select" | "remove" | "restore";
  selectedSlot: Pos | null;
  onTrackChange: (track: PlannerTrack) => void;
  onSelectSlot: (pos: Pos | null) => void;
  onSelectLayer: (layer: number) => void;
};

const LAYER_ORDER = [7, 6, 5, 4, 3, 2, 1] as const;

export function BoardView({
  track,
  selectedLayer,
  boardTool,
  selectedSlot,
  onTrackChange,
  onSelectSlot,
  onSelectLayer,
}: BoardViewProps) {
  const [previewSteps, setPreviewSteps] = useState(0);
  const layerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const validation = useMemo(() => validateBoard(track), [track]);
  const previewState = useMemo(
    () => (previewSteps > 0 ? buildMovementPreviewState(track, previewSteps) : null),
    [track, previewSteps],
  );

  useEffect(() => {
    setPreviewSteps(0);
  }, [track]);

  const handleTrackEdit = (next: PlannerTrack) => {
    setPreviewSteps(0);
    onTrackChange(next);
  };

  const handleSlot = (pos: Pos) => {
    onSelectSlot(pos);
    if (boardTool === "remove") {
      handleTrackEdit(toggleMissingHex(track, pos, true));
    } else if (boardTool === "restore") {
      handleTrackEdit(toggleMissingHex(track, pos, false));
    }
  };

  const jumpToLayer = (layer: number) => {
    onSelectLayer(layer);
    const el = layerRefs.current[layer];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const layerBoard = track.layers.find((l) => l.layer === selectedLayer) ?? emptyLayerBoard(selectedLayer);
  const canPreview = track.features.some((f) => f.kind === "start") && track.features.some((f) => f.kind === "goal");

  return (
    <div className="tp-boardView">
      <div className="tp-boardStatusBar">
        {validation.ok ? (
          <span className="tp-boardValid">✓ Board valid</span>
        ) : (
          <span className="tp-boardInvalid">✕ Board errors ({validation.errors.length})</span>
        )}
        {validation.warnings.length ? (
          <span className="tp-boardWarn">{validation.warnings.length} warning(s)</span>
        ) : null}
      </div>

      {validation.errors.length ? (
        <ul className="tp-validationList">
          {validation.errors.slice(0, 6).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="tp-toolbar tp-boardToolbar">
        <div className="tp-layerJump" role="toolbar" aria-label="Jump to layer">
          {LAYER_ORDER.map((l) => (
            <button
              key={l}
              type="button"
              className={`btn tp-layerJumpBtn${selectedLayer === l ? " active" : ""}`}
              onClick={() => jumpToLayer(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="tp-previewBar">
        <button
          type="button"
          className="btn tp-miniBtn"
          disabled={!canPreview}
          onClick={() => setPreviewSteps((n) => n + 1)}
        >
          Preview step
        </button>
        <button
          type="button"
          className="btn tp-miniBtn"
          disabled={previewSteps === 0}
          onClick={() => setPreviewSteps(0)}
        >
          Reset preview
        </button>
        <span className="tp-hint">Turn {previewSteps}</span>
      </div>

      <RowMovementControls
        layer={selectedLayer}
        rowMovement={layerBoard.rowMovement}
        onChange={(row, inst) => handleTrackEdit(setRowMovement(track, selectedLayer, row, inst))}
      />

      <div className="tp-boardScroll" ref={scrollRef}>
        <AllLayersBoard
          track={track}
          selectedSlot={selectedSlot}
          playState={previewState}
          showPlayer={previewSteps > 0}
          allowMissingClick={boardTool === "restore"}
          layerRefs={layerRefs}
          onSlotClick={(pos) => handleSlot(pos)}
        />
      </div>
    </div>
  );
}
