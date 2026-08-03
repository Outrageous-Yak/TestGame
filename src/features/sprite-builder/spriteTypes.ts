export type SpriteSize = 64;

export type PixelIndex = number;

export interface SpritePaletteColor {
  id: string;
  name: string;
  value: string;
}

/** Schema v1 — single 64×64 frame. */
export interface SavedPixelSprite {
  schemaVersion: 1;
  id: string;
  name: string;
  width: SpriteSize;
  height: SpriteSize;
  palette: SpritePaletteColor[];
  pixels: PixelIndex[];
  createdAt: number;
  updatedAt: number;
  builtin?: boolean;
}

export interface SpriteAnimation {
  name: string;
  frameIndices: number[];
  frameDurationMs: number;
  loop: boolean;
}

/** Schema v2 — multi-frame sprite sheet with shared palette. */
export interface SavedPixelSpriteSheet {
  schemaVersion: 2;
  id: string;
  name: string;
  frameWidth: SpriteSize;
  frameHeight: SpriteSize;
  columns: number;
  rows: number;
  palette: SpritePaletteColor[];
  frames: PixelIndex[][];
  animation?: SpriteAnimation[];
  createdAt: number;
  updatedAt: number;
  builtin?: boolean;
}

export type SavedCharacter = SavedPixelSprite | SavedPixelSpriteSheet;

export type SpriteTool = "pencil" | "eraser" | "eyedropper" | "fill";

export const SPRITE_WIDTH = 64 as SpriteSize;
export const SPRITE_HEIGHT = 64 as SpriteSize;
export const SPRITE_PIXEL_COUNT = SPRITE_WIDTH * SPRITE_HEIGHT;

export const BUILTIN_SPRITE_ID = "__builtin__";

export function isSpriteSheet(char: SavedCharacter): char is SavedPixelSpriteSheet {
  return char.schemaVersion === 2;
}

export function frameCount(char: SavedCharacter): number {
  return isSpriteSheet(char) ? char.frames.length : 1;
}

export function getFramePixels(char: SavedCharacter, frameIndex: number): PixelIndex[] {
  if (isSpriteSheet(char)) {
    const idx = Math.max(0, Math.min(frameIndex, char.frames.length - 1));
    return char.frames[idx] ?? char.frames[0] ?? new Array(SPRITE_PIXEL_COUNT).fill(0);
  }
  return char.pixels;
}

export function characterAsSingleFrameSprite(char: SavedCharacter, frameIndex = 0): SavedPixelSprite {
  if (!isSpriteSheet(char)) return char;
  return {
    schemaVersion: 1,
    id: char.id,
    name: char.name,
    width: SPRITE_WIDTH,
    height: SPRITE_HEIGHT,
    palette: char.palette.map((c) => ({ ...c })),
    pixels: [...getFramePixels(char, frameIndex)],
    createdAt: char.createdAt,
    updatedAt: char.updatedAt,
    builtin: char.builtin,
  };
}

export function pickAnimationFrame(
  char: SavedCharacter,
  animName: string,
  elapsedMs: number,
  fallback = 0
): number {
  if (!isSpriteSheet(char) || !char.animation?.length) return fallback;
  const anim = char.animation.find((a) => a.name === animName) ?? char.animation[0];
  if (!anim || anim.frameIndices.length === 0) return fallback;
  const duration = anim.frameDurationMs * anim.frameIndices.length;
  const t = anim.loop ? elapsedMs % duration : Math.min(elapsedMs, duration - 1);
  const idx = Math.floor(t / anim.frameDurationMs) % anim.frameIndices.length;
  const frame = anim.frameIndices[idx];
  if (typeof frame !== "number" || frame < 0 || frame >= char.frames.length) return fallback;
  return frame;
}
