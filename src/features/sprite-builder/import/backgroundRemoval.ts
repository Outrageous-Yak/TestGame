/** Background preparation — edge-connected removal and manual mask. */

export type BackgroundMode = "keep" | "solid-remove" | "manual-mask" | "has-alpha";

export type Rgba = { r: number; g: number; b: number; a: number };

export function getPixel(data: ImageData, x: number, y: number): Rgba {
  const i = (y * data.width + x) * 4;
  return { r: data.data[i]!, g: data.data[i + 1]!, b: data.data[i + 2]!, a: data.data[i + 3]! };
}

export function setPixelAlpha(data: ImageData, x: number, y: number, alpha: number): void {
  const i = (y * data.width + x) * 4;
  data.data[i + 3] = alpha;
}

export function colorDistance(a: Rgba, b: Rgba): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function colorsMatch(a: Rgba, b: Rgba, tolerance: number): boolean {
  return colorDistance(a, b) <= tolerance;
}

export function applyAlphaThreshold(data: ImageData, threshold: number): ImageData {
  const out = cloneImageData(data);
  for (let i = 3; i < out.data.length; i += 4) {
    if (out.data[i]! < threshold) out.data[i] = 0;
  }
  return out;
}

export function cloneImageData(data: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
}

/** Flood fill transparency from canvas edges through matching colors. */
export function removeEdgeConnectedBackground(
  data: ImageData,
  seed: { x: number; y: number },
  tolerance: number,
  removeAllMatching: boolean
): ImageData {
  const out = cloneImageData(data);
  const w = out.width;
  const h = out.height;
  const seedColor = getPixel(out, seed.x, seed.y);
  const visited = new Uint8Array(w * h);
  const toRemove = new Uint8Array(w * h);

  const stack: Array<{ x: number; y: number }> = [];

  const tryPush = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (colorsMatch(getPixel(out, x, y), seedColor, tolerance)) {
      toRemove[idx] = 1;
      stack.push({ x, y });
    }
  };

  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  if (!toRemove[seed.y * w + seed.x]) {
    tryPush(seed.x, seed.y);
  }

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const px = getPixel(out, x, y);
      const shouldRemove = removeAllMatching
        ? colorsMatch(px, seedColor, tolerance)
        : toRemove[idx] === 1;
      if (shouldRemove) setPixelAlpha(out, x, y, 0);
    }
  }

  return out;
}

/** Manual eraser brush on alpha channel. */
export function applyMaskBrush(
  data: ImageData,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
  erase: boolean
): ImageData {
  const out = cloneImageData(data);
  const points = linePoints(fromX, fromY, toX, toY);
  for (const { x, y } of points) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const px = x + dx;
        const py = y + dy;
        if (px < 0 || px >= out.width || py < 0 || py >= out.height) continue;
        setPixelAlpha(out, px, py, erase ? 0 : 255);
      }
    }
  }
  return out;
}

function linePoints(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    points.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

export function hasTransparency(data: ImageData): boolean {
  for (let i = 3; i < data.data.length; i += 4) {
    if (data.data[i]! < 250) return true;
  }
  return false;
}

/** Placeholder hook for future on-device segmentation. */
export type SegmentationProvider = (data: ImageData) => Promise<ImageData>;

export const segmentationNotAvailable: SegmentationProvider = async (data) => data;
