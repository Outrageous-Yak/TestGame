import type { SavedPixelSprite } from "./spriteTypes";
import { SPRITE_HEIGHT, SPRITE_PIXEL_COUNT, SPRITE_WIDTH } from "./spriteTypes";

export type SpriteValidationResult =
  | { ok: true; sprite: SavedPixelSprite }
  | { ok: false; error: string };

function isPaletteColor(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.value === "string";
}

export function validateSprite(raw: unknown): SpriteValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Sprite must be an object" };
  }

  const s = raw as Record<string, unknown>;

  if (s.schemaVersion !== 1) {
    return { ok: false, error: "Unsupported schema version" };
  }

  if (typeof s.id !== "string" || !s.id) {
    return { ok: false, error: "Missing sprite id" };
  }

  if (typeof s.name !== "string") {
    return { ok: false, error: "Missing sprite name" };
  }

  if (s.width !== SPRITE_WIDTH || s.height !== SPRITE_HEIGHT) {
    return { ok: false, error: "Sprite must be 64×64" };
  }

  if (!Array.isArray(s.palette) || s.palette.length < 1) {
    return { ok: false, error: "Invalid palette" };
  }

  if (!s.palette.every(isPaletteColor)) {
    return { ok: false, error: "Invalid palette entry" };
  }

  const palette = (s.palette as SavedPixelSprite["palette"]).map((c) => ({ ...c }));

  if (palette[0]?.id !== "transparent") {
    return { ok: false, error: "Palette index 0 must be transparent" };
  }

  if (!Array.isArray(s.pixels) || s.pixels.length !== SPRITE_PIXEL_COUNT) {
    return { ok: false, error: `Pixels must contain exactly ${SPRITE_PIXEL_COUNT} values` };
  }

  const maxIndex = palette.length - 1;
  const pixels: number[] = [];
  for (let i = 0; i < s.pixels.length; i++) {
    const v = s.pixels[i];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > maxIndex) {
      return { ok: false, error: `Invalid pixel index at ${i}` };
    }
    pixels.push(v);
  }

  const createdAt = typeof s.createdAt === "number" ? s.createdAt : Date.now();
  const updatedAt = typeof s.updatedAt === "number" ? s.updatedAt : createdAt;

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
    },
  };
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
