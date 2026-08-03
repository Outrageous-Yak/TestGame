import { describe, expect, it } from "vitest";
import {
  applyAlphaThreshold,
  colorDistance,
  colorsMatch,
  removeEdgeConnectedBackground,
  hasTransparency,
} from "../import/backgroundRemoval";

function rgba(w: number, h: number, fill: [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    data[o] = fill[0];
    data[o + 1] = fill[1];
    data[o + 2] = fill[2];
    data[o + 3] = fill[3];
  }
  return new ImageData(data, w, h);
}

describe("backgroundRemoval", () => {
  it("colorDistance and tolerance matching", () => {
    expect(colorDistance({ r: 0, g: 0, b: 0, a: 255 }, { r: 3, g: 4, b: 0, a: 255 })).toBe(5);
    expect(colorsMatch({ r: 10, g: 10, b: 10, a: 255 }, { r: 12, g: 11, b: 10, a: 255 }, 5)).toBe(true);
  });

  it("applyAlphaThreshold clears faint pixels", () => {
    const img = rgba(2, 2, [100, 100, 100, 20]);
    const out = applyAlphaThreshold(img, 32);
    expect(out.data[3]).toBe(0);
  });

  it("removeEdgeConnectedBackground removes border-connected region", () => {
    const img = rgba(4, 4, [255, 0, 0, 255]);
    const centerIdx = (2 * 4 + 2) * 4;
    img.data[centerIdx] = 0;
    img.data[centerIdx + 1] = 255;
    img.data[centerIdx + 2] = 0;
    const out = removeEdgeConnectedBackground(img, { x: 0, y: 0 }, 0, false);
    expect(out.data[3]).toBe(0);
    expect(out.data[centerIdx + 3]).toBe(255);
  });

  it("hasTransparency detects alpha", () => {
    expect(hasTransparency(rgba(2, 2, [0, 0, 0, 0]))).toBe(true);
    expect(hasTransparency(rgba(2, 2, [0, 0, 0, 255]))).toBe(false);
  });
});
