import React, { useState } from "react";
import type { PlannerTrack, Pos } from "../types";
import { emptyLayerBoard } from "../types";
import { AllLayersBoard, LayerBoardGrid } from "../components/LayerBoardGrid";
import { RowMovementControls } from "../components/RowMovementControls";
import { setRowMovement, toggleMissingHex } from "../state/authoringState";

type BoardViewProps = {
  track: PlannerTrack;
  selectedLayer: number;
  boardTool: "select" | "remove" | "restore";
  selectedSlot: Pos | null;
  onTrackChange: (track: PlannerTrack) => void;
  onSelectSlot: (pos: Pos | null) => void;
  onSelectLayer: (layer: number) => void;
};

export function BoardView({
  track,
  selectedLayer,
  boardTool,
  selectedSlot,
  onTrackChange,
  onSelectSlot,
  onSelectLayer,
}: BoardViewProps) {
  const [showAllLayers, setShowAllLayers] = useState(false);
  const layerBoard = track.layers.find((l) => l.layer === selectedLayer) ?? emptyLayerBoard(selectedLayer);

  const handleSlot = (pos: Pos) => {
    onSelectSlot(pos);
    if (boardTool === "remove") {
      onTrackChange(toggleMissingHex(track, pos, true));
    } else if (boardTool === "restore") {
      onTrackChange(toggleMissingHex(track, pos, false));
    }
  };

  return (
    <div className="tp-boardView">
      <div className="tp-toolbar">
        <label className="tp-jumpLayer">
          Layer
          <select
            className="tp-select"
            value={selectedLayer}
            onChange={(e) => onSelectLayer(Number(e.target.value))}
          >
            {[7, 6, 5, 4, 3, 2, 1].map((l) => (
              <option key={l} value={l}>
                Layer {l}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`btn tp-miniBtn${showAllLayers ? " active" : ""}`}
          onClick={() => setShowAllLayers((v) => !v)}
        >
          {showAllLayers ? "Single layer" : "All layers"}
        </button>
      </div>

      <RowMovementControls
        layer={selectedLayer}
        rowMovement={layerBoard.rowMovement}
        onChange={(row, inst) => onTrackChange(setRowMovement(track, selectedLayer, row, inst))}
      />

      {showAllLayers ? (
        <AllLayersBoard
          track={track}
          selectedSlot={selectedSlot}
          onSlotClick={(pos) => handleSlot(pos)}
        />
      ) : (
        <LayerBoardGrid
          track={track}
          layer={selectedLayer}
          selectedSlot={selectedSlot}
          onSlotClick={(pos) => handleSlot(pos)}
        />
      )}
    </div>
  );
}
