/** Image import constants and file validation. */

export const MAX_IMPORT_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_WORK_EDGE = 1024;

export const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const ACCEPTED_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp)$/i;

export type ImageDecodeError =
  | "unsupported-type"
  | "file-too-large"
  | "decode-failed"
  | "empty-image";

export function validateImageFile(file: File): ImageDecodeError | null {
  const typeOk = ACCEPTED_IMAGE_TYPES.has(file.type) || ACCEPTED_IMAGE_EXTENSIONS.test(file.name);
  if (!typeOk) return "unsupported-type";
  if (file.size > MAX_IMPORT_FILE_BYTES) return "file-too-large";
  return null;
}

export function imageDecodeErrorMessage(err: ImageDecodeError): string {
  switch (err) {
    case "unsupported-type":
      return "Please choose a PNG, JPEG, or WebP image.";
    case "file-too-large":
      return `Image is too large. Maximum size is ${Math.round(MAX_IMPORT_FILE_BYTES / (1024 * 1024))} MB.`;
    case "decode-failed":
      return "Could not decode the image. Try a different file.";
    case "empty-image":
      return "The image has no visible content.";
    default:
      return "Unknown image error.";
  }
}

/** Downsample so longest edge ≤ maxEdge, preserving aspect ratio. */
export function computeDownsampleSize(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function drawImageToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

export async function decodeImageFile(file: File): Promise<HTMLCanvasElement> {
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);

  let bitmap: ImageBitmap | null = null;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const size = computeDownsampleSize(bitmap.width, bitmap.height, MAX_WORK_EDGE);
      const canvas = drawImageToCanvas(bitmap, size.width, size.height);
      bitmap.close();
      return canvas;
    }
  } catch {
    bitmap?.close();
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = computeDownsampleSize(img.naturalWidth, img.naturalHeight, MAX_WORK_EDGE);
      resolve(drawImageToCanvas(img, size.width, size.height));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode-failed"));
    };
    img.src = url;
  });
}

export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  return drawImageToCanvas(source, source.width, source.height);
}

export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("decode-failed");
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}
