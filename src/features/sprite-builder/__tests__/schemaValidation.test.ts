import { describe, expect, it } from "vitest";
import {
  validateSprite,
  validateSpriteSheet,
  validateCharacter,
  createSheetFromConversion,
} from "../spriteValidation";
import { createBlankSprite } from "../spriteConstants";
import { pickPlaybackFrame } from "../spriteRenderer";
import { SPRITE_PIXEL_COUNT } from "../spriteTypes";

describe("schema validation", () => {
  it("v1 sprites still validate", () => {
    const s = createBlankSprite();
    expect(validateSprite(s).ok).toBe(true);
    expect(validateCharacter(s).ok).toBe(true);
  });

  it("v2 sheet validates frames", () => {
    const base = createBlankSprite();
    const sheet = createSheetFromConversion("Test", base.palette, base.pixels, "idle");
    const result = validateSpriteSheet(sheet);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sheet.frames.length).toBe(4);
      expect(result.sheet.frames.every((f) => f.length === SPRITE_PIXEL_COUNT)).toBe(true);
    }
  });

  it("rejects invalid v2 frame length", () => {
    const base = createBlankSprite();
    const sheet = createSheetFromConversion("Bad", base.palette, base.pixels, "static");
    const bad = { ...sheet, frames: [[0]] };
    expect(validateSpriteSheet(bad).ok).toBe(false);
  });

  it("invalid animation falls back to frame 0 in playback", () => {
    const base = createBlankSprite();
    const sheet = createSheetFromConversion("Anim", base.palette, base.pixels, "walk");
    const broken = {
      ...sheet,
      animation: [{ name: "walk", frameIndices: [99], frameDurationMs: 100, loop: true }],
    };
    expect(pickPlaybackFrame(broken, true, 500)).toBe(0);
  });
});
