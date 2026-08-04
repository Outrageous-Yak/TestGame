import type { SavedCharacter, SavedPixelSprite, SavedPixelSpriteSheet } from "./spriteTypes";
import { isSpriteSheet } from "./spriteTypes";
import { BUILTIN_SPRITE_ID } from "./spriteTypes";
import { STARTER_TEMPLATES } from "./spriteConstants";
import { validateCharacterArray } from "./spriteValidation";

const SPRITES_KEY = "hexgame-pixelSprites:v1";
const ACTIVE_KEY = "hexgame-activePixelSpriteId:v1";

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function cloneCharacter(char: SavedCharacter): SavedCharacter {
  if (isSpriteSheet(char)) {
    return {
      ...char,
      palette: char.palette.map((c) => ({ ...c })),
      frames: char.frames.map((f) => [...f]),
      animation: char.animation?.map((a) => ({ ...a, frameIndices: [...a.frameIndices] })),
    };
  }
  return {
    ...char,
    palette: char.palette.map((c) => ({ ...c })),
    pixels: [...char.pixels],
  };
}

function ensureStarterTemplates(chars: SavedCharacter[]): SavedCharacter[] {
  const byId = new Map(chars.map((s) => [s.id, s]));
  for (const t of STARTER_TEMPLATES) {
    if (!byId.has(t.id)) {
      byId.set(t.id, cloneCharacter(t));
    }
  }
  return [...byId.values()];
}

export function loadCharacters(): SavedCharacter[] {
  const raw = readJson(SPRITES_KEY);
  const validated = validateCharacterArray(raw);
  return ensureStarterTemplates(validated);
}

/** @deprecated Use loadCharacters */
export function loadSprites(): SavedPixelSprite[] {
  return loadCharacters().filter((c): c is SavedPixelSprite => !isSpriteSheet(c));
}

export function saveCharacters(characters: SavedCharacter[]): boolean {
  const serializable = characters.map(cloneCharacter);
  return writeJson(SPRITES_KEY, serializable);
}

/** @deprecated Use saveCharacters */
export function saveSprites(sprites: SavedPixelSprite[]): boolean {
  return saveCharacters(sprites);
}

export function loadActiveSpriteId(): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (raw == null || raw === "null") return null;
    if (raw === BUILTIN_SPRITE_ID) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveActiveSpriteId(id: string | null): boolean {
  try {
    if (id == null) {
      localStorage.removeItem(ACTIVE_KEY);
      return true;
    }
    localStorage.setItem(ACTIVE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export function getCharacterById(characters: SavedCharacter[], id: string): SavedCharacter | null {
  return characters.find((s) => s.id === id) ?? null;
}

/** @deprecated Use getCharacterById */
export function getSpriteById(sprites: SavedCharacter[], id: string): SavedPixelSprite | null {
  const found = getCharacterById(sprites, id);
  if (!found || isSpriteSheet(found)) return null;
  return found;
}

export function upsertCharacter(characters: SavedCharacter[], character: SavedCharacter): SavedCharacter[] {
  const copy = cloneCharacter(character);
  const idx = characters.findIndex((s) => s.id === copy.id);
  if (idx >= 0) {
    const next = [...characters];
    next[idx] = copy;
    return next;
  }
  return [...characters, copy];
}

/** @deprecated Use upsertCharacter */
export function upsertSprite(sprites: SavedCharacter[], sprite: SavedPixelSprite): SavedCharacter[] {
  return upsertCharacter(sprites, sprite);
}

export function deleteCharacter(characters: SavedCharacter[], id: string): SavedCharacter[] {
  const target = characters.find((s) => s.id === id);
  if (!target || target.builtin) return characters;
  return characters.filter((s) => s.id !== id);
}

/** @deprecated Use deleteCharacter */
export function deleteSprite(sprites: SavedCharacter[], id: string): SavedCharacter[] {
  return deleteCharacter(sprites, id);
}

export function duplicateCharacter(character: SavedCharacter, name?: string): SavedCharacter {
  const now = Date.now();
  const base = cloneCharacter(character);
  if (isSpriteSheet(base)) {
    return {
      ...base,
      id: `sheet-${now}-${Math.random().toString(36).slice(2, 9)}`,
      name: name ?? `${base.name} Copy`,
      builtin: false,
      createdAt: now,
      updatedAt: now,
    };
  }
  return {
    ...base,
    id: `sprite-${now}-${Math.random().toString(36).slice(2, 9)}`,
    name: name ?? `${base.name} Copy`,
    builtin: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** @deprecated Use duplicateCharacter */
export function duplicateSprite(sprite: SavedCharacter, name?: string): SavedCharacter {
  return duplicateCharacter(sprite, name);
}

export function renameCharacter(characters: SavedCharacter[], id: string, name: string): SavedCharacter[] {
  return characters.map((s) =>
    s.id === id ? { ...cloneCharacter(s), name, updatedAt: Date.now() } : s
  );
}

/** @deprecated Use renameCharacter */
export function renameSprite(characters: SavedCharacter[], id: string, name: string): SavedCharacter[] {
  return renameCharacter(characters, id, name);
}

export function resolveActiveCharacter(
  characters: SavedCharacter[],
  activeId: string | null
): SavedCharacter | null {
  if (!activeId) return null;
  return getCharacterById(characters, activeId);
}

/** @deprecated Use resolveActiveCharacter */
export function resolveActiveSprite(
  characters: SavedCharacter[],
  activeId: string | null
): SavedPixelSprite | null {
  const found = resolveActiveCharacter(characters, activeId);
  if (!found || isSpriteSheet(found)) return null;
  return found;
}

export function safeActiveIdAfterDelete(activeId: string | null, deletedId: string): string | null {
  if (activeId === deletedId) return null;
  return activeId;
}

export function updateSheetFrame(
  sheet: SavedPixelSpriteSheet,
  frameIndex: number,
  pixels: number[]
): SavedPixelSpriteSheet {
  const frames = sheet.frames.map((f, i) => (i === frameIndex ? [...pixels] : [...f]));
  return { ...sheet, frames, updatedAt: Date.now() };
}

export function addSheetFrame(sheet: SavedPixelSpriteSheet, pixels?: number[]): SavedPixelSpriteSheet {
  const blank = pixels ?? new Array(sheet.frames[0]?.length ?? 4096).fill(0);
  return {
    ...sheet,
    frames: [...sheet.frames.map((f) => [...f]), [...blank]],
    columns: sheet.frames.length + 1,
    updatedAt: Date.now(),
  };
}

export function deleteSheetFrame(sheet: SavedPixelSpriteSheet, frameIndex: number): SavedPixelSpriteSheet {
  if (sheet.frames.length <= 1) return sheet;
  const frames = sheet.frames.filter((_, i) => i !== frameIndex).map((f) => [...f]);
  return { ...sheet, frames, columns: frames.length, updatedAt: Date.now() };
}

export function reorderSheetFrame(
  sheet: SavedPixelSpriteSheet,
  from: number,
  to: number
): SavedPixelSpriteSheet {
  const frames = sheet.frames.map((f) => [...f]);
  const [item] = frames.splice(from, 1);
  if (!item) return sheet;
  frames.splice(to, 0, item);
  return { ...sheet, frames, updatedAt: Date.now() };
}
