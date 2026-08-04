import { describe, expect, it } from "vitest";
import {
  DEFAULT_CROP_TRANSFORM,
  fitCharacterTransform,
  renderCropWorkspace,
  workspaceToSource,
  nextRotation,
} from "../import/imageCrop";

function solidImageData(size: number, r: number, g: number, b: number, a = 255): ImageData {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  }
  return new ImageData(data, size, size);
}

describe("imageCrop", () => {
  it("fitCharacterTransform scales image into workspace", () => {
    const t = fitCharacterTransform(800, 400, 512);
    expect(t.scale).toBeGreaterThan(0);
    expect(t.scale).toBeLessThanOrEqual(1);
  });

  it("workspaceToSource maps center to image center", () => {
    const mapped = workspaceToSource(256, 256, 512, 100, 100, DEFAULT_CROP_TRANSFORM);
    expect(mapped).not.toBeNull();
    expect(mapped!.x).toBeCloseTo(50, 0);
    expect(mapped!.y).toBeCloseTo(50, 0);
  });

  it("renderCropWorkspace produces square output", () => {
    const src = solidImageData(64, 200, 100, 50);
    const transform = fitCharacterTransform(64, 64, 128);
    const out = renderCropWorkspace(src, 128, transform);
    expect(out.width).toBe(128);
    expect(out.height).toBe(128);
    expect(out.data.some((v, i) => i % 4 === 0 && v === 200)).toBe(true);
  });

  it("nextRotation cycles 90 degrees", () => {
    expect(nextRotation(0)).toBe(90);
    expect(nextRotation(270)).toBe(0);
  });
});
