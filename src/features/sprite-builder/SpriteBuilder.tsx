import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedPixelSprite, SpriteTool } from "./spriteTypes";
import { SpriteCanvas } from "./SpriteCanvas";
import { SpriteToolbar } from "./SpriteToolbar";
import { SpritePalette } from "./SpritePalette";
import { SpritePreview } from "./SpritePreview";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { applyBrushStroke, clearPixels, floodFill, mirrorHorizontal, pixelsEqual } from "./spriteDrawing";
import {
  canRedo,
  canUndo,
  createHistory,
  currentPixels,
  pushHistory,
  redoHistory,
  undoHistory,
  type SpriteHistory,
} from "./spriteHistory";
import { invalidateSpriteCache } from "./spriteRenderer";

type SpriteBuilderProps = {
  initialSprite: SavedPixelSprite;
  onSave: (sprite: SavedPixelSprite) => void;
  onCancel: () => void;
  isNew?: boolean;
};

const TOOL_SHORTCUTS: Record<string, SpriteTool> = {
  b: "pencil",
  e: "eraser",
  i: "eyedropper",
  g: "fill",
};

export function SpriteBuilder({ initialSprite, onSave, onCancel, isNew }: SpriteBuilderProps) {
  const [sprite, setSprite] = useState<SavedPixelSprite>(() => ({
    ...initialSprite,
    palette: initialSprite.palette.map((c) => ({ ...c })),
    pixels: [...initialSprite.pixels],
  }));
  const [history, setHistory] = useState<SpriteHistory>(() => createHistory(initialSprite.pixels));
  const [tool, setTool] = useState<SpriteTool>("pencil");
  const [colorIndex, setColorIndex] = useState(2);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [zoom, setZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 8 : 10));

  const savedPixels = useMemo(() => initialSprite.pixels, [initialSprite.id, initialSprite.updatedAt]);
  const dirty = useMemo(() => !pixelsEqual(sprite.pixels, savedPixels), [sprite.pixels, savedPixels]);

  const previewSprite = useMemo(
    () => ({ ...sprite, pixels: currentPixels(history) }),
    [sprite, history]
  );

  useEffect(() => {
    const onResize = () => setZoom(window.innerWidth < 640 ? 8 : 10);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const updatePixels = useCallback((nextPixels: number[]) => {
    setHistory((h) => pushHistory(h, nextPixels));
    setSprite((s) => ({ ...s, pixels: nextPixels, updatedAt: Date.now() }));
  }, []);

  const pixels = currentPixels(history);

  const handlePaintStroke = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number, value: number) => {
      const next = applyBrushStroke(pixels, fromX, fromY, toX, toY, value);
      if (!pixelsEqual(next, pixels)) updatePixels(next);
    },
    [pixels, updatePixels]
  );

  const handleFill = useCallback(
    (x: number, y: number, value: number) => {
      const next = floodFill(pixels, x, y, value);
      if (!pixelsEqual(next, pixels)) updatePixels(next);
    },
    [pixels, updatePixels]
  );

  const handleUndo = () => {
    setHistory((h) => {
      const next = undoHistory(h);
      const px = currentPixels(next);
      setSprite((s) => ({ ...s, pixels: px }));
      return next;
    });
  };

  const handleRedo = () => {
    setHistory((h) => {
      const next = redoHistory(h);
      const px = currentPixels(next);
      setSprite((s) => ({ ...s, pixels: px }));
      return next;
    });
  };

  const handleMirror = () => updatePixels(mirrorHorizontal(pixels));
  const handleClear = () => updatePixels(clearPixels());

  const handleSave = () => {
    const toSave = { ...sprite, pixels: currentPixels(history), updatedAt: Date.now() };
    invalidateSpriteCache(toSave.id);
    onSave(toSave);
  };

  const tryCancel = () => {
    if (dirty) setShowUnsaved(true);
    else onCancel();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
        return;
      }
      const mapped = TOOL_SHORTCUTS[key];
      if (mapped) setTool(mapped);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="spriteBuilder">
      <div className="spriteBuilderHeader">
        <input
          className="spriteNameInput"
          value={sprite.name}
          onChange={(e) => setSprite((s) => ({ ...s, name: e.target.value }))}
          aria-label="Character name"
          maxLength={48}
        />
        <div className="spriteBuilderHeaderActions">
          <button type="button" className="btn primary" onClick={handleSave}>
            Save{dirty ? " *" : ""}
          </button>
          <button type="button" className="btn" onClick={tryCancel}>
            Back
          </button>
        </div>
      </div>

      <SpriteToolbar
        tool={tool}
        onToolChange={setTool}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onMirror={handleMirror}
        onClear={handleClear}
      />

      <div className="spriteBuilderMain">
        <div className="spriteCanvasWrap">
          <SpriteCanvas
            pixels={pixels}
            palette={sprite.palette}
            tool={tool}
            colorIndex={colorIndex}
            zoom={zoom}
            onPaintStroke={handlePaintStroke}
            onFill={handleFill}
            onPickColor={setColorIndex}
          />
        </div>

        <aside className="spriteBuilderSide">
          <div className="spritePreviewLabel">Preview</div>
          <SpritePreview sprite={previewSprite} size={128} />
          <SpritePalette palette={sprite.palette} selectedIndex={colorIndex} onSelect={setColorIndex} />
          {isNew ? <p className="spriteHint">New character — paint your 64×64 sprite.</p> : null}
        </aside>
      </div>

      {showUnsaved ? (
        <UnsavedChangesModal
          onSave={() => {
            setShowUnsaved(false);
            handleSave();
          }}
          onDiscard={() => {
            setShowUnsaved(false);
            onCancel();
          }}
          onCancel={() => setShowUnsaved(false)}
        />
      ) : null}
    </div>
  );
}
