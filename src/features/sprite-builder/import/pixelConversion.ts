/** True pixel conversion — palette quantization and 64×64 output. */

import type { SpritePaletteColor } from "../spriteTypes";
import { SPRITE_PIXEL_COUNT, SPRITE_WIDTH } from "../spriteTypes";
import { TRANSPARENT_INDEX } from "../spriteConstants";
import { cloneImageData, getPixel } from "./backgroundRemoval";

export type ConversionMode = "clean" | "detailed" | "retro" | "silhouette";

export type PaletteSizeOption = 8 | 12 | 16 | 24 | 32 | 64;

export type ConversionSettings = {
  mode: ConversionMode;
  paletteSize: PaletteSizeOption;
  contrast: number;
  saturation: number;
  brightness: number;
  alphaThreshold: number;
  dithering: "off" | "ordered";
  outline: "off" | "dark" | "auto";
  detailLevel: number;
};

export const DEFAULT_CONVERSION_SETTINGS: ConversionSettings = {
  mode: "clean",
  paletteSize: 16,
  contrast: 0,
  saturation: 0,
  brightness: 0,
  alphaThreshold: 32,
  dithering: "off",
  outline: "off",
  detailLevel: 50,
};

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

type Rgb = { r: number; g: number; b: number };

function clamp(v: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function adjustColor(c: Rgb, settings: ConversionSettings): Rgb {
  let { r, g, b } = c;
  const bright = settings.brightness * 2.55;
  r = clamp(r + bright);
  g = clamp(g + bright);
  b = clamp(b + bright);

  const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
  r = clamp(contrastFactor * (r - 128) + 128);
  g = clamp(contrastFactor * (g - 128) + 128);
  b = clamp(contrastFactor * (b - 128) + 128);

  if (settings.saturation !== 0) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = 1 + settings.saturation / 100;
    r = clamp(gray + (r - gray) * sat);
    g = clamp(gray + (g - gray) * sat);
    b = clamp(gray + (b - gray) * sat);
  }
  return { r, g, b };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function colorDistSq(a: Rgb, b: Rgb): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

function nearestPaletteIndex(c: Rgb, palette: Rgb[]): number {
  let best = 1;
  let bestD = Infinity;
  for (let i = 1; i < palette.length; i++) {
    const d = colorDistSq(c, palette[i]!);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Median-cut palette quantization (deterministic). */
export function medianCutQuantize(colors: Rgb[], maxColors: number): Rgb[] {
  if (colors.length === 0) return [];
  if (colors.length <= maxColors) return [...colors];

  type Box = { pixels: Rgb[] };
  const boxes: Box[] = [{ pixels: [...colors] }];

  while (boxes.length < maxColors) {
    boxes.sort((a, b) => b.pixels.length - a.pixels.length);
    const box = boxes.shift();
    if (!box || box.pixels.length < 2) {
      if (box) boxes.push(box);
      break;
    }

    let minR = 255,
      maxR = 0,
      minG = 255,
      maxG = 0,
      minB = 255,
      maxB = 0;
    for (const p of box.pixels) {
      minR = Math.min(minR, p.r);
      maxR = Math.max(maxR, p.r);
      minG = Math.min(minG, p.g);
      maxG = Math.max(maxG, p.g);
      minB = Math.min(minB, p.b);
      maxB = Math.max(maxB, p.b);
    }
    const rangeR = maxR - minR;
    const rangeG = maxG - minG;
    const rangeB = maxB - minB;
    const channel: "r" | "g" | "b" =
      rangeR >= rangeG && rangeR >= rangeB ? "r" : rangeG >= rangeB ? "g" : "b";

    box.pixels.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(box.pixels.length / 2);
    boxes.push({ pixels: box.pixels.slice(0, mid) });
    boxes.push({ pixels: box.pixels.slice(mid) });
  }

  return boxes.map((box) => {
    let r = 0,
      g = 0,
      b = 0;
    for (const p of box.pixels) {
      r += p.r;
      g += p.g;
      b += p.b;
    }
    const n = box.pixels.length;
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  });
}

function modePaletteSize(settings: ConversionSettings): number {
  const base = settings.paletteSize;
  switch (settings.mode) {
    case "retro":
      return Math.min(base, 12);
    case "silhouette":
      return Math.min(base, 8);
    case "detailed":
      return base;
    default:
      return Math.min(base, 24);
  }
}

/** Nearest-neighbor downscale square source to 64×64. */
export function downscaleNearestSquare(source: ImageData, size = SPRITE_WIDTH): ImageData {
  const out = new ImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.floor((x / size) * source.width);
      const sy = Math.floor((y / size) * source.height);
      const si = (sy * source.width + sx) * 4;
      const oi = (y * size + x) * 4;
      out.data[oi] = source.data[si]!;
      out.data[oi + 1] = source.data[si + 1]!;
      out.data[oi + 2] = source.data[si + 2]!;
      out.data[oi + 3] = source.data[si + 3]!;
    }
  }
  return out;
}

export function convertImageDataToSprite(
  source: ImageData,
  settings: ConversionSettings
): { palette: SpritePaletteColor[]; pixels: number[] } {
  const small = downscaleNearestSquare(source, SPRITE_WIDTH);
  const opaquePixels: Rgb[] = [];

  for (let y = 0; y < SPRITE_WIDTH; y++) {
    for (let x = 0; x < SPRITE_WIDTH; x++) {
      const px = getPixel(small, x, y);
      if (px.a < settings.alphaThreshold) continue;
      opaquePixels.push(adjustColor({ r: px.r, g: px.g, b: px.b }, settings));
    }
  }

  let quantColors: Rgb[];
  if (settings.mode === "silhouette") {
    quantColors = [{ r: 30, g: 30, b: 40 }];
  } else {
    quantColors = medianCutQuantize(opaquePixels, Math.max(1, modePaletteSize(settings) - 1));
  }

  const paletteRgb: Rgb[] = [{ r: 0, g: 0, b: 0 }, ...quantColors];
  const palette: SpritePaletteColor[] = [
    { id: "transparent", name: "Transparent", value: "transparent" },
    ...quantColors.map((c, i) => ({
      id: `c${i}`,
      name: `Color ${i + 1}`,
      value: rgbToHex(c),
    })),
  ];

  const pixels = new Array(SPRITE_PIXEL_COUNT).fill(TRANSPARENT_INDEX);

  for (let y = 0; y < SPRITE_WIDTH; y++) {
    for (let x = 0; x < SPRITE_WIDTH; x++) {
      const px = getPixel(small, x, y);
      const idx = y * SPRITE_WIDTH + x;
      if (px.a < settings.alphaThreshold) {
        pixels[idx] = TRANSPARENT_INDEX;
        continue;
      }
      let c = adjustColor({ r: px.r, g: px.g, b: px.b }, settings);
      if (settings.mode === "silhouette") {
        c = paletteRgb[1]!;
      }
      if (settings.dithering === "ordered") {
        const threshold = (BAYER_4[y % 4]![x % 4]! / 16 - 0.5) * 32;
        c = {
          r: clamp(c.r + threshold),
          g: clamp(c.g + threshold),
          b: clamp(c.b + threshold),
        };
      }
      pixels[idx] = nearestPaletteIndex(c, paletteRgb);
    }
  }

  if (settings.outline !== "off") {
    applyOutline(pixels, paletteRgb, settings.outline === "auto");
  }

  return { palette, pixels };
}

function applyOutline(pixels: number[], paletteRgb: Rgb[], auto: boolean): void {
  const copy = [...pixels];
  const outlineIdx = auto ? findDarkOutlineIndex(paletteRgb) : 1;
  for (let y = 0; y < SPRITE_WIDTH; y++) {
    for (let x = 0; x < SPRITE_WIDTH; x++) {
      const idx = y * SPRITE_WIDTH + x;
      if (copy[idx] === TRANSPARENT_INDEX) continue;
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= SPRITE_WIDTH || ny >= SPRITE_WIDTH) {
          pixels[idx] = outlineIdx;
          break;
        }
        if (copy[ny * SPRITE_WIDTH + nx]! === TRANSPARENT_INDEX) {
          pixels[idx] = outlineIdx;
          break;
        }
      }
    }
  }
}

function findDarkOutlineIndex(paletteRgb: Rgb[]): number {
  let best = 1;
  let bestLum = Infinity;
  for (let i = 1; i < paletteRgb.length; i++) {
    const c = paletteRgb[i]!;
    const lum = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    if (lum < bestLum) {
      bestLum = lum;
      best = i;
    }
  }
  return best;
}

export function conversionSettingsHash(settings: ConversionSettings): string {
  return JSON.stringify(settings);
}

/** Test helper: convert raw RGBA buffer without DOM. */
export function convertRgbaBuffer(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
  settings: ConversionSettings
): { palette: SpritePaletteColor[]; pixels: number[] } {
  const data = new ImageData(rgba, width, height);
  return convertImageDataToSprite(data, settings);
}
