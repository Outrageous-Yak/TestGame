import React, { useState } from "react";
import type { SavedCharacter } from "./spriteTypes";
import { characterAsSingleFrameSprite, isSpriteSheet } from "./spriteTypes";
import { SpritePreview } from "./SpritePreview";

type SpriteGalleryProps = {
  characters: SavedCharacter[];
  activeId: string | null;
  mode: "select" | "edit";
  onSelect?: (id: string | null) => void;
  onEdit?: (character: SavedCharacter) => void;
  onDuplicate?: (character: SavedCharacter) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
};

const BUILTIN_NAME = "Default Character";

export function SpriteGallery({
  characters,
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

  const userCharacters = characters.filter((s) => !s.builtin);

  const startRename = (character: SavedCharacter) => {
    setRenamingId(character.id);
    setRenameValue(character.name);
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
        <div className="spriteGalleryCard builtin">
          <div className="spriteGalleryThumb builtinThumb" aria-hidden="true" />
          <div className="spriteGalleryInfo">
            <div className="spriteGalleryName">{BUILTIN_NAME}</div>
            <div className="spriteGalleryMeta">Built-in animated sprite</div>
          </div>
          <button
            type="button"
            className={"btn" + (activeId == null ? " primary" : "")}
            onClick={() => onSelect?.(null)}
            aria-pressed={activeId == null}
          >
            {activeId == null ? "Active" : "Use"}
          </button>
        </div>
      ) : null}

      {characters.map((character) => {
        const isActive = activeId === character.id;
        const isRenaming = renamingId === character.id;
        const preview = characterAsSingleFrameSprite(character, 0);

        return (
          <div key={character.id} className={"spriteGalleryCard" + (isActive ? " active" : "")}>
            <SpritePreview sprite={preview} size={64} />
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
                  <div className="spriteGalleryName">{character.name}</div>
                  <div className="spriteGalleryMeta">
                    {character.builtin ? "Template" : isSpriteSheet(character) ? `Sheet · ${character.frames.length} frames` : "Custom"}
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
                  onClick={() => onSelect?.(character.id)}
                  aria-pressed={isActive}
                >
                  {isActive ? "Active" : "Use"}
                </button>
              ) : (
                <>
                  <button type="button" className="btn primary" onClick={() => onEdit?.(character)}>
                    Edit
                  </button>
                  {!character.builtin ? (
                    <>
                      <button type="button" className="btn" onClick={() => startRename(character)}>
                        Rename
                      </button>
                      <button type="button" className="btn" onClick={() => onDuplicate?.(character)}>
                        Duplicate
                      </button>
                      <button type="button" className="btn danger" onClick={() => onDelete?.(character.id)}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn" onClick={() => onDuplicate?.(character)}>
                      Copy to edit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {mode === "edit" && userCharacters.length === 0 ? (
        <p className="spriteGalleryEmpty">No custom characters yet. Create one, import an image, or copy a template.</p>
      ) : null}
    </div>
  );
}

export { BUILTIN_NAME };
