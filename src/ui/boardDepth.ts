/**
 * Visual-only 2.5D board depth helpers (rendering layer; no gameplay impact).
 */

export const BOARD_PERSPECTIVE_CONFIG = {
  perspectivePx: 1200,
  tiltDeg: 9,
  farScale: 0.92,
  nearScale: 1.0,
  maxArcPx: 8,
  tileDepthPx: 5,
  farBrightness: 0.92,
  farContrast: 0.95,
  farOpacity: 0.97,
} as const;

/** depth 0 = top/furthest row, 1 = bottom/nearest row */
export function rowDepth(rowIndex: number, rowCount: number): number {
  if (rowCount <= 1) return 0;
  return rowIndex / (rowCount - 1);
}

/** Interpolate scale between far (top) and near (bottom). */
export function rowScale(depth: number): number {
  const { farScale, nearScale } = BOARD_PERSPECTIVE_CONFIG;
  return farScale + (nearScale - farScale) * depth;
}

/** Symmetrical vertical bow: 0 at top/bottom, peak at middle rows. */
export function rowArcOffsetPx(depth: number): number {
  return Math.sin(depth * Math.PI) * BOARD_PERSPECTIVE_CONFIG.maxArcPx;
}

export function rowAtmosphere(depth: number): {
  brightness: number;
  contrast: number;
  opacity: number;
} {
  const { farBrightness, farContrast, farOpacity } = BOARD_PERSPECTIVE_CONFIG;
  return {
    brightness: farBrightness + (1 - farBrightness) * depth,
    contrast: farContrast + (1 - farContrast) * depth,
    opacity: farOpacity + (1 - farOpacity) * depth,
  };
}

/** Overlay strength for far rows (tile-face pseudo only; overlays stay unaffected). */
export function rowFaceOverlay(depth: number): { darken: number } {
  const atm = rowAtmosphere(depth);
  return {
    darken:
      (1 - atm.brightness) * 0.38 +
      (1 - atm.contrast) * 0.12 +
      (1 - atm.opacity) * 0.22,
  };
}

export function rowZIndex(rowIndex: number): number {
  return 10 + rowIndex;
}

export type RowPerspectiveVars = {
  rowScale: number;
  rowArcPx: number;
  rowZ: number;
  rowDarken: number;
};

export function rowPerspectiveVars(rowIndex: number, rowCount: number): RowPerspectiveVars {
  const depth = rowDepth(rowIndex, rowCount);
  const overlay = rowFaceOverlay(depth);
  return {
    rowScale: rowScale(depth),
    rowArcPx: rowArcOffsetPx(depth),
    rowZ: rowZIndex(rowIndex),
    rowDarken: overlay.darken,
  };
}
