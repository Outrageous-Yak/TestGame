import type { SavedPixelSprite } from "./spriteTypes";
import { SPRITE_HEIGHT, SPRITE_WIDTH } from "./spriteTypes";
import { TRANSPARENT_INDEX } from "./spriteConstants";

const cache = new Map<string, HTMLCanvasElement>();

function cacheKey(sprite: SavedPixelSprite): string {
  return `${sprite.id}:${sprite.updatedAt}`;
}

export function renderPixelSpriteToCanvas(sprite: SavedPixelSprite, target?: HTMLCanvasElement): HTMLCanvasElement {
  const key = cacheKey(sprite);
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = target ?? document.createElement("canvas");
  canvas.width = SPRITE_WIDTH;
  canvas.height = SPRITE_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
  ctx.imageSmoothingEnabled = false;

  const imageData = ctx.createImageData(SPRITE_WIDTH, SPRITE_HEIGHT);
  const { data } = imageData;

  for (let i = 0; i < sprite.pixels.length; i++) {
    const paletteIndex = sprite.pixels[i] ?? TRANSPARENT_INDEX;
    if (paletteIndex === TRANSPARENT_INDEX) continue;

    const color = sprite.palette[paletteIndex]?.value ?? "transparent";
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
  cache.set(key, canvas);

  // Prune old cache entries for same sprite id
  for (const k of cache.keys()) {
    if (k.startsWith(`${sprite.id}:`) && k !== key) cache.delete(k);
  }

  return canvas;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function createPixelSpriteDataUrl(sprite: SavedPixelSprite): string {
  const canvas = renderPixelSpriteToCanvas(sprite);
  return canvas.toDataURL("image/png");
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

export function getImageSmoothingForTest(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  return ctx.imageSmoothingEnabled;
}
