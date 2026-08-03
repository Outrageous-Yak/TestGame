import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SavedCharacter, SavedPixelSprite, SavedPixelSpriteSheet, SpriteTool } from "./spriteTypes";
import { isSpriteSheet, characterAsSingleFrameSprite } from "./spriteTypes";
import { SpriteCanvas } from "./SpriteCanvas";
import { SpriteToolbar } from "./SpriteToolbar";
import { SpritePalette } from "./SpritePalette";
import { SpritePreview } from "./SpritePreview";
import { UnsavedChangesModal } from "./UnsavedChangesModal";
import { FrameStrip } from "./FrameStrip";
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
import {
  addSheetFrame,
  deleteSheetFrame,
  duplicateCharacter,
  updateSheetFrame,
} from "./spriteStorage";

type SpriteBuilderProps = {
  initialCharacter: SavedCharacter;
  onSave: (character: SavedCharacter) => void;
  onCancel: () => void;
  isNew?: boolean;
};

const TOOL_SHORTCUTS: Record<string, SpriteTool> = {
  b: "pencil",
  e: "eraser",
  i: "eyedropper",
  g: "fill",
};

export function SpriteBuilder({ initialCharacter, onSave, onCancel, isNew }: SpriteBuilderProps) {
  const [character, setCharacter] = useState<SavedCharacter>(() => structuredClone(initialCharacter) as SavedCharacter);
  const [currentFrame, setCurrentFrame] = useState(0);
  const initialPixels = isSpriteSheet(initialCharacter)
    ? initialCharacter.frames[0]!
    : initialCharacter.pixels;

  const [history, setHistory] = useState<SpriteHistory>(() => createHistory(initialPixels));
  const [tool, setTool] = useState<SpriteTool>("pencil");
  const [colorIndex, setColorIndex] = useState(2);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [zoom, setZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 8 : 10));
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOnionSkin, setShowOnionSkin] = useState(false);
  const playStart = useRef(performance.now());
  const [playTick, setPlayTick] = useState(0);

  const frameDurationMs = useMemo(() => {
    if (!isSpriteSheet(character) || !character.animation?.length) return 150;
    return character.animation[0]!.frameDurationMs;
  }, [character]);

  const savedSnapshot = useMemo(
    () => JSON.stringify(initialCharacter),
    [initialCharacter.id, initialCharacter.updatedAt]
  );
  const dirty = useMemo(() => JSON.stringify(character) !== savedSnapshot, [character, savedSnapshot]);

  const framePixels = useMemo(() => {
    if (isSpriteSheet(character)) return character.frames[currentFrame] ?? character.frames[0]!;
    return character.pixels;
  }, [character, currentFrame]);

  const previewSprite: SavedPixelSprite = useMemo(
    () => characterAsSingleFrameSprite(character, currentFrame),
    [character, currentFrame, playTick]
  );

  useEffect(() => {
    setHistory(createHistory(framePixels));
  }, [currentFrame, character.id]);

  useEffect(() => {
    const onResize = () => setZoom(window.innerWidth < 640 ? 8 : 10);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isPlaying || !isSpriteSheet(character)) return;
    let raf = 0;
    const tick = () => {
      setPlayTick(performance.now() - playStart.current);
      const count = character.frames.length;
      const duration = frameDurationMs * count;
      const elapsed = performance.now() - playStart.current;
      const next = Math.floor((elapsed % duration) / frameDurationMs) % count;
      setCurrentFrame(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, character, frameDurationMs]);

  const commitFramePixels = useCallback(
    (nextPixels: number[]) => {
      if (isSpriteSheet(character)) {
        setCharacter(updateSheetFrame(character, currentFrame, nextPixels));
      } else {
        setCharacter({ ...character, pixels: nextPixels, updatedAt: Date.now() });
      }
    },
    [character, currentFrame]
  );

  const updatePixels = useCallback(
    (nextPixels: number[]) => {
      setHistory((h) => pushHistory(h, nextPixels));
      commitFramePixels(nextPixels);
    },
    [commitFramePixels]
  );

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
      commitFramePixels(px);
      return next;
    });
  };

  const handleRedo = () => {
    setHistory((h) => {
      const next = redoHistory(h);
      const px = currentPixels(next);
      commitFramePixels(px);
      return next;
    });
  };

  const handleSave = () => {
    const toSave = { ...character, updatedAt: Date.now() };
    invalidateSpriteCache(toSave.id);
    onSave(toSave);
  };

  const tryCancel = () => {
    if (dirty) setShowUnsaved(true);
    else onCancel();
  };

  const selectFrame = (index: number) => {
    setIsPlaying(false);
    setCurrentFrame(index);
  };

  const handleDuplicateFrame = () => {
    if (!isSpriteSheet(character)) return;
    const dup = [...pixels];
    setCharacter(addSheetFrame(character, dup));
    setCurrentFrame(character.frames.length);
  };

  const handleAddFrame = () => {
    if (!isSpriteSheet(character)) return;
    setCharacter(addSheetFrame(character));
    setCurrentFrame(character.frames.length);
  };

  const handleDeleteFrame = () => {
    if (!isSpriteSheet(character)) return;
    const next = deleteSheetFrame(character, currentFrame);
    setCharacter(next);
    setCurrentFrame(Math.min(currentFrame, next.frames.length - 1));
  };

  const handleCopyPrevious = () => {
    if (!isSpriteSheet(character) || currentFrame === 0) return;
    const prev = character.frames[currentFrame - 1]!;
    updatePixels([...prev]);
  };

  const setFrameDuration = (ms: number) => {
    if (!isSpriteSheet(character)) return;
    const animation = character.animation?.length
      ? character.animation.map((a, i) => (i === 0 ? { ...a, frameDurationMs: ms } : a))
      : [{ name: "default", frameIndices: character.frames.map((_, i) => i), frameDurationMs: ms, loop: true }];
    setCharacter({ ...character, animation, updatedAt: Date.now() });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && key === "y") {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
      const mapped = TOOL_SHORTCUTS[key];
      if (mapped) setTool(mapped);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onionPixels =
    showOnionSkin && isSpriteSheet(character) && currentFrame > 0
      ? character.frames[currentFrame - 1]
      : null;

  return (
    <div className="spriteBuilder">
      <div className="spriteBuilderHeader">
        <input
          className="spriteNameInput"
          value={character.name}
          onChange={(e) => setCharacter((c) => ({ ...c, name: e.target.value }))}
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

      {isSpriteSheet(character) ? (
        <FrameStrip
          character={character}
          currentFrame={currentFrame}
          onSelectFrame={selectFrame}
          onDuplicateFrame={handleDuplicateFrame}
          onAddFrame={handleAddFrame}
          onDeleteFrame={handleDeleteFrame}
          onCopyPrevious={handleCopyPrevious}
          onPlayToggle={() => {
            if (!isPlaying) playStart.current = performance.now();
            setIsPlaying((p) => !p);
          }}
          isPlaying={isPlaying}
          frameDurationMs={frameDurationMs}
          onFrameDurationChange={setFrameDuration}
          showOnionSkin={showOnionSkin}
          onToggleOnionSkin={() => setShowOnionSkin((v) => !v)}
        />
      ) : null}

      <SpriteToolbar
        tool={tool}
        onToolChange={setTool}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onMirror={() => updatePixels(mirrorHorizontal(pixels))}
        onClear={() => updatePixels(clearPixels())}
      />

      <div className="spriteBuilderMain">
        <div className="spriteCanvasWrap">
          {onionPixels ? (
            <div className="onionSkinLayer" aria-hidden="true">
              <SpriteCanvas
                pixels={onionPixels}
                palette={character.palette}
                tool="pencil"
                colorIndex={0}
                zoom={zoom}
                onPaintStroke={() => {}}
                onFill={() => {}}
                onPickColor={() => {}}
              />
            </div>
          ) : null}
          <SpriteCanvas
            pixels={pixels}
            palette={character.palette}
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
          <SpritePalette palette={character.palette} selectedIndex={colorIndex} onSelect={setColorIndex} />
          {isNew ? <p className="spriteHint">Edit pixels, then save your character.</p> : null}
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

export { duplicateCharacter };
