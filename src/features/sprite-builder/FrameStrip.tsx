import React from "react";
import { renderCharacterFrameToCanvas } from "./spriteRenderer";
import type { SavedCharacter } from "./spriteTypes";
import { isSpriteSheet } from "./spriteTypes";

type FrameStripProps = {
  character: SavedCharacter;
  currentFrame: number;
  onSelectFrame: (index: number) => void;
  onDuplicateFrame: () => void;
  onAddFrame: () => void;
  onDeleteFrame: () => void;
  onCopyPrevious: () => void;
  onPlayToggle: () => void;
  isPlaying: boolean;
  frameDurationMs: number;
  onFrameDurationChange: (ms: number) => void;
  showOnionSkin: boolean;
  onToggleOnionSkin: () => void;
};

export function FrameStrip({
  character,
  currentFrame,
  onSelectFrame,
  onDuplicateFrame,
  onAddFrame,
  onDeleteFrame,
  onCopyPrevious,
  onPlayToggle,
  isPlaying,
  frameDurationMs,
  onFrameDurationChange,
  showOnionSkin,
  onToggleOnionSkin,
}: FrameStripProps) {
  if (!isSpriteSheet(character)) return null;

  return (
    <div className="frameStrip" aria-label="Animation frames">
      <div className="frameStripThumbs">
        {character.frames.map((_, i) => {
          const canvas = renderCharacterFrameToCanvas(character, i);
          const url = canvas.toDataURL("image/png");
          return (
            <button
              key={i}
              type="button"
              className={"frameThumb" + (currentFrame === i ? " active" : "")}
              onClick={() => onSelectFrame(i)}
              aria-label={`Frame ${i + 1}`}
              aria-pressed={currentFrame === i}
            >
              <img src={url} alt="" draggable={false} />
              <span className="frameThumbLabel">{i + 1}</span>
            </button>
          );
        })}
      </div>

      <div className="frameStripControls">
        <button type="button" className="spriteToolBtn" onClick={onDuplicateFrame}>
          Duplicate
        </button>
        <button type="button" className="spriteToolBtn" onClick={onAddFrame}>
          Add
        </button>
        <button type="button" className="spriteToolBtn" onClick={onDeleteFrame} disabled={character.frames.length <= 1}>
          Delete
        </button>
        <button type="button" className="spriteToolBtn" onClick={onCopyPrevious} disabled={currentFrame === 0}>
          Copy prev
        </button>
        <button type="button" className="spriteToolBtn" onClick={onPlayToggle}>
          {isPlaying ? "Stop" : "Play"}
        </button>
        <label className="frameDurationLabel">
          ms
          <input
            type="number"
            min={50}
            max={1000}
            step={10}
            value={frameDurationMs}
            onChange={(e) => onFrameDurationChange(Number(e.target.value))}
          />
        </label>
        <button type="button" className={"spriteToolBtn" + (showOnionSkin ? " active" : "")} onClick={onToggleOnionSkin}>
          Onion
        </button>
      </div>
    </div>
  );
}
