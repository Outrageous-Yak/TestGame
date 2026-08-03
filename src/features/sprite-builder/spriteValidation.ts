import type { SavedCharacter, SavedPixelSprite, SavedPixelSpriteSheet } from "./spriteTypes";
import { SPRITE_HEIGHT, SPRITE_PIXEL_COUNT, SPRITE_WIDTH } from "./spriteTypes";
import type { SheetType } from "./import/spriteSheetGeneration";
import { generateFramesForType } from "./import/spriteSheetGeneration";
import type { CharacterRenderSettings, ImportMeta } from "./import/importAssistantTypes";

export type SpriteValidationResult =
  | { ok: true; sprite: SavedPixelSprite }
  | { ok: false; error: string };

export type SheetValidationResult =
  | { ok: true; sheet: SavedPixelSpriteSheet }
  | { ok: false; error: string };

export type CharacterValidationResult =
  | { ok: true; character: SavedCharacter }
  | { ok: false; error: string };

function isPaletteColor(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.value === "string";
}

function validatePixelsArray(pixels: unknown, paletteLen: number): number[] | null {
  if (!Array.isArray(pixels) || pixels.length !== SPRITE_PIXEL_COUNT) return null;
  const maxIndex = paletteLen - 1;
  const out: number[] = [];
  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > maxIndex) return null;
    out.push(v);
  }
  return out;
}

function validatePalette(raw: unknown): SavedPixelSprite["palette"] | null {
  if (!Array.isArray(raw) || raw.length < 1 || !raw.every(isPaletteColor)) return null;
  const palette = (raw as SavedPixelSprite["palette"]).map((c) => ({ ...c }));
  if (palette[0]?.id !== "transparent") return null;
  return palette;
}

function parseCharacterExtras(s: Record<string, unknown>): {
  importMeta?: ImportMeta;
  renderSettings?: CharacterRenderSettings;
} {
  const out: { importMeta?: ImportMeta; renderSettings?: CharacterRenderSettings } = {};
  if (s.importMeta && typeof s.importMeta === "object") {
    out.importMeta = s.importMeta as ImportMeta;
  }
  if (s.renderSettings && typeof s.renderSettings === "object") {
    out.renderSettings = s.renderSettings as CharacterRenderSettings;
  }
  return out;
}

export function validateSprite(raw: unknown): SpriteValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Sprite must be an object" };
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion !== 1) return { ok: false, error: "Unsupported schema version" };
  if (typeof s.id !== "string" || !s.id) return { ok: false, error: "Missing sprite id" };
  if (typeof s.name !== "string") return { ok: false, error: "Missing sprite name" };
  if (s.width !== SPRITE_WIDTH || s.height !== SPRITE_HEIGHT) return { ok: false, error: "Sprite must be 64×64" };

  const palette = validatePalette(s.palette);
  if (!palette) return { ok: false, error: "Invalid palette" };

  const pixels = validatePixelsArray(s.pixels, palette.length);
  if (!pixels) return { ok: false, error: `Pixels must contain exactly ${SPRITE_PIXEL_COUNT} values` };

  const createdAt = typeof s.createdAt === "number" ? s.createdAt : Date.now();
  const updatedAt = typeof s.updatedAt === "number" ? s.updatedAt : createdAt;

  const extras = parseCharacterExtras(s);

  return {
    ok: true,
    sprite: {
      schemaVersion: 1,
      id: s.id,
      name: s.name,
      width: SPRITE_WIDTH,
      height: SPRITE_HEIGHT,
      palette,
      pixels,
      createdAt,
      updatedAt,
      builtin: s.builtin === true,
      ...extras,
    },
  };
}

