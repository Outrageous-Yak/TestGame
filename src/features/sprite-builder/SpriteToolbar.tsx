import React from "react";
import type { SpriteTool } from "./spriteTypes";

type SpriteToolbarProps = {
  tool: SpriteTool;
  onToolChange: (tool: SpriteTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onMirror: () => void;
  onClear: () => void;
};

const TOOLS: Array<{ id: SpriteTool; label: string; shortcut: string }> = [
  { id: "pencil", label: "Pencil", shortcut: "B" },
  { id: "eraser", label: "Eraser", shortcut: "E" },
  { id: "eyedropper", label: "Pick", shortcut: "I" },
  { id: "fill", label: "Fill", shortcut: "G" },
];

export function SpriteToolbar({
  tool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onMirror,
  onClear,
}: SpriteToolbarProps) {
  return (
    <div className="spriteToolbar" role="toolbar" aria-label="Sprite drawing tools">
      <div className="spriteToolGroup" role="group" aria-label="Drawing tools">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={"spriteToolBtn" + (tool === t.id ? " active" : "")}
            onClick={() => onToolChange(t.id)}
            aria-pressed={tool === t.id}
            title={`${t.label} (${t.shortcut})`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="spriteToolGroup" role="group" aria-label="Edit actions">
        <button type="button" className="spriteToolBtn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          Undo
        </button>
        <button type="button" className="spriteToolBtn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
          Redo
        </button>
        <button type="button" className="spriteToolBtn" onClick={onMirror} title="Mirror horizontal">
          Mirror
        </button>
        <button type="button" className="spriteToolBtn danger" onClick={onClear} title="Clear canvas">
          Clear
        </button>
      </div>
    </div>
  );
}
