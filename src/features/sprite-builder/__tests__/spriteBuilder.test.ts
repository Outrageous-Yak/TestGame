import { describe, expect, it } from "vitest";
import {
  applyBrushStroke,
  clearPixels,
  floodFill,
  linePixels,
  mirrorHorizontal,
  pixelIndex,
  pixelsEqual,
  setPixelInCopy,
} from "../spriteDrawing";
import {
  canRedo,
  canUndo,
  createHistory,
  currentPixels,
  pushHistory,
  redoHistory,
  undoHistory,
} from "../spriteHistory";
import { createBlankSprite, cloneSprite, STARTER_TEMPLATES } from "../spriteConstants";
import { validateSprite, validateSpriteArray } from "../spriteValidation";
import { renderPixelsToImageData } from "../spriteRenderer";
import { SPRITE_PIXEL_COUNT, SPRITE_WIDTH } from "../spriteTypes";

describe("spriteDrawing", () => {
  it("pixelIndex and setPixelInCopy work at bounds", () => {
    const pixels = clearPixels();
    expect(pixelIndex(3, 4)).toBe(4 * SPRITE_WIDTH + 3);
    const next = setPixelInCopy(pixels, 0, 0, 2);
    expect(next[0]).toBe(2);
    expect(setPixelInCopy(pixels, -1, 0, 2)).toBe(pixels);
  });

  it("linePixels draws a diagonal", () => {
    const pts = linePixels(0, 0, 3, 3);
    expect(pts.length).toBe(4);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[3]).toEqual({ x: 3, y: 3 });
  });

  it("applyBrushStroke paints along a line", () => {
    const base = clearPixels();
    const next = applyBrushStroke(base, 1, 1, 5, 1, 3);
    expect(next[pixelIndex(3, 1)]).toBe(3);
  });

  it("floodFill replaces connected region", () => {
    let pixels = clearPixels();
    pixels = setPixelInCopy(pixels, 10, 10, 2);
    pixels = setPixelInCopy(pixels, 11, 10, 2);
    pixels = setPixelInCopy(pixels, 10, 11, 2);
    const filled = floodFill(pixels, 10, 10, 5);
    expect(filled[pixelIndex(11, 10)]).toBe(5);
    expect(filled[pixelIndex(12, 10)]).toBe(0);
  });

  it("mirrorHorizontal copies left to right", () => {
    let pixels = clearPixels();
    pixels = setPixelInCopy(pixels, 5, 10, 4);
    const mirrored = mirrorHorizontal(pixels);
    expect(mirrored[pixelIndex(SPRITE_WIDTH - 1 - 5, 10)]).toBe(4);
  });

  it("pixelsEqual compares arrays", () => {
    const a = clearPixels();
    const b = clearPixels();
    expect(pixelsEqual(a, b)).toBe(true);
    b[0] = 1;
    expect(pixelsEqual(a, b)).toBe(false);
  });
});

describe("spriteHistory", () => {
  it("supports undo and redo", () => {
    const h0 = createHistory(clearPixels());
    const h1 = pushHistory(h0, setPixelInCopy(currentPixels(h0), 1, 1, 2));
    expect(canUndo(h1)).toBe(true);
    const h2 = undoHistory(h1);
    expect(currentPixels(h2)[pixelIndex(1, 1)]).toBe(0);
    const h3 = redoHistory(h2);
    expect(currentPixels(h3)[pixelIndex(1, 1)]).toBe(2);
    expect(canRedo(h1)).toBe(false);
  });
});

describe("spriteValidation", () => {
  it("accepts a valid blank sprite", () => {
    const sprite = createBlankSprite();
    const result = validateSprite(sprite);
    expect(result.ok).toBe(true);
  });

  it("rejects wrong pixel count", () => {
    const sprite = createBlankSprite();
    const bad = { ...sprite, pixels: [0] };
    const result = validateSprite(bad);
    expect(result.ok).toBe(false);
  });

  it("validateSpriteArray filters invalid entries", () => {
    const good = createBlankSprite();
    const arr = validateSpriteArray([good, { bad: true }]);
    expect(arr.length).toBe(1);
  });
});

describe("spriteConstants", () => {
  it("createBlankSprite has transparent pixels", () => {
    const s = createBlankSprite();
    expect(s.pixels.every((p) => p === 0)).toBe(true);
    expect(s.pixels.length).toBe(SPRITE_PIXEL_COUNT);
  });

  it("cloneSprite creates a new id", () => {
    const a = createBlankSprite("A");
    const b = cloneSprite(a);
    expect(b.id).not.toBe(a.id);
    expect(b.name).toBe(a.name);
  });

  it("starter templates have painted pixels", () => {
    for (const t of STARTER_TEMPLATES) {
      expect(t.pixels.some((p) => p !== 0)).toBe(true);
      expect(validateSprite(t).ok).toBe(true);
    }
  });
});

describe("spriteRenderer", () => {
  it("renderPixelsToImageData writes opaque pixels", () => {
    const sprite = createBlankSprite();
    sprite.pixels[0] = 2;
    const data = renderPixelsToImageData(sprite);
    expect(data[3]).toBe(255);
    expect(data[0]).toBeGreaterThan(0);
  });

  it("skips transparent indices", () => {
    const sprite = createBlankSprite();
    const data = renderPixelsToImageData(sprite);
    expect(data.every((v, i) => (i % 4 === 3 ? v === 0 : v === 0))).toBe(true);
  });
});
