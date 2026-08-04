import type { SavedCharacter, SavedPixelSprite } from "./spriteTypes";
import { SPRITE_HEIGHT, SPRITE_WIDTH, getFramePixels, isSpriteSheet } from "./spriteTypes";
import { TRANSPARENT_INDEX } from "./spriteConstants";

const cache = new Map<string, HTMLCanvasElement>();

function frameCacheKey(char: SavedCharacter, frameIndex: number): string {
  return `${char.id}:${char.updatedAt}:f${frameIndex}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function renderPixelsToCanvas(
  palette: SavedPixelSprite["palette"],
  pixels: number[],
  target?: HTMLCanvasElement
): HTMLCanvasElement {
  const canvas = target ?? document.createElement("canvas");
  canvas.width = SPRITE_WIDTH;
  canvas.height = SPRITE_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
  ctx.imageSmoothingEnabled = false;

  const imageData = ctx.createImageData(SPRITE_WIDTH, SPRITE_HEIGHT);
  const { data } = imageData;

  for (let i = 0; i < pixels.length; i++) {
    const paletteIndex = pixels[i] ?? TRANSPARENT_INDEX;
    if (paletteIndex === TRANSPARENT_INDEX) continue;

    const color = palette[paletteIndex]?.value ?? "transparent";
    if (color === "transparent") continue;

    const offset = i * 4;
    const rgb = hexToRgb(color);
    if (!rgb) continue;
    data[offset] = rgb.r;
    data[offset + 1] = rgb.g;
    data[offset + 2] = rgb.b;
    data[offset + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function renderCharacterFrameToCanvas(
  char: SavedCharacter,
  frameIndex: number,
  target?: HTMLCanvasElement
): HTMLCanvasElement {
  const key = frameCacheKey(char, frameIndex);
  const cached = cache.get(key);
  if (cached) return cached;

  const pixels = getFramePixels(char, frameIndex);
  const canvas = renderPixelsToCanvas(char.palette, pixels, target);
  cache.set(key, canvas);

  for (const k of cache.keys()) {
    if (k.startsWith(`${char.id}:${char.updatedAt}:`) && k !== key) cache.delete(k);
  }

  return canvas;
}

/** @deprecated Use renderCharacterFrameToCanvas */
export function renderPixelSpriteToCanvas(sprite: SavedPixelSprite, target?: HTMLCanvasElement): HTMLCanvasElement {
  return renderCharacterFrameToCanvas(sprite, 0, target);
}

export function createCharacterFrameDataUrl(char: SavedCharacter, frameIndex: number): string {
  const canvas = renderCharacterFrameToCanvas(char, frameIndex);
  return canvas.toDataURL("image/png");
}

/** @deprecated Use createCharacterFrameDataUrl */
export function createPixelSpriteDataUrl(sprite: SavedPixelSprite): string {
  return createCharacterFrameDataUrl(sprite, 0);
}

export function invalidateSpriteCache(spriteId?: string): void {
  if (!spriteId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`${spriteId}:`)) cache.delete(k);
  }
}

/** Node/test helper: render without DOM cache. */
export function renderPixelsToImageData(sprite: SavedPixelSprite): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SPRITE_WIDTH * SPRITE_HEIGHT * 4);
  for (let i = 0; i < sprite.pixels.length; i++) {
    const paletteIndex = sprite.pixels[i] ?? 0;
    if (paletteIndex === 0) continue;
    const color = sprite.palette[paletteIndex]?.value;
    if (!color || color === "transparent") continue;
    const rgb = hexToRgb(color);
    if (!rgb) continue;
    const offset = i * 4;
    data[offset] = rgb.r;
    data[offset + 1] = rgb.g;
    data[offset + 2] = rgb.b;
    data[offset + 3] = 255;
  }
  return data;
}

export function getAnimationNames(char: SavedCharacter): string[] {
  if (!isSpriteSheet(char) || !char.animation?.length) return [];
  return char.animation.map((a) => a.name);
}

export function pickPlaybackFrame(
  char: SavedCharacter,
  isWalking: boolean,
  elapsedMs: number
): number {
  if (!isSpriteSheet(char) || !char.animation?.length) return 0;

  const walkAnim = char.animation.find((a) => a.name === "walk");
  const idleAnim = char.animation.find((a) => a.name === "idle");
  const anim = isWalking ? walkAnim ?? idleAnim ?? char.animation[0] : idleAnim ?? char.animation[0];
  if (!anim || anim.frameIndices.length === 0) return 0;

  const duration = anim.frameDurationMs * anim.frameIndices.length;
  const t = anim.loop ? elapsedMs % duration : Math.min(elapsedMs, duration - 1);
  const idx = Math.floor(t / anim.frameDurationMs) % anim.frameIndices.length;
  const frame = anim.frameIndices[idx];
  if (typeof frame !== "number" || frame < 0 || frame >= char.frames.length) return 0;
  return frame;
}

export function getImageSmoothingForTest(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  return ctx.imageSmoothingEnabled;
}
