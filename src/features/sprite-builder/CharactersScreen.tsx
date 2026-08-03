import React, { useCallback, useState } from "react";
import type { SavedCharacter } from "./spriteTypes";
import { isSpriteSheet } from "./spriteTypes";
import { createBlankSprite, cloneSprite } from "./spriteConstants";
import { SpriteBuilder } from "./SpriteBuilder";
import { SpriteGallery } from "./SpriteGallery";
import { ImageImportWizard } from "./import/ImageImportWizard";
import {
  deleteCharacter,
  duplicateCharacter,
  loadActiveSpriteId,
  loadCharacters,
  renameCharacter,
  saveActiveSpriteId,
  saveCharacters,
  safeActiveIdAfterDelete,
  upsertCharacter,
} from "./spriteStorage";

type CharactersView = "menu" | "select" | "create" | "import" | "edit-list" | "builder";

type CharactersScreenProps = {
  themeVars: React.CSSProperties;
  onBack: () => void;
  onActiveChange?: (activeId: string | null) => void;
};

export function CharactersScreen({ themeVars, onBack, onActiveChange }: CharactersScreenProps) {
  const [view, setView] = useState<CharactersView>("menu");
  const [characters, setCharacters] = useState<SavedCharacter[]>(() => loadCharacters());
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveSpriteId());
  const [editingCharacter, setEditingCharacter] = useState<SavedCharacter | null>(null);
  const [isNewCharacter, setIsNewCharacter] = useState(false);

  const persistCharacters = useCallback((next: SavedCharacter[]) => {
    setCharacters(next);
    saveCharacters(next);
  }, []);

  const setActive = useCallback(
    (id: string | null) => {
      setActiveId(id);
      saveActiveSpriteId(id);
      onActiveChange?.(id);
    },
    [onActiveChange]
  );

  const handleSave = (character: SavedCharacter) => {
    const next = upsertCharacter(characters, character);
    persistCharacters(next);
    setEditingCharacter(null);
    setIsNewCharacter(false);
    if (view === "create" || view === "import") setView("menu");
    else if (view === "builder") setView("edit-list");
  };

  const handleCreate = () => {
    setEditingCharacter(createBlankSprite());
    setIsNewCharacter(true);
    setView("builder");
  };

  const handleEdit = (character: SavedCharacter) => {
    if (character.builtin) {
      setEditingCharacter(duplicateCharacter(character));
      setIsNewCharacter(true);
    } else if (isSpriteSheet(character)) {
      setEditingCharacter(structuredClone(character) as SavedCharacter);
      setIsNewCharacter(false);
    } else {
      setEditingCharacter(cloneSprite(character));
      setIsNewCharacter(false);
    }
    setView("builder");
  };

  const handleImportComplete = (character: SavedCharacter, selectActive: boolean) => {
    const next = upsertCharacter(characters, character);
    persistCharacters(next);
    if (selectActive) setActive(character.id);
    setView("menu");
  };

  if (view === "import") {
    return (
      <div className="appRoot" style={themeVars}>
        <div className="topbar">
          <button type="button" className="btn" onClick={() => setView("menu")}>
            ← Characters
          </button>
          <div className="spacer" />
          <span className="topbarTitle">Import Image</span>
        </div>
        <div className="screen spriteScreen">
          <ImageImportWizard onComplete={handleImportComplete} onCancel={() => setView("menu")} />
        </div>
      </div>
    );
  }

  if (view === "builder" && editingCharacter) {
    return (
      <div className="appRoot" style={themeVars}>
        <div className="topbar">
          <button type="button" className="btn" onClick={() => setView(isNewCharacter ? "menu" : "edit-list")}>
            ← Characters
          </button>
          <div className="spacer" />
          <span className="topbarTitle">Sprite Builder</span>
        </div>
        <div className="screen spriteScreen">
          <SpriteBuilder
            initialCharacter={editingCharacter}
            isNew={isNewCharacter}
            onSave={handleSave}
            onCancel={() => setView(isNewCharacter ? "menu" : "edit-list")}
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
              <div className="sub">Create, import, or choose a pixel character.</div>
              <div className="charactersMenu">
                <button type="button" className="btn primary charactersMenuBtn" onClick={() => setView("select")}>
                  Select Character
                </button>
                <button type="button" className="btn charactersMenuBtn" onClick={handleCreate}>
                  Create Character
                </button>
                <button type="button" className="btn charactersMenuBtn" onClick={() => setView("import")}>
                  Import Image
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
              <SpriteGallery characters={characters} activeId={activeId} mode="select" onSelect={setActive} />
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
                characters={characters}
                activeId={activeId}
                mode="edit"
                onEdit={handleEdit}
                onDuplicate={(c) => persistCharacters(upsertCharacter(characters, duplicateCharacter(c)))}
                onDelete={(id) => {
                  const next = deleteCharacter(characters, id);
                  persistCharacters(next);
                  const nextActive = safeActiveIdAfterDelete(activeId, id);
                  if (nextActive !== activeId) setActive(nextActive);
                }}
                onRename={(id, name) => persistCharacters(renameCharacter(characters, id, name))}
              />
              <div className="row">
                <button type="button" className="btn primary" onClick={handleCreate}>
                  Create New
                </button>
                <button type="button" className="btn" onClick={() => setView("import")}>
                  Import Image
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
