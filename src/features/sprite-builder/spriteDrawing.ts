import { SPRITE_WIDTH } from "./spriteTypes";

export function pixelIndex(x: number, y: number): number {
  return y * SPRITE_WIDTH + x;
}

export function coordsFromIndex(index: number): { x: number; y: number } {
  return { x: index % SPRITE_WIDTH, y: Math.floor(index / SPRITE_WIDTH) };
}

export function setPixelInCopy(pixels: number[], x: number, y: number, value: number): number[] {
  if (x < 0 || x >= SPRITE_WIDTH || y < 0 || y >= SPRITE_WIDTH) return pixels;
  const next = [...pixels];
  next[pixelIndex(x, y)] = value;
  return next;
}

/** Bresenham line — returns all cells including endpoints. */
export function linePixels(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
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

export function applyBrushStroke(
  pixels: number[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  value: number
): number[] {
  const points = linePixels(fromX, fromY, toX, toY);
  let next = pixels;
  for (const { x, y } of points) {
    next = setPixelInCopy(next, x, y, value);
  }
  return next;
}

/** Iterative 4-direction flood fill. */
export function floodFill(pixels: number[], startX: number, startY: number, replacement: number): number[] {
  if (startX < 0 || startX >= SPRITE_WIDTH || startY < 0 || startY >= SPRITE_WIDTH) {
    return pixels;
  }

  const startIdx = pixelIndex(startX, startY);
  const target = pixels[startIdx];
  if (target === replacement) return pixels;

  const next = [...pixels];
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

  while (stack.length > 0) {
    const { x, y } = stack.pop()!;
    const idx = pixelIndex(x, y);
    if (next[idx] !== target) continue;
    next[idx] = replacement;

    if (x > 0) stack.push({ x: x - 1, y });
    if (x < SPRITE_WIDTH - 1) stack.push({ x: x + 1, y });
    if (y > 0) stack.push({ x, y: y - 1 });
    if (y < SPRITE_WIDTH - 1) stack.push({ x, y: y + 1 });
  }

  return next;
}

export function mirrorHorizontal(pixels: number[]): number[] {
  const next = [...pixels];
  for (let y = 0; y < SPRITE_WIDTH; y++) {
    for (let x = 0; x < SPRITE_WIDTH / 2; x++) {
      const left = pixelIndex(x, y);
      const right = pixelIndex(SPRITE_WIDTH - 1 - x, y);
      next[right] = pixels[left];
      next[left] = pixels[right];
    }
  }
  return next;
}

export function clearPixels(): number[] {
  return new Array(SPRITE_WIDTH * SPRITE_WIDTH).fill(0);
}

export function pixelsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
