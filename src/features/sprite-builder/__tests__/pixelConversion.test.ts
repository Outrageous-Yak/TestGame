import { describe, expect, it } from "vitest";
import {
  convertRgbaBuffer,
  conversionSettingsHash,
  DEFAULT_CONVERSION_SETTINGS,
  medianCutQuantize,
  downscaleNearestSquare,
} from "../import/pixelConversion";
import { SPRITE_PIXEL_COUNT } from "../spriteTypes";

describe("pixelConversion", () => {
  it("medianCutQuantize returns requested color count", () => {
    const colors = Array.from({ length: 100 }, (_, i) => ({ r: i, g: i % 50, b: (i * 3) % 255 }));
    const palette = medianCutQuantize(colors, 8);
    expect(palette.length).toBeLessThanOrEqual(8);
    expect(palette.length).toBeGreaterThan(0);
  });

  it("downscaleNearestSquare outputs 64x64", () => {
    const data = new Uint8ClampedArray(128 * 128 * 4).fill(255);
    const src = new ImageData(data, 128, 128);
    const out = downscaleNearestSquare(src, 64);
    expect(out.width).toBe(64);
    expect(out.height).toBe(64);
  });

  it("produces exactly 4096 palette indices", () => {
    const rgba = new Uint8ClampedArray(64 * 64 * 4);
    for (let i = 0; i < 64 * 64; i++) {
      const o = i * 4;
      rgba[o] = (i * 7) % 255;
      rgba[o + 1] = (i * 3) % 255;
      rgba[o + 2] = (i * 11) % 255;
      rgba[o + 3] = i % 5 === 0 ? 0 : 255;
    }
    const { pixels, palette } = convertRgbaBuffer(64, 64, rgba, DEFAULT_CONVERSION_SETTINGS);
    expect(pixels.length).toBe(SPRITE_PIXEL_COUNT);
    expect(palette[0]?.id).toBe("transparent");
    for (const p of pixels) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(palette.length);
    }
  });

  it("deterministic conversion for same settings", () => {
    const rgba = new Uint8ClampedArray(32 * 32 * 4).fill(200);
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
    const a = convertRgbaBuffer(32, 32, rgba, { ...DEFAULT_CONVERSION_SETTINGS, paletteSize: 16 });
    const b = convertRgbaBuffer(32, 32, rgba, { ...DEFAULT_CONVERSION_SETTINGS, paletteSize: 16 });
    expect(a.pixels).toEqual(b.pixels);
    expect(conversionSettingsHash(DEFAULT_CONVERSION_SETTINGS)).toContain("clean");
  });

  it("respects palette size limits", () => {
    const rgba = new Uint8ClampedArray(16 * 16 * 4);
    for (let i = 0; i < 16 * 16; i++) {
      const o = i * 4;
      rgba[o] = i * 10;
      rgba[o + 1] = 50;
      rgba[o + 2] = 100;
      rgba[o + 3] = 255;
    }
    for (const size of [8, 16, 32] as const) {
      const { palette } = convertRgbaBuffer(16, 16, rgba, {
        ...DEFAULT_CONVERSION_SETTINGS,
        paletteSize: size,
      });
      expect(palette.length).toBeLessThanOrEqual(size + 1);
    }
  });

  it("index 0 remains transparent for alpha pixels", () => {
    const rgba = new Uint8ClampedArray(8 * 8 * 4);
    const { pixels } = convertRgbaBuffer(8, 8, rgba, DEFAULT_CONVERSION_SETTINGS);
    expect(pixels.every((p) => p === 0)).toBe(true);
  });
});
