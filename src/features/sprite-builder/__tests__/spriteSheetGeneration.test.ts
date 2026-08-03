import { describe, expect, it } from "vitest";
import {
  generateIdleFrames,
  generateWalkFrames,
  validateGeneratedFrames,
  shiftPixelsVertical,
} from "../import/spriteSheetGeneration";
import { SPRITE_PIXEL_COUNT } from "../spriteTypes";

function samplePixels(): number[] {
  const p = new Array(SPRITE_PIXEL_COUNT).fill(0);
  for (let y = 40; y < 50; y++) {
    for (let x = 28; x < 36; x++) {
      p[y * 64 + x] = 2;
    }
  }
  return p;
}

describe("spriteSheetGeneration", () => {
  it("idle frames keep dimensions", () => {
    const base = samplePixels();
    const frames = generateIdleFrames(base);
    expect(frames.length).toBe(4);
    expect(validateGeneratedFrames(frames)).toBe(true);
  });

  it("walk frames keep dimensions", () => {
    const frames = generateWalkFrames(samplePixels());
    expect(frames.length).toBe(4);
    expect(frames.every((f) => f.length === SPRITE_PIXEL_COUNT)).toBe(true);
  });

  it("shiftPixelsVertical moves content", () => {
    const base = samplePixels();
    const shifted = shiftPixelsVertical(base, -1);
    expect(shifted).not.toEqual(base);
    expect(shifted.length).toBe(SPRITE_PIXEL_COUNT);
  });
});