export function validateSpriteSheet(raw: unknown): SheetValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Sheet must be an object" };
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion !== 2) return { ok: false, error: "Unsupported schema version" };
  if (typeof s.id !== "string" || !s.id) return { ok: false, error: "Missing sheet id" };
  if (typeof s.name !== "string") return { ok: false, error: "Missing sheet name" };
  if (s.frameWidth !== SPRITE_WIDTH || s.frameHeight !== SPRITE_HEIGHT) {
    return { ok: false, error: "Frames must be 64×64" };
  }

  const palette = validatePalette(s.palette);
  if (!palette) return { ok: false, error: "Invalid palette" };

  if (!Array.isArray(s.frames) || s.frames.length < 1) return { ok: false, error: "Missing frames" };

  const frames: number[][] = [];
  for (const frame of s.frames) {
    const px = validatePixelsArray(frame, palette.length);
    if (!px) return { ok: false, error: "Invalid frame pixels" };
    frames.push(px);
  }

  const columns = typeof s.columns === "number" ? s.columns : frames.length;
  const rows = typeof s.rows === "number" ? s.rows : 1;

  const createdAt = typeof s.createdAt === "number" ? s.createdAt : Date.now();
  const updatedAt = typeof s.updatedAt === "number" ? s.updatedAt : createdAt;

  let animation: SavedPixelSpriteSheet["animation"];
  if (Array.isArray(s.animation)) {
    animation = s.animation
      .filter((a) => a && typeof a === "object")
      .map((a) => {
        const o = a as Record<string, unknown>;
        return {
          name: String(o.name ?? "default"),
          frameIndices: Array.isArray(o.frameIndices) ? o.frameIndices.map(Number) : [0],
          frameDurationMs: typeof o.frameDurationMs === "number" ? o.frameDurationMs : 150,
          loop: o.loop !== false,
        };
      });
  }

  const extras = parseCharacterExtras(s);

  return {
    ok: true,
    sheet: {
      schemaVersion: 2,
      id: s.id,
      name: s.name,
      frameWidth: SPRITE_WIDTH,
      frameHeight: SPRITE_HEIGHT,
      columns,
      rows,
      palette,
      frames,
      animation,
      createdAt,
      updatedAt,
      builtin: s.builtin === true,
      ...extras,
    },
  };
}

export function validateCharacter(raw: unknown): CharacterValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid character" };
  const v = (raw as Record<string, unknown>).schemaVersion;
  if (v === 1) {
    const r = validateSprite(raw);
    return r.ok ? { ok: true, character: r.sprite } : r;
  }
  if (v === 2) {
    const r = validateSpriteSheet(raw);
    return r.ok ? { ok: true, character: r.sheet } : r;
  }
  return { ok: false, error: "Unsupported schema version" };
}

export function validateSpriteArray(raw: unknown): SavedPixelSprite[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedPixelSprite[] = [];
  for (const item of raw) {
    const result = validateSprite(item);
    if (result.ok) out.push(result.sprite);
  }
  return out;
}

export function validateCharacterArray(raw: unknown): SavedCharacter[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedCharacter[] = [];
  for (const item of raw) {
    const result = validateCharacter(item);
    if (result.ok) out.push(result.character);
  }
  return out;
}

export function createSpriteFromConversion(
  name: string,
  palette: SavedPixelSprite["palette"],
  pixels: number[]
): SavedPixelSprite {
  const now = Date.now();
  return {
    schemaVersion: 1,
    id: `sprite-${now}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    width: SPRITE_WIDTH,
    height: SPRITE_HEIGHT,
    palette: palette.map((c) => ({ ...c })),
    pixels: [...pixels],
    createdAt: now,
    updatedAt: now,
  };
}

export function createSheetFromConversion(
  name: string,
  palette: SavedPixelSprite["palette"],
  basePixels: number[],
  sheetType: SheetType,
  frameDurationMs = 150
): SavedPixelSpriteSheet {
  const frames = generateFramesForType(sheetType, basePixels);
  const now = Date.now();
  const animName = sheetType === "walk" ? "walk" : sheetType === "idle" ? "idle" : "default";

  return {
    schemaVersion: 2,
    id: `sheet-${now}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    frameWidth: SPRITE_WIDTH,
    frameHeight: SPRITE_HEIGHT,
    columns: frames.length,
    rows: 1,
    palette: palette.map((c) => ({ ...c })),
    frames: frames.map((f) => [...f]),
    animation:
      frames.length > 1
        ? [
            {
              name: animName,
              frameIndices: frames.map((_, i) => i),
              frameDurationMs,
              loop: true,
            },
          ]
        : undefined,
    createdAt: now,
    updatedAt: now,
  };
}
