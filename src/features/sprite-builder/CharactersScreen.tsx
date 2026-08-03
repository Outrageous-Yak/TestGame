import React, { useCallback, useState } from "react";
import type { SavedPixelSprite } from "./spriteTypes";
import { createBlankSprite, cloneSprite } from "./spriteConstants";
import { SpriteBuilder } from "./SpriteBuilder";
import { SpriteGallery } from "./SpriteGallery";
import {
  deleteSprite,
  duplicateSprite,
  loadActiveSpriteId,
  loadSprites,
  renameSprite,
  saveActiveSpriteId,
  saveSprites,
  safeActiveIdAfterDelete,
  upsertSprite,
} from "./spriteStorage";

type CharactersView = "menu" | "select" | "create" | "edit-list" | "builder";

type CharactersScreenProps = {
  themeVars: React.CSSProperties;
  onBack: () => void;
  onActiveChange?: (activeId: string | null) => void;
};

export function CharactersScreen({ themeVars, onBack, onActiveChange }: CharactersScreenProps) {
  const [view, setView] = useState<CharactersView>("menu");
  const [sprites, setSprites] = useState<SavedPixelSprite[]>(() => loadSprites());
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveSpriteId());
  const [editingSprite, setEditingSprite] = useState<SavedPixelSprite | null>(null);
  const [isNewSprite, setIsNewSprite] = useState(false);

  const persistSprites = useCallback((next: SavedPixelSprite[]) => {
    setSprites(next);
    saveSprites(next);
  }, []);

  const setActive = useCallback(
    (id: string | null) => {
      setActiveId(id);
      saveActiveSpriteId(id);
      onActiveChange?.(id);
    },
    [onActiveChange]
  );

  const handleSave = (sprite: SavedPixelSprite) => {
    const next = upsertSprite(sprites, sprite);
    persistSprites(next);
    setEditingSprite(null);
    setIsNewSprite(false);
    if (view === "create") setView("menu");
    else if (view === "builder") setView("edit-list");
  };

  const handleCreate = () => {
    const blank = createBlankSprite();
    setEditingSprite(blank);
    setIsNewSprite(true);
    setView("builder");
  };

  const handleEdit = (sprite: SavedPixelSprite) => {
    if (sprite.builtin) {
      const copy = duplicateSprite(sprite);
      setEditingSprite(copy);
      setIsNewSprite(true);
    } else {
      setEditingSprite(cloneSprite(sprite));
      setIsNewSprite(false);
    }
    setView("builder");
  };

  const handleDuplicate = (sprite: SavedPixelSprite) => {
    const copy = duplicateSprite(sprite);
    persistSprites(upsertSprite(sprites, copy));
  };

  const handleDelete = (id: string) => {
    const next = deleteSprite(sprites, id);
    persistSprites(next);
    const nextActive = safeActiveIdAfterDelete(activeId, id);
    if (nextActive !== activeId) setActive(nextActive);
  };

  const handleRename = (id: string, name: string) => {
    persistSprites(renameSprite(sprites, id, name));
  };

  if (view === "builder" && editingSprite) {
    return (
      <div className="appRoot" style={themeVars}>
        <div className="topbar">
          <button type="button" className="btn" onClick={() => setView(isNewSprite ? "create" : "edit-list")}>
            ← Characters
          </button>
          <div className="spacer" />
          <span className="topbarTitle">Sprite Builder</span>
        </div>
        <div className="screen spriteScreen">
          <SpriteBuilder
            initialSprite={editingSprite}
            isNew={isNewSprite}
            onSave={handleSave}
            onCancel={() => setView(isNewSprite ? "menu" : "edit-list")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="appRoot" style={themeVars}>
      <div className="topbar">
        <button type="button" className="btn" onClick={onBack}>
          ← Back
        </button>
        <div className="spacer" />
        <span className="topbarTitle">Characters</span>
      </div>

      <div className="screen center spriteScreen">
        <div className="panel wide charactersPanel">
          {view === "menu" ? (
            <>
              <div className="title">Characters</div>
              <div className="sub">Create pixel characters or choose one to play.</div>
              <div className="charactersMenu">
                <button type="button" className="btn primary charactersMenuBtn" onClick={() => setView("select")}>
                  Select Character
                </button>
                <button type="button" className="btn charactersMenuBtn" onClick={handleCreate}>
                  Create Character
                </button>
                <button type="button" className="btn charactersMenuBtn" onClick={() => setView("edit-list")}>
                  Edit Saved Character
                </button>
              </div>
            </>
          ) : null}

          {view === "select" ? (
            <>
              <div className="title">Select Character</div>
              <div className="sub">Choose which character appears on the board.</div>
              <SpriteGallery sprites={sprites} activeId={activeId} mode="select" onSelect={setActive} />
              <div className="row">
                <button type="button" className="btn" onClick={() => setView("menu")}>
                  Back
                </button>
              </div>
            </>
          ) : null}

          {view === "edit-list" ? (
            <>
              <div className="title">Edit Saved Character</div>
              <div className="sub">Edit, rename, duplicate, or delete your characters.</div>
              <SpriteGallery
                sprites={sprites}
                activeId={activeId}
                mode="edit"
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onRename={handleRename}
              />
              <div className="row">
                <button type="button" className="btn primary" onClick={handleCreate}>
                  Create New
                </button>
                <button type="button" className="btn" onClick={() => setView("menu")}>
                  Back
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
