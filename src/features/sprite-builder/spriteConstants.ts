import type { SavedPixelSprite, SpritePaletteColor } from "./spriteTypes";
import { BUILTIN_SPRITE_ID, SPRITE_HEIGHT, SPRITE_PIXEL_COUNT, SPRITE_WIDTH } from "./spriteTypes";

export const TRANSPARENT_INDEX = 0;

export const DEFAULT_PALETTE: SpritePaletteColor[] = [
  { id: "transparent", name: "Transparent", value: "transparent" },
  // Blue elf
  { id: "elf-deep", name: "Deep blue skin", value: "#1a3a8f" },
  { id: "elf-mid", name: "Mid blue skin", value: "#3d6fd4" },
  { id: "elf-light", name: "Light blue skin", value: "#6fa8ff" },
  { id: "elf-hair", name: "White hair", value: "#f5f8ff" },
  { id: "elf-hair-sh", name: "Hair shadow", value: "#b8c0d8" },
  { id: "elf-hair-dk", name: "Hair deep", value: "#6a7090" },
  { id: "elf-cloth", name: "White cloth", value: "#ffffff" },
  { id: "elf-cloth-sh", name: "Cloth shadow", value: "#d8dce8" },
  { id: "elf-sash", name: "Dark sash", value: "#141820" },
  { id: "elf-eye", name: "Cyan eyes", value: "#4de8ff" },
  { id: "elf-outline", name: "Dark outline", value: "#0a1020" },
  // Masked character
  { id: "mask-black", name: "Near black", value: "#0a0a0c" },
  { id: "mask-char", name: "Dark charcoal", value: "#1e1e24" },
  { id: "mask-mid", name: "Medium charcoal", value: "#3a3a44" },
  { id: "mask-metal-d", name: "Deep metal", value: "#4a4a58" },
  { id: "mask-metal-m", name: "Mid metal", value: "#7a7a8a" },
  { id: "mask-metal-l", name: "Light metal", value: "#b0b0c0" },
  { id: "mask-gold-d", name: "Dark gold", value: "#8a6a18" },
  { id: "mask-gold-m", name: "Mid gold", value: "#c8a030" },
  { id: "mask-gold-l", name: "Bright gold", value: "#f0d050" },
  { id: "mask-white", name: "White", value: "#f0f0f0" },
  { id: "mask-gray", name: "Light gray", value: "#a0a0a8" },
  { id: "mask-red-d", name: "Dark red", value: "#8a1020" },
  { id: "mask-red", name: "Bright red", value: "#e02040" },
];

function blankPixels(): number[] {
  return new Array(SPRITE_PIXEL_COUNT).fill(TRANSPARENT_INDEX);
}

export function createBlankSprite(name = "New Character"): SavedPixelSprite {
  const now = Date.now();
  return {
    schemaVersion: 1,
    id: `sprite-${now}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    width: SPRITE_WIDTH,
    height: SPRITE_HEIGHT,
    palette: DEFAULT_PALETTE.map((c) => ({ ...c })),
    pixels: blankPixels(),
    createdAt: now,
    updatedAt: now,
  };
}

export function cloneSprite(sprite: SavedPixelSprite, overrides?: Partial<SavedPixelSprite>): SavedPixelSprite {
  const now = Date.now();
  return {
    ...sprite,
    ...overrides,
    id: overrides?.id ?? `sprite-${now}-${Math.random().toString(36).slice(2, 9)}`,
    palette: (overrides?.palette ?? sprite.palette).map((c) => ({ ...c })),
    pixels: [...(overrides?.pixels ?? sprite.pixels)],
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}

function setPixel(pixels: number[], x: number, y: number, index: number) {
  if (x < 0 || x >= SPRITE_WIDTH || y < 0 || y >= SPRITE_HEIGHT) return;
  pixels[y * SPRITE_WIDTH + x] = index;
}

function getPixel(pixels: number[], x: number, y: number): number {
  return pixels[y * SPRITE_WIDTH + x] ?? 0;
}

/** Simplified blue elf template (~centered figure). */
function createBlueElfTemplate(): SavedPixelSprite {
  const sprite = createBlankSprite("Blue Elf");
  sprite.builtin = true;
  sprite.id = "template-blue-elf";
  const p = [...sprite.pixels];
  const O = 11; // outline
  const S = 2; // mid skin
  const L = 3; // light skin
  const H = 4; // hair
  const C = 7; // cloth
  const E = 10; // eye

  // Simple 32x48 figure centered in 64x64
  for (let y = 12; y < 52; y++) {
    for (let x = 24; x < 40; x++) {
      const relY = y - 12;
      if (relY < 8) {
        if (x >= 26 && x <= 37) setPixel(p, x, y, H);
      } else if (relY < 18) {
        if (x >= 27 && x <= 36) setPixel(p, x, y, S);
        if (y === 16 && (x === 29 || x === 34)) setPixel(p, x, y, E);
        if (x === 26 || x === 37) setPixel(p, x, y, O);
      } else if (relY < 36) {
        if (x >= 26 && x <= 37) setPixel(p, x, y, C);
        if (relY >= 30 && x >= 28 && x <= 35) setPixel(p, x, y, 9);
      } else {
        if (x >= 28 && x <= 35) setPixel(p, x, y, L);
      }
    }
  }
  sprite.pixels = p;
  return sprite;
}

/** Simplified masked character template. */
function createMaskedTemplate(): SavedPixelSprite {
  const sprite = createBlankSprite("Masked Hero");
  sprite.builtin = true;
  sprite.id = "template-masked-hero";
  const p = [...sprite.pixels];
  const BK = 12;
  const CH = 13;
  const G = 18;
  const RD = 23;
  const W = 21;

  for (let y = 10; y < 54; y++) {
    for (let x = 22; x < 42; x++) {
      const relY = y - 10;
      if (relY < 10) {
        if (x >= 24 && x <= 39) setPixel(p, x, y, BK);
        if (relY >= 4 && x >= 28 && x <= 35) setPixel(p, x, y, CH);
      } else if (relY < 32) {
        if (x >= 25 && x <= 38) setPixel(p, x, y, BK);
        if (x === 25 || x === 38) setPixel(p, x, y, G);
        if (relY >= 8 && relY < 14 && x >= 29 && x <= 34) setPixel(p, x, y, CH);
        if (relY === 11 && x === 31) setPixel(p, x, y, RD);
      } else {
        if (x >= 27 && x <= 36) setPixel(p, x, y, BK);
        if (relY >= 38 && x >= 28 && x <= 35) setPixel(p, x, y, W);
      }
    }
  }
  sprite.pixels = p;
  return sprite;
}

export const STARTER_TEMPLATES: SavedPixelSprite[] = [
  createBlueElfTemplate(),
  createMaskedTemplate(),
];

export function isBuiltinSpriteId(id: string): boolean {
  return id === BUILTIN_SPRITE_ID;
}
