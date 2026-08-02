/**
 * Visual-only projected board layout (rendering layer; no gameplay impact).
 */

export const PROJECTED_BOARD_CONFIG = {
  farFactor: 0.78,
  nearFactor: 1.0,
  depthYGamma: 1.45,
  nearRowWidthFraction: 0.94,
  horizontalPaddingPx: 10,
  verticalPaddingPx: 10,
  baseTileDepthPx: 6,
  maxBowPx: 0,
  minFarTileWidthPx: 46,
  /** Flat-top honeycomb row overlap ratio (matches CSS row-gap -0.20). */
  rowOverlapRatio: 0.8,
  /** Far-row gap compression toward viewer (1 = none, lower = tighter far rows). */
  farGapCompression: 0.68,
  hexAspect: 0.875,
} as const;

export type ProjectedBoardConfig = typeof PROJECTED_BOARD_CONFIG;

export type ProjectedTileRect = {
  row: number;
  slotCol: number;
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  zIndex: number;
  tileDepth: number;
  rowDarken: number;
  perspectiveFactor: number;
};

export type ProjectedBoardLayout = {
  stageWidth: number;
  stageHeight: number;
  boardCenterX: number;
  tiles: ProjectedTileRect[];
  baseTileWidth: number;
  uniformScale: number;
};

export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function rowProgress(rowIndex: number, rowCount: number): number {
  if (rowCount <= 1) return 0;
  return rowIndex / (rowCount - 1);
}

export function perspectiveFactor(rowIndex: number, rowCount: number, config: ProjectedBoardConfig): number {
  const p = rowProgress(rowIndex, rowCount);
  const { farFactor, nearFactor } = config;
  return farFactor + (nearFactor - farFactor) * smoothstep(p);
}

/** Atmosphere darken for far rows (tile-face pseudo only). */
export function rowDarkenForFactor(pf: number, config: ProjectedBoardConfig): number {
  const depth = (pf - config.farFactor) / Math.max(1e-6, config.nearFactor - config.farFactor);
  const farBrightness = 0.92;
  const farContrast = 0.95;
  const farOpacity = 0.97;
  const brightness = farBrightness + (1 - farBrightness) * depth;
  const contrast = farContrast + (1 - farContrast) * depth;
  const opacity = farOpacity + (1 - farOpacity) * depth;
  return (1 - brightness) * 0.38 + (1 - contrast) * 0.12 + (1 - opacity) * 0.22;
}

/**
 * Horizontal center for a slot.
 *
 * Stagger formula (no 14-col grid):
 *   localColumnOffset = slotCol - (rowLength - 1) / 2
 *   centerX = boardCenterX + localColumnOffset * horizontalStep
 *
 * Seven-tile rows use half-integer offsets {-3..3}; six-tile rows use {-2.5..2.5}.
 * That 0.5-step shift matches the flat grid's odd/even column placement without
 * applying a whole-row offset that would drift off the shared board axis.
 */
export function projectedCenterX(
  slotCol: number,
  rowLength: number,
  boardCenterX: number,
  horizontalStep: number
): number {
  const localColumnOffset = slotCol - (rowLength - 1) / 2;
  return boardCenterX + localColumnOffset * horizontalStep;
}

/**
 * Row center Y positions: honeycomb vertical steps with far-row compression.
 *
 * Between rows r and r+1:
 *   step = rowOverlapRatio * avg(tileHeight[r], tileHeight[r+1])
 *        * gapCompression(midRowProgress)
 *
 * gapCompression blends from farGapCompression (far) to 1.0 (near).
 */
export function projectedRowCenterYs(
  tileHeights: number[],
  rowCount: number,
  config: ProjectedBoardConfig
): number[] {
  const centers: number[] = new Array(rowCount);
  centers[0] = tileHeights[0] / 2;

  for (let r = 1; r < rowCount; r++) {
    const avgH = (tileHeights[r - 1] + tileHeights[r]) / 2;
    const midP = (rowProgress(r - 1, rowCount) + rowProgress(r, rowCount)) / 2;
    const gapCompression = config.farGapCompression + (1 - config.farGapCompression) * smoothstep(midP);
    const step = config.rowOverlapRatio * avgH * gapCompression;
    centers[r] = centers[r - 1] + step;
  }

  // Nonlinear depth remap: compress far rows toward near while preserving monotonic Y.
  const depthYs = Array.from({ length: rowCount }, (_, r) =>
    Math.pow(rowProgress(r, rowCount), config.depthYGamma)
  );
  const naturalSpan = centers[rowCount - 1] - centers[0];
  const depthSpan = depthYs[rowCount - 1] - depthYs[0];
  const origin = centers[0];

  return centers.map((_, r) => {
    const t = depthSpan > 0 ? (depthYs[r] - depthYs[0]) / depthSpan : rowProgress(r, rowCount);
    return origin + t * naturalSpan;
  });
}

