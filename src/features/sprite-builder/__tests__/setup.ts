/** Minimal ImageData polyfill for Node test environment. */
if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = class ImageData {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
    readonly colorSpace: PredefinedColorSpace = "srgb";

    constructor(swOrData: number | Uint8ClampedArray, sh?: number, height?: number) {
      if (swOrData instanceof Uint8ClampedArray) {
        this.data = swOrData;
        this.width = sh!;
        this.height = height ?? Math.floor(swOrData.length / (4 * this.width));
      } else {
        this.width = swOrData;
        this.height = sh!;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  } as unknown as typeof ImageData;
}
