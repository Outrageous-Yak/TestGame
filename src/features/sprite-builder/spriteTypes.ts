export type SpriteSize = 64;

export type PixelIndex = number;

export interface SpritePaletteColor {
  id: string;
  name: string;
  value: string;
}

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
  /** Built-in templates cannot be deleted; user copies can be edited. */
  builtin?: boolean;
}

export type SpriteTool = "pencil" | "eraser" | "eyedropper" | "fill";

export const SPRITE_WIDTH = 64 as SpriteSize;
export const SPRITE_HEIGHT = 64 as SpriteSize;
export const SPRITE_PIXEL_COUNT = SPRITE_WIDTH * SPRITE_HEIGHT;

export const BUILTIN_SPRITE_ID = "__builtin__";
