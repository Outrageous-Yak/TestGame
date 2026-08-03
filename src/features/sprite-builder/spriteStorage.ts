import type { SavedPixelSprite } from "./spriteTypes";
import { BUILTIN_SPRITE_ID } from "./spriteTypes";
import { STARTER_TEMPLATES } from "./spriteConstants";
import { validateSpriteArray } from "./spriteValidation";

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

function ensureStarterTemplates(sprites: SavedPixelSprite[]): SavedPixelSprite[] {
  const byId = new Map(sprites.map((s) => [s.id, s]));
  for (const t of STARTER_TEMPLATES) {
    if (!byId.has(t.id)) {
      byId.set(t.id, { ...t, palette: t.palette.map((c) => ({ ...c })), pixels: [...t.pixels] });
    }
  }
  return [...byId.values()];
}

export function loadSprites(): SavedPixelSprite[] {
  const raw = readJson(SPRITES_KEY);
  const validated = validateSpriteArray(raw);
  return ensureStarterTemplates(validated);
}

export function saveSprites(sprites: SavedPixelSprite[]): boolean {
  const serializable = sprites.map((s) => ({
    ...s,
    palette: s.palette.map((c) => ({ ...c })),
    pixels: [...s.pixels],
  }));
  return writeJson(SPRITES_KEY, serializable);
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

export function getSpriteById(sprites: SavedPixelSprite[], id: string): SavedPixelSprite | null {
  return sprites.find((s) => s.id === id) ?? null;
}

export function upsertSprite(sprites: SavedPixelSprite[], sprite: SavedPixelSprite): SavedPixelSprite[] {
  const copy = {
    ...sprite,
    palette: sprite.palette.map((c) => ({ ...c })),
    pixels: [...sprite.pixels],
  };
  const idx = sprites.findIndex((s) => s.id === copy.id);
  if (idx >= 0) {
    const next = [...sprites];
    next[idx] = copy;
    return next;
  }
  return [...sprites, copy];
}

export function deleteSprite(sprites: SavedPixelSprite[], id: string): SavedPixelSprite[] {
  const target = sprites.find((s) => s.id === id);
  if (!target || target.builtin) return sprites;
  return sprites.filter((s) => s.id !== id);
}

export function duplicateSprite(sprite: SavedPixelSprite, name?: string): SavedPixelSprite {
  const now = Date.now();
  return {
    ...sprite,
    id: `sprite-${now}-${Math.random().toString(36).slice(2, 9)}`,
    name: name ?? `${sprite.name} Copy`,
    palette: sprite.palette.map((c) => ({ ...c })),
    pixels: [...sprite.pixels],
    builtin: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function renameSprite(sprites: SavedPixelSprite[], id: string, name: string): SavedPixelSprite[] {
  return sprites.map((s) =>
    s.id === id ? { ...s, name, palette: s.palette.map((c) => ({ ...c })), pixels: [...s.pixels], updatedAt: Date.now() } : s
  );
}

export function resolveActiveSprite(
  sprites: SavedPixelSprite[],
  activeId: string | null
): SavedPixelSprite | null {
  if (!activeId) return null;
  const found = getSpriteById(sprites, activeId);
  return found ?? null;
}

export function safeActiveIdAfterDelete(activeId: string | null, deletedId: string): string | null {
  if (activeId === deletedId) return null;
  return activeId;
}