export function computeBaseTileWidth(viewportWidth: number, config: ProjectedBoardConfig): number {
  const usableW = Math.max(1, viewportWidth - config.horizontalPaddingPx * 2);
  const widestRowTiles = 7;
  return (usableW * config.nearRowWidthFraction) / (widestRowTiles * config.nearFactor);
}

export function projectBoardLayout(
  rowLens: readonly number[],
  viewportWidth: number,
  viewportHeight: number,
  config: ProjectedBoardConfig = PROJECTED_BOARD_CONFIG
): ProjectedBoardLayout {
  const rowCount = rowLens.length;
  const baseTileWidth = computeBaseTileWidth(viewportWidth, config);
  const baseTileHeight = baseTileWidth * config.hexAspect;

  const pfByRow = rowLens.map((_, r) => perspectiveFactor(r, rowCount, config));
  const tileHeights = pfByRow.map((pf) => baseTileHeight * pf);
  const tileWidths = pfByRow.map((pf) => baseTileWidth * pf);
  const rowCenterYs = projectedRowCenterYs(tileHeights, rowCount, config);

  const provisionalCenterX = viewportWidth / 2;
  const tiles: ProjectedTileRect[] = [];

  for (let r = 0; r < rowCount; r++) {
    const rowLen = rowLens[r] ?? 7;
    const pf = pfByRow[r];
    const tileWidth = tileWidths[r];
    const tileHeight = tileHeights[r];
    const horizontalStep = baseTileWidth * pf;
    const tileDepth = config.baseTileDepthPx * pf;
    const rowDarken = rowDarkenForFactor(pf, config);
    const centerY = rowCenterYs[r];
    const bow = config.maxBowPx > 0 ? Math.sin(rowProgress(r, rowCount) * Math.PI) * config.maxBowPx * pf : 0;

    for (let slotCol = 0; slotCol < rowLen; slotCol++) {
      const centerX = projectedCenterX(slotCol, rowLen, provisionalCenterX, horizontalStep);
      const top = centerY - tileHeight / 2 + bow;
      const left = centerX - tileWidth / 2;
      tiles.push({
        row: r,
        slotCol,
        left,
        top,
        width: tileWidth,
        height: tileHeight,
        centerX,
        centerY: centerY + bow,
        zIndex: r * 100 + slotCol,
        tileDepth,
        rowDarken,
        perspectiveFactor: pf,
      });
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const t of tiles) {
    minX = Math.min(minX, t.left);
    minY = Math.min(minY, t.top);
    maxX = Math.max(maxX, t.left + t.width);
    maxY = Math.max(maxY, t.top + t.height + t.tileDepth);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = viewportWidth;
    maxY = viewportHeight;
  }

  const bboxW = maxX - minX;
  const bboxH = maxY - minY;
  const usableH = Math.max(1, viewportHeight - config.verticalPaddingPx * 2);
  const usableW = Math.max(1, viewportWidth - config.horizontalPaddingPx * 2);
  let uniformScale = 1;
  if (bboxH > usableH) {
    uniformScale = usableH / bboxH;
  }
  if (bboxW * uniformScale > usableW) {
    uniformScale = Math.min(uniformScale, usableW / bboxW);
  }

  const farTile = tiles.find((t) => t.row === 0);
  if (farTile && farTile.width * uniformScale < config.minFarTileWidthPx) {
    const boosted = config.minFarTileWidthPx / farTile.width;
    if (bboxH * boosted <= usableH && bboxW * boosted <= usableW) {
      uniformScale = boosted;
    }
  }

  const scaledTiles = tiles.map((t) => ({
    ...t,
    left: (t.left - minX) * uniformScale,
    top: (t.top - minY) * uniformScale,
    width: t.width * uniformScale,
    height: t.height * uniformScale,
    centerX: (t.centerX - minX) * uniformScale,
    centerY: (t.centerY - minY) * uniformScale,
    tileDepth: t.tileDepth * uniformScale,
  }));

  const scaledBboxW = bboxW * uniformScale;
  const scaledBboxH = bboxH * uniformScale;
  const stageWidth = scaledBboxW + config.horizontalPaddingPx * 2;
  const stageHeight = scaledBboxH + config.verticalPaddingPx * 2;
  const padX = config.horizontalPaddingPx;
  const padY = config.verticalPaddingPx;

  const finalTiles = scaledTiles.map((t) => ({
    ...t,
    left: t.left + padX,
    top: t.top + padY,
    centerX: t.centerX + padX,
    centerY: t.centerY + padY,
  }));

  return {
    stageWidth,
    stageHeight,
    boardCenterX: stageWidth / 2,
    tiles: finalTiles,
    baseTileWidth: baseTileWidth * uniformScale,
    uniformScale,
  };
}

export function layoutTileAt(
  layout: ProjectedBoardLayout,
  row: number,
  slotCol: number
): ProjectedTileRect | undefined {
  return layout.tiles.find((t) => t.row === row && t.slotCol === slotCol);
}
