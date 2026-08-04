/** Procedural sprite-sheet frame generation. */

import { SPRITE_PIXEL_COUNT, SPRITE_WIDTH } from "../spriteTypes";
import { pixelIndex } from "../spriteDrawing";

export type SheetType = "static" | "idle" | "walk" | "directional";

export function shiftPixelsVertical(pixels: number[], dy: number): number[] {
  const out = new Array(SPRITE_PIXEL_COUNT).fill(0);
  for (let y = 0; y < SPRITE_WIDTH; y++) {
    for (let x = 0; x < SPRITE_WIDTH; x++) {
      const srcY = y - dy;
      if (srcY < 0 || srcY >= SPRITE_WIDTH) continue;
      out[pixelIndex(x, y)] = pixels[pixelIndex(x, srcY)] ?? 0;
    }
  }
  return out;
}

export function shiftPixelsHorizontal(pixels: number[], dx: number): number[] {
  const out = new Array(SPRITE_PIXEL_COUNT).fill(0);
  for (let y = 0; y < SPRITE_WIDTH; y++) {
    for (let x = 0; x < SPRITE_WIDTH; x++) {
      const srcX = x - dx;
      if (srcX < 0 || srcX >= SPRITE_WIDTH) continue;
      out[pixelIndex(x, y)] = pixels[pixelIndex(srcX, y)] ?? 0;
    }
  }
  return out;
}

function shiftRegion(
  pixels: number[],
  regionYStart: number,
  regionYEnd: number,
  dx: number,
  dy: number
): number[] {
  const out = [...pixels];
  const extracted: Array<{ x: number; y: number; v: number }> = [];
  for (let y = regionYStart; y < regionYEnd; y++) {
    for (let x = 0; x < SPRITE_WIDTH; x++) {
      const v = pixels[pixelIndex(x, y)] ?? 0;
      if (v !== 0) extracted.push({ x, y, v });
      out[pixelIndex(x, y)] = 0;
    }
  }
  for (const { x, y, v } of extracted) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < SPRITE_WIDTH && ny >= 0 && ny < SPRITE_WIDTH) {
      out[pixelIndex(nx, ny)] = v;
    }
  }
  return out;
}

/** 4-frame idle bob: up 1px, base, down 1px, base. */
export function generateIdleFrames(base: number[]): number[][] {
  return [
    base,
    shiftPixelsVertical(base, -1),
    base,
    shiftPixelsVertical(base, 1),
  ];
}

/** 4-frame restrained walk cycle for one facing. */
export function generateWalkFrames(base: number[]): number[][] {
  const limbStart = Math.floor(SPRITE_WIDTH * 0.55);
  return [
    base,
    shiftRegion(shiftPixelsVertical(base, -1), limbStart, SPRITE_WIDTH, -1, 0),
    base,
    shiftRegion(shiftPixelsVertical(base, 1), limbStart, SPRITE_WIDTH, 1, 0),
  ];
}

/** Approximate directional sheet — clearly procedural. */
export function generateDirectionalFrames(base: number[]): number[][] {
  const left = shiftPixelsHorizontal(base, -2);
  const right = shiftPixelsHorizontal(base, 2);
  const back = shiftPixelsVertical(base, 1);
  return [base, left, right, back];
}

export function generateFramesForType(type: SheetType, base: number[]): number[][] {
  switch (type) {
    case "idle":
      return generateIdleFrames(base);
    case "walk":
      return generateWalkFrames(base);
    case "directional":
      return generateDirectionalFrames(base);
  }
  return [base];
}

export function validateGeneratedFrames(frames: number[][]): boolean {
  return frames.every((f) => f.length === SPRITE_PIXEL_COUNT);
}
