import { describe, expect, it } from "vitest";
import { extractSquareCrop, fitCharacterTransform, renderCropWorkspace } from "../import/imageCrop";
import { applyAlphaThreshold, removeEdgeConnectedBackground } from "../import/backgroundRemoval";
import { convertImageDataToSprite, DEFAULT_CONVERSION_SETTINGS } from "../import/pixelConversion";
import { createSheetFromConversion, createSpriteFromConversion } from "../spriteValidation";
import { SPRITE_PIXEL_COUNT } from "../spriteTypes";
import { characterAsSingleFrameSprite } from "../spriteTypes";
import { pickPlaybackFrame } from "../spriteRenderer";

function rgba(w: number, h: number, r: number, g: number, b: number, a = 255): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  }
  return new ImageData(data, w, h);
}

describe("import pipeline", () => {
  it("crop → convert → save → select flow produces valid character", () => {
    const source = rgba(32, 32, 40, 120, 200, 255);
    const cropped = extractSquareCrop(renderCropWorkspace(source, 64, fitCharacterTransform(32, 32, 64)));
    const bg = applyAlphaThreshold(cropped, 32);
    const cleared = removeEdgeConnectedBackground(bg, { x: 0, y: 0 }, 10, false);
    const { palette, pixels } = convertImageDataToSprite(cleared, DEFAULT_CONVERSION_SETTINGS);

    expect(pixels.length).toBe(SPRITE_PIXEL_COUNT);
    expect(palette[0]?.value).toBe("transparent");

    const sprite = createSpriteFromConversion("Imported", palette, pixels);
    const sheet = createSheetFromConversion(sprite.name, sprite.palette, sprite.pixels, "idle");
    const preview = characterAsSingleFrameSprite(sheet, 0);

    expect(preview.pixels.length).toBe(SPRITE_PIXEL_COUNT);
    expect(pickPlaybackFrame(sheet, false, 200)).toBeGreaterThanOrEqual(0);
  });
});
