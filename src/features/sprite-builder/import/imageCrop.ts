/** Crop and position math for square import workspace. */

export type CropRotation = 0 | 90 | 180 | 270;

export type CropTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: CropRotation;
  flipH: boolean;
};

export const DEFAULT_CROP_TRANSFORM: CropTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  flipH: false,
};

export function fitCharacterTransform(
  imageWidth: number,
  imageHeight: number,
  workspaceSize: number
): CropTransform {
  const scale = Math.min(workspaceSize / imageWidth, workspaceSize / imageHeight) * 0.9;
  return { offsetX: 0, offsetY: 0, scale, rotation: 0, flipH: false };
}

function rotatePoint(x: number, y: number, rotation: CropRotation): { x: number; y: number } {
  switch (rotation) {
    case 90:
      return { x: -y, y: x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: y, y: -x };
    default:
      return { x, y };
  }
}

/** Map workspace pixel to source image coordinates (inverse transform). */
export function workspaceToSource(
  wx: number,
  wy: number,
  workspaceSize: number,
  imageWidth: number,
  imageHeight: number,
  transform: CropTransform
): { x: number; y: number } | null {
  const cx = workspaceSize / 2;
  const cy = workspaceSize / 2;
  let lx = wx - cx - transform.offsetX;
  let ly = wy - cy - transform.offsetY;
  ({ x: lx, y: ly } = rotatePoint(lx, ly, ((360 - transform.rotation) % 360) as CropRotation));
  if (transform.flipH) lx = -lx;
  lx /= transform.scale;
  ly /= transform.scale;
  const sx = lx + imageWidth / 2;
  const sy = ly + imageHeight / 2;
  if (sx < 0 || sy < 0 || sx >= imageWidth || sy >= imageHeight) return null;
  return { x: sx, y: sy };
}

/** Sample source image into a square workspace using nearest-neighbor. */
export function renderCropWorkspace(
  source: ImageData,
  workspaceSize: number,
  transform: CropTransform
): ImageData {
  const out = new ImageData(workspaceSize, workspaceSize);
  const { width: sw, height: sh, data: src } = source;

  for (let y = 0; y < workspaceSize; y++) {
    for (let x = 0; x < workspaceSize; x++) {
      const mapped = workspaceToSource(x, y, workspaceSize, sw, sh, transform);
      const oi = (y * workspaceSize + x) * 4;
      if (!mapped) {
        out.data[oi + 3] = 0;
        continue;
      }
      const sx = Math.min(sw - 1, Math.max(0, Math.floor(mapped.x)));
      const sy = Math.min(sh - 1, Math.max(0, Math.floor(mapped.y)));
      const si = (sy * sw + sx) * 4;
      out.data[oi] = src[si]!;
      out.data[oi + 1] = src[si + 1]!;
      out.data[oi + 2] = src[si + 2]!;
      out.data[oi + 3] = src[si + 3]!;
    }
  }
  return out;
}

/** Extract square crop from workspace (full workspace is square). */
export function extractSquareCrop(workspace: ImageData): ImageData {
  const size = workspace.width;
  if (workspace.height !== size) throw new Error("Workspace must be square");
  return new ImageData(new Uint8ClampedArray(workspace.data), size, size);
}

export function imageDataToCanvas(data: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.putImageData(data, 0, 0);
  return canvas;
}

export function nextRotation(current: CropRotation): CropRotation {
  return ((current + 90) % 360) as CropRotation;
}
