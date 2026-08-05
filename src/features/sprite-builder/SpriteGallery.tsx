import React, { useState } from "react";
import type { SavedPixelSprite } from "./spriteTypes";
import { BUILTIN_SPRITE_ID } from "./spriteTypes";
import { SpritePreview } from "./SpritePreview";
import {
  ANIMATED_SPRITE_SHEETS,
  selectionIdForAnimatedSprite,
} from "./animatedSpriteSheets";
import { toPublicUrl } from "../../ui/game/helpers";

type SpriteGalleryProps = {
  sprites: SavedPixelSprite[];
  activeId: string | null;
  mode: "select" | "edit";
  onSelect?: (id: string | null) => void;
  onEdit?: (sprite: SavedPixelSprite) => void;
  onDuplicate?: (sprite: SavedPixelSprite) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
};

const BUILTIN_NAME = ANIMATED_SPRITE_SHEETS[0].name;

export function SpriteGallery({
  sprites,
  activeId,
  mode,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onRename,
}: SpriteGalleryProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const userSprites = sprites.filter((s) => !s.builtin);

  const startRename = (sprite: SavedPixelSprite) => {
    setRenamingId(sprite.id);
    setRenameValue(sprite.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim() && onRename) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="spriteGallery">
      {mode === "select" ? (
        <>
          {ANIMATED_SPRITE_SHEETS.map((sheet) => {
            const selectionId = selectionIdForAnimatedSprite(sheet);
            const isActive = activeId === selectionId;
            return (
              <div
                key={sheet.id}
                className={"spriteGalleryCard builtin" + (isActive ? " active" : "")}
              >
                <div
                  className="spriteGalleryThumb animatedSheetThumb"
                  style={
                    {
                      ["--sheetUrl" as string]: `url(${toPublicUrl(sheet.path)})`,
                    } as React.CSSProperties
                  }
                  aria-hidden="true"
                />
                <div className="spriteGalleryInfo">
                  <div className="spriteGalleryName">{sheet.name}</div>
                  <div className="spriteGalleryMeta">{sheet.description}</div>
                </div>
                <button
                  type="button"
                  className={"btn" + (isActive ? " primary" : "")}
                  onClick={() => onSelect?.(selectionId)}
                  aria-pressed={isActive}
                >
                  {isActive ? "Active" : "Use"}
                </button>
              </div>
            );
          })}
        </>
      ) : null}

      {sprites.map((sprite) => {
        const isActive = activeId === sprite.id;
        const isRenaming = renamingId === sprite.id;

        return (
          <div key={sprite.id} className={"spriteGalleryCard" + (isActive ? " active" : "")}>
            <SpritePreview sprite={sprite} size={64} />
            <div className="spriteGalleryInfo">
              {isRenaming ? (
                <input
                  className="spriteRenameInput"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  autoFocus
                  aria-label="Character name"
                />
              ) : (
                <>
                  <div className="spriteGalleryName">{sprite.name}</div>
                  <div className="spriteGalleryMeta">
                    {sprite.builtin ? "Template" : "Custom"}
                    {isActive ? " · Active" : ""}
                  </div>
                </>
              )}
            </div>

            <div className="spriteGalleryActions">
              {mode === "select" ? (
                <button
                  type="button"
                  className={"btn" + (isActive ? " primary" : "")}
                  onClick={() => onSelect?.(sprite.id)}
                  aria-pressed={isActive}
                >
                  {isActive ? "Active" : "Use"}
                </button>
              ) : (
                <>
                  <button type="button" className="btn primary" onClick={() => onEdit?.(sprite)}>
                    Edit
                  </button>
                  {!sprite.builtin ? (
                    <>
                      <button type="button" className="btn" onClick={() => startRename(sprite)}>
                        Rename
                      </button>
                      <button type="button" className="btn" onClick={() => onDuplicate?.(sprite)}>
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => onDelete?.(sprite.id)}
                        disabled={sprite.builtin}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn" onClick={() => onDuplicate?.(sprite)}>
                      Copy to edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {mode === "edit" && userSprites.length === 0 ? (
        <p className="spriteGalleryEmpty">No custom characters yet. Create one or copy a template.</p>
      ) : null}
    </div>
  );
}

export { BUILTIN_SPRITE_ID, BUILTIN_NAME };
