import React from "react";
import type { PlannerTrack, Pos } from "../types";
import { AllLayersBoard } from "../components/LayerBoardGrid";
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
  const layerBoard = track.layers.find((l) => l.layer === selectedLayer);

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
        <span className="tp-toolbarLabel">Board tool:</span>
        <span className="tp-hint">Use parent toolbar for Remove / Restore</span>
        <label className="tp-jumpLayer">
          Jump layer
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
      </div>

      {layerBoard ? (
        <RowMovementControls
          layer={selectedLayer}
          rowMovement={layerBoard.rowMovement}
          onChange={(row, inst) => onTrackChange(setRowMovement(track, selectedLayer, row, inst))}
        />
      ) : null}

      <AllLayersBoard
        track={track}
        selectedSlot={selectedSlot}
        onSlotClick={(pos) => handleSlot(pos)}
      />
    </div>
  );
}
