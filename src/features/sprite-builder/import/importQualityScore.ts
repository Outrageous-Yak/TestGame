import type { SavedCharacter } from "../spriteTypes";
import { characterAsSingleFrameSprite, isSpriteSheet, SPRITE_PIXEL_COUNT } from "../spriteTypes";
import type { QualityScoreResult } from "./importAssistantTypes";

function hexToLum(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 128;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function computeQualityScore(character: SavedCharacter): QualityScoreResult {
  const sprite = characterAsSingleFrameSprite(character, 0);
  const { pixels, palette } = sprite;

  let opaque = 0;
  let edgePixels = 0;
  let edgeTransitions = 0;
  const usedIndices = new Set<number>();
  let lumSum = 0;
  let lumMin = 255;
  let lumMax = 0;

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const idx = y * 64 + x;
      const pi = pixels[idx] ?? 0;
      if (pi === 0) continue;
      opaque++;
      usedIndices.add(pi);
      const lum = hexToLum(palette[pi]?.value ?? "#888");
      lumSum += lum;
      lumMin = Math.min(lumMin, lum);
      lumMax = Math.max(lumMax, lum);

      const neighbors = [
        x > 0 ? pixels[idx - 1] : 0,
        x < 63 ? pixels[idx + 1] : 0,
        y > 0 ? pixels[idx - 64] : 0,
        y < 63 ? pixels[idx + 64] : 0,
      ];
      for (const n of neighbors) {
        if (n === 0) {
          edgePixels++;
          edgeTransitions++;
        } else if (n !== pi) edgeTransitions++;
      }
    }
  }

  const coverage = opaque / SPRITE_PIXEL_COUNT;
  const transparency = Math.min(1, coverage > 0 && coverage < 0.85 ? 1 : coverage < 0.05 ? 0 : 0.7);
  const paletteUsage = Math.min(1, usedIndices.size / Math.max(1, palette.length - 1));
  const contrast = Math.min(1, (lumMax - lumMin) / 255);
  const edgeQuality = opaque > 0 ? Math.min(1, edgePixels / Math.max(1, opaque * 0.15)) : 0;

  const centerMass = opaque > 0 ? computeCenterMass(pixels) : 0.5;
  const boardReadability = Math.min(1, (opaque / 1200) * (1 - Math.abs(centerMass - 0.5) * 0.5));

  const factors = {
    edgeQuality: clamp01(edgeQuality),
    contrast: clamp01(contrast),
    paletteUsage: clamp01(paletteUsage),
    transparency: clamp01(transparency),
    boardReadability: clamp01(boardReadability),
  };

  const avg =
    (factors.edgeQuality +
      factors.contrast +
      factors.paletteUsage +
      factors.transparency +
      factors.boardReadability) /
    5;

  const stars = scoreToStars(avg);
  return { stars, label: starLabel(stars), factors };
}

function computeCenterMass(pixels: number[]): number {
  let sumX = 0;
  let count = 0;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      if ((pixels[y * 64 + x] ?? 0) !== 0) {
        sumX += x;
        count++;
      }
    }
  }
  return count > 0 ? sumX / count / 63 : 0.5;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function scoreToStars(avg: number): QualityScoreResult["stars"] {
  if (avg >= 0.85) return 5;
  if (avg >= 0.7) return 4;
  if (avg >= 0.55) return 3;
  if (avg >= 0.4) return 2;
  return 1;
}

function starLabel(stars: QualityScoreResult["stars"]): QualityScoreResult["label"] {
  switch (stars) {
    case 5:
      return "Excellent";
    case 4:
      return "Good";
    case 3:
      return "Acceptable";
    case 2:
      return "Needs Editing";
    default:
      return "Poor";
  }
}

export function formatQualityStars(stars: number): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export function estimateCharacterStorageBytes(character: SavedCharacter): number {
  return new TextEncoder().encode(JSON.stringify(character)).length;
}

export function estimateCharacterMemoryBytes(character: SavedCharacter): number {
  const frames = isSpriteSheet(character) ? character.frames.length : 1;
  return frames * SPRITE_PIXEL_COUNT * 4 + character.palette.length * 32;
}
