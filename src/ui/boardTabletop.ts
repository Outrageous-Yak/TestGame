/**
 * Tabletop depth presentation config and row-depth helpers.
 * All tunable visual-depth values live here — not scattered through app.tsx or CSS.
 */

export const BOARD_TABLETOP_CONFIG = {
  farScale: 0.82,
  nearScale: 1.0,

  verticalDepthGamma: 1.35,

  farRowCompression: 0.72,
  nearRowCompression: 1.0,

  nearRowWidthFraction: 0.96,

  farTileDepthPx: 2,
  nearTileDepthPx: 8,

  farBrightness: 0.88,
  nearBrightness: 1.0,

  farContrast: 0.92,
  nearContrast: 1.0,

  farShadowOpacity: 0.1,
  nearShadowOpacity: 0.34,

  farShadowOffsetX: 1,
  farShadowOffsetY: 2,
  nearShadowOffsetX: 3,
  nearShadowOffsetY: 5,

  boardTopPaddingPx: 12,
  boardBottomPaddingPx: 16,
  horizontalPaddingPx: 10,

  wholeBoardTiltDeg: 0,

  rowZBase: 10,
  rowZStep: 1,

  minFarTileWidthPx: 46,
} as const;

export type BoardTabletopConfig = typeof BOARD_TABLETOP_CONFIG;

/** Development-only depth overlay (pointer-events: none). */
export const BOARD_DEBUG_DEPTH = true;

/** Development-only geometry overlay (pointer-events: none). */
export const BOARD_DEBUG_GEOMETRY = false;

export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function rowProgress(rowIndex: number, rowCount: number): number {
  if (rowCount <= 1) return 0;
  return rowIndex / (rowCount - 1);
}

export function rowScaleAt(
  rowIndex: number,
  rowCount: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): number {
  const p = rowProgress(rowIndex, rowCount);
  const t = smoothstep(p);
  return config.farScale + (config.nearScale - config.farScale) * t;
}

export function depthCompressionAt(
  midProgress: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): number {
  const gammaT = Math.pow(Math.max(0, Math.min(1, midProgress)), config.verticalDepthGamma);
  return config.farRowCompression + (config.nearRowCompression - config.farRowCompression) * gammaT;
}

export function tileDepthPxAt(
  rowIndex: number,
  rowCount: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): number {
  const t = smoothstep(rowProgress(rowIndex, rowCount));
  return config.farTileDepthPx + (config.nearTileDepthPx - config.farTileDepthPx) * t;
}

export function faceAtmosphereAt(
  rowIndex: number,
  rowCount: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): { brightness: number; contrast: number; rowDarken: number } {
  const t = smoothstep(rowProgress(rowIndex, rowCount));
  const brightness = config.farBrightness + (config.nearBrightness - config.farBrightness) * t;
  const contrast = config.farContrast + (config.nearContrast - config.farContrast) * t;
  const rowDarken = (1 - brightness) * 0.42 + (1 - contrast) * 0.14;
  return { brightness, contrast, rowDarken };
}

export function shadowAt(
  rowIndex: number,
  rowCount: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): { opacity: number; offsetX: number; offsetY: number } {
  const t = smoothstep(rowProgress(rowIndex, rowCount));
  return {
    opacity: config.farShadowOpacity + (config.nearShadowOpacity - config.farShadowOpacity) * t,
    offsetX: config.farShadowOffsetX + (config.nearShadowOffsetX - config.farShadowOffsetX) * t,
    offsetY: config.farShadowOffsetY + (config.nearShadowOffsetY - config.farShadowOffsetY) * t,
  };
}

export function rowZIndexAt(
  rowIndex: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): number {
  return config.rowZBase + rowIndex * config.rowZStep;
}
