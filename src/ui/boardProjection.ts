/**
 * Row-first board projection — establishes row geometry, then row-local tile placement.
 * No CSS 3D, no camera simulation, no per-tile global layout.
 */

import { buildBoardGeometry, type BoardGeometry } from "./boardGeometry";
import { buildBoardLattice, type BoardLattice } from "./boardLattice";

/** Development-only geometry overlay (pointer-events: none). */
export const BOARD_DEBUG_GEOMETRY = false;

export const BOARD_PROJECT_CONFIG = {
  farScale: 0.78,
  nearScale: 1.0,
  horizontalPaddingPx: 10,
  verticalPaddingPx: 10,
  baseTileDepthPx: 6,
  nearRowWidthFraction: 0.94,
  minFarTileWidthPx: 46,
} as const;

export type BoardProjectConfig = typeof BOARD_PROJECT_CONFIG;

export type TileSlotGeometry = {
  slotCol: number;
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type RowScreenGeometry = {
  rowIndex: number;
  left: number;
  top: number;
  width: number;
  height: number;
  uniformScale: number;
  localPitchX: number;
  localTileW: number;
  localTileH: number;
  zIndex: number;
  depthT: number;
  rowDarken: number;
  tileDepthPx: number;
  /** Horizontal centre of the row container (row-local coords). */
  rowCenterX: number;
  /** Vertical centre of the row container (row-local coords). */
  rowCenterY: number;
  tiles: TileSlotGeometry[];
};

export type BoardScreenLayout = {
  bodyWidth: number;
  bodyHeight: number;
  stageWidth: number;
  stageHeight: number;
  paddingX: number;
  paddingY: number;
  fitScale: number;
  boardCenterX: number;
  boardCenterY: number;
  rows: RowScreenGeometry[];
  lattice: BoardLattice;
  geometry: BoardGeometry;
};

export function rowDepthT(rowIndex: number, rowCount: number): number {
  if (rowCount <= 1) return 0;
  return rowIndex / (rowCount - 1);
}

export function rowUniformScale(
  rowIndex: number,
  rowCount: number,
  config: BoardProjectConfig = BOARD_PROJECT_CONFIG
): number {
  const t = rowDepthT(rowIndex, rowCount);
  return config.farScale + (config.nearScale - config.farScale) * t;
}

export function rowDarkenForDepth(depthT: number): number {
  const farBrightness = 0.92;
  const farContrast = 0.95;
  const farOpacity = 0.97;
  const brightness = farBrightness + (1 - farBrightness) * depthT;
  const contrast = farContrast + (1 - farContrast) * depthT;
  const opacity = farOpacity + (1 - farOpacity) * depthT;
  return (1 - brightness) * 0.38 + (1 - contrast) * 0.12 + (1 - opacity) * 0.22;
}

export function computeNominalTileWidth(
  viewportWidth: number,
  config: BoardProjectConfig = BOARD_PROJECT_CONFIG
): number {
  const usableW = Math.max(1, viewportWidth - config.horizontalPaddingPx * 2);
  return (usableW * config.nearRowWidthFraction) / (7 * config.nearScale);
}

function buildRowTileSlots(
  rowSlots: BoardGeometry["rows"][number]["slots"],
  rowWidth: number,
  rowHeight: number,
  localPitchX: number,
  localTileW: number,
  localTileH: number
): TileSlotGeometry[] {
  const rowCenterX = rowWidth / 2;
  const rowCenterY = rowHeight / 2;

  return rowSlots.map((slot) => {
    const centerX = rowCenterX + slot.colOffset * localPitchX;
    const centerY = rowCenterY;
    return {
      slotCol: slot.slotCol,
      left: centerX - localTileW / 2,
      top: centerY - localTileH / 2,
      width: localTileW,
      height: localTileH,
      centerX,
      centerY,
    };
  });
}

function scaleRowGeometry(row: RowScreenGeometry, fitScale: number): RowScreenGeometry {
  return {
    ...row,
    left: row.left * fitScale,
    top: row.top * fitScale,
    width: row.width * fitScale,
    height: row.height * fitScale,
    localPitchX: row.localPitchX * fitScale,
    localTileW: row.localTileW * fitScale,
    localTileH: row.localTileH * fitScale,
    tileDepthPx: row.tileDepthPx * fitScale,
    rowCenterX: row.rowCenterX * fitScale,
    rowCenterY: row.rowCenterY * fitScale,
    tiles: row.tiles.map((t) => ({
      ...t,
      left: t.left * fitScale,
      top: t.top * fitScale,
      width: t.width * fitScale,
      height: t.height * fitScale,
      centerX: t.centerX * fitScale,
      centerY: t.centerY * fitScale,
    })),
  };
}

/**
 * Project the board into row screen geometry, then fit the completed board to the viewport.
 */
export function projectBoardLayout(
  rowLens: readonly number[],
  viewportWidth: number,
  viewportHeight: number,
  config: BoardProjectConfig = BOARD_PROJECT_CONFIG
): BoardScreenLayout {
  const tileW = computeNominalTileWidth(viewportWidth, config);
  const lattice = buildBoardLattice(rowLens, tileW);
  const geometry = buildBoardGeometry(lattice);
  const rowCount = rowLens.length;

  const scales = rowLens.map((_, r) => rowUniformScale(r, rowCount, config));

  const maxRowWidth = Math.max(
    ...rowLens.map((len, r) => {
      const scale = scales[r];
      const localPitchX = lattice.pitchX * scale;
      const localTileW = lattice.tileW * scale;
      return (len - 1) * localPitchX + localTileW;
    })
  );
  const boardCenterX = maxRowWidth / 2;

  const rowCenterYs: number[] = [];
  rowCenterYs[0] = (lattice.tileH * scales[0]) / 2;

  for (let r = 1; r < rowCount; r++) {
    const midScale = (scales[r - 1] + scales[r]) / 2;
    rowCenterYs[r] = rowCenterYs[r - 1] + lattice.pitchY * midScale;
  }

  const bodyRows: RowScreenGeometry[] = [];
  let bodyMinX = Infinity;
  let bodyMinY = Infinity;
  let bodyMaxX = -Infinity;
  let bodyMaxY = -Infinity;

  for (let r = 0; r < rowCount; r++) {
    const len = rowLens[r] ?? 7;
    const scale = scales[r];
    const depthT = rowDepthT(r, rowCount);
    const localPitchX = lattice.pitchX * scale;
    const localTileW = lattice.tileW * scale;
    const localTileH = lattice.tileH * scale;
    const rowWidth = (len - 1) * localPitchX + localTileW;
    const rowHeight = localTileH;
    const rowLeft = boardCenterX - rowWidth / 2;
    const rowTop = rowCenterYs[r] - localTileH / 2;
    const tileDepthPx = config.baseTileDepthPx * scale;
    const rowSlots = geometry.rows[r]?.slots ?? [];

    const tiles = buildRowTileSlots(
      rowSlots,
      rowWidth,
      rowHeight,
      localPitchX,
      localTileW,
      localTileH
    );

    bodyMinX = Math.min(bodyMinX, rowLeft);
    bodyMinY = Math.min(bodyMinY, rowTop);
    bodyMaxX = Math.max(bodyMaxX, rowLeft + rowWidth);
    bodyMaxY = Math.max(bodyMaxY, rowTop + rowHeight + tileDepthPx);

    bodyRows.push({
      rowIndex: r,
      left: rowLeft,
      top: rowTop,
      width: rowWidth,
      height: rowHeight,
      uniformScale: scale,
      localPitchX,
      localTileW,
      localTileH,
      zIndex: 10 + r,
      depthT,
      rowDarken: rowDarkenForDepth(depthT),
      tileDepthPx,
      rowCenterX: rowWidth / 2,
      rowCenterY: rowHeight / 2,
      tiles,
    });
  }

  if (!Number.isFinite(bodyMinX)) {
    bodyMinX = 0;
    bodyMinY = 0;
    bodyMaxX = viewportWidth;
    bodyMaxY = viewportHeight;
  }

  const normalizedRows = bodyRows.map((row) => ({
    ...row,
    left: row.left - bodyMinX,
    top: row.top - bodyMinY,
  }));

  const bodyWidth = bodyMaxX - bodyMinX;
  const bodyHeight = bodyMaxY - bodyMinY;
  const boardCenterXBody = boardCenterX - bodyMinX;
  const boardCenterYBody = (bodyMinY + bodyMaxY) / 2 - bodyMinY;

  const usableW = Math.max(1, viewportWidth - config.horizontalPaddingPx * 2);
  const usableH = Math.max(1, viewportHeight - config.verticalPaddingPx * 2);

  let fitScale = 1;
  if (bodyWidth > usableW) {
    fitScale = usableW / bodyWidth;
  }
  if (bodyHeight * fitScale > usableH) {
    fitScale = Math.min(fitScale, usableH / bodyHeight);
  }

  const farRow = normalizedRows[0];
  if (farRow && farRow.localTileW * fitScale < config.minFarTileWidthPx) {
    const boosted = config.minFarTileWidthPx / farRow.localTileW;
    if (bodyWidth * boosted <= usableW && bodyHeight * boosted <= usableH) {
      fitScale = boosted;
    }
  }

  const scaledRows = normalizedRows.map((row) => scaleRowGeometry(row, fitScale));
  const scaledBodyW = bodyWidth * fitScale;
  const scaledBodyH = bodyHeight * fitScale;

  const paddingX = config.horizontalPaddingPx;
  const paddingY = config.verticalPaddingPx;

  const finalRows = scaledRows.map((row) => ({
    ...row,
    left: row.left + paddingX,
    top: row.top + paddingY,
  }));

  return {
    bodyWidth: scaledBodyW,
    bodyHeight: scaledBodyH,
    stageWidth: scaledBodyW + paddingX * 2,
    stageHeight: scaledBodyH + paddingY * 2,
    paddingX,
    paddingY,
    fitScale,
    boardCenterX: boardCenterXBody * fitScale + paddingX,
    boardCenterY: boardCenterYBody * fitScale + paddingY,
    rows: finalRows,
    lattice,
    geometry,
  };
}

export function tileSlotAt(
  layout: BoardScreenLayout,
  row: number,
  slotCol: number
): TileSlotGeometry | undefined {
  const rowGeom = layout.rows.find((r) => r.rowIndex === row);
  return rowGeom?.tiles.find((t) => t.slotCol === slotCol);
}
