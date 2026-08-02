/**
 * Row-first board projection — establishes row geometry, then row-local tile placement.
 * Depth presentation values come from boardTabletop.ts.
 */

import { ROW_OVERLAP } from "./boardLattice";
import { buildBoardGeometry, type BoardGeometry } from "./boardGeometry";
import { buildBoardLattice, type BoardLattice } from "./boardLattice";
import {
  BOARD_DEBUG_GEOMETRY,
  BOARD_TABLETOP_CONFIG,
  depthCompressionAt,
  faceAtmosphereAt,
  rowProgress,
  rowScaleAt,
  rowZIndexAt,
  shadowAt,
  tileDepthPxAt,
  type BoardTabletopConfig,
} from "./boardTabletop";

export { BOARD_DEBUG_GEOMETRY } from "./boardTabletop";
export { BOARD_TABLETOP_CONFIG as BOARD_PROJECT_CONFIG } from "./boardTabletop";
export type { BoardTabletopConfig as BoardProjectConfig } from "./boardTabletop";

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
  rowProgress: number;
  verticalCompression: number;
  depthT: number;
  rowDarken: number;
  faceBrightness: number;
  faceContrast: number;
  tileDepthPx: number;
  shadowOpacity: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  rowCenterX: number;
  rowCenterY: number;
  tiles: TileSlotGeometry[];
};

export type BoardScreenLayout = {
  bodyWidth: number;
  bodyHeight: number;
  stageWidth: number;
  stageHeight: number;
  paddingX: number;
  paddingTop: number;
  paddingBottom: number;
  fitScale: number;
  boardCenterX: number;
  boardCenterY: number;
  rows: RowScreenGeometry[];
  lattice: BoardLattice;
  geometry: BoardGeometry;
};

export function rowDepthT(rowIndex: number, rowCount: number): number {
  return rowProgress(rowIndex, rowCount);
}

export function rowUniformScale(
  rowIndex: number,
  rowCount: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): number {
  return rowScaleAt(rowIndex, rowCount, config);
}

export function computeNominalTileWidth(
  viewportWidth: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): number {
  const usableW = Math.max(1, viewportWidth - config.horizontalPaddingPx * 2);
  return (usableW * config.nearRowWidthFraction) / (7 * config.nearScale);
}

export function verticalStepBetweenRows(
  prevRowIndex: number,
  nextRowIndex: number,
  prevTileH: number,
  nextTileH: number,
  rowCount: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): { step: number; compression: number } {
  const averageTileHeight = (prevTileH + nextTileH) / 2;
  const baseVerticalStep = averageTileHeight * ROW_OVERLAP;
  const midProgress = (rowProgress(prevRowIndex, rowCount) + rowProgress(nextRowIndex, rowCount)) / 2;
  const compression = depthCompressionAt(midProgress, config);
  return { step: baseVerticalStep * compression, compression };
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
    shadowOffsetX: row.shadowOffsetX * fitScale,
    shadowOffsetY: row.shadowOffsetY * fitScale,
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

export function projectBoardLayout(
  rowLens: readonly number[],
  viewportWidth: number,
  viewportHeight: number,
  config: BoardTabletopConfig = BOARD_TABLETOP_CONFIG
): BoardScreenLayout {
  const tileW = computeNominalTileWidth(viewportWidth, config);
  const lattice = buildBoardLattice(rowLens, tileW);
  const geometry = buildBoardGeometry(lattice);
  const rowCount = rowLens.length;

  const scales = rowLens.map((_, r) => rowScaleAt(r, rowCount, config));
  const tileHeights = scales.map((scale) => lattice.tileH * scale);

  const maxRowWidth = Math.max(
    ...rowLens.map((len, r) => {
      const localPitchX = lattice.pitchX * scales[r];
      const localTileW = lattice.tileW * scales[r];
      return (len - 1) * localPitchX + localTileW;
    })
  );
  const boardCenterX = maxRowWidth / 2;

  const rowCenterYs: number[] = [];
  const rowCompressions: number[] = [1];
  rowCenterYs[0] = tileHeights[0] / 2;

  for (let r = 1; r < rowCount; r++) {
    const { step, compression } = verticalStepBetweenRows(
      r - 1,
      r,
      tileHeights[r - 1],
      tileHeights[r],
      rowCount,
      config
    );
    rowCompressions[r] = compression;
    rowCenterYs[r] = rowCenterYs[r - 1] + step;
  }

  const bodyRows: RowScreenGeometry[] = [];
  let bodyMinX = Infinity;
  let bodyMinY = Infinity;
  let bodyMaxX = -Infinity;
  let bodyMaxY = -Infinity;

  for (let r = 0; r < rowCount; r++) {
    const len = rowLens[r] ?? 7;
    const scale = scales[r];
    const progress = rowProgress(r, rowCount);
    const localPitchX = lattice.pitchX * scale;
    const localTileW = lattice.tileW * scale;
    const localTileH = lattice.tileH * scale;
    const rowWidth = (len - 1) * localPitchX + localTileW;
    const rowHeight = localTileH;
    const rowLeft = boardCenterX - rowWidth / 2;
    const rowTop = rowCenterYs[r] - localTileH / 2;
    const tileDepthPx = tileDepthPxAt(r, rowCount, config);
    const atmosphere = faceAtmosphereAt(r, rowCount, config);
    const shadow = shadowAt(r, rowCount, config);
    const rowSlots = geometry.rows[r]?.slots ?? [];

    const tiles = buildRowTileSlots(
      rowSlots,
      rowWidth,
      rowHeight,
      localPitchX,
      localTileW,
      localTileH
    );

    const rowExtentBottom = rowTop + rowHeight + tileDepthPx + shadow.offsetY;
    bodyMinX = Math.min(bodyMinX, rowLeft);
    bodyMinY = Math.min(bodyMinY, rowTop);
    bodyMaxX = Math.max(bodyMaxX, rowLeft + rowWidth);
    bodyMaxY = Math.max(bodyMaxY, rowExtentBottom);

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
      zIndex: rowZIndexAt(r, config),
      rowProgress: progress,
      verticalCompression: rowCompressions[r],
      depthT: progress,
      rowDarken: atmosphere.rowDarken,
      faceBrightness: atmosphere.brightness,
      faceContrast: atmosphere.contrast,
      tileDepthPx,
      shadowOpacity: shadow.opacity,
      shadowOffsetX: shadow.offsetX,
      shadowOffsetY: shadow.offsetY,
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

  const paddingX = config.horizontalPaddingPx;
  const paddingTop = config.boardTopPaddingPx;
  const paddingBottom = config.boardBottomPaddingPx;

  const usableW = Math.max(1, viewportWidth - paddingX * 2);
  const usableH = Math.max(1, viewportHeight - paddingTop - paddingBottom);

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

  const finalRows = scaledRows.map((row) => ({
    ...row,
    left: row.left + paddingX,
    top: row.top + paddingTop,
  }));

  const result: BoardScreenLayout = {
    bodyWidth: scaledBodyW,
    bodyHeight: scaledBodyH,
    stageWidth: scaledBodyW + paddingX * 2,
    stageHeight: scaledBodyH + paddingTop + paddingBottom,
    paddingX,
    paddingTop,
    paddingBottom,
    fitScale,
    boardCenterX: boardCenterXBody * fitScale + paddingX,
    boardCenterY: boardCenterYBody * fitScale + paddingTop,
    rows: finalRows,
    lattice,
    geometry,
  };

  assertRowLayoutInvariants(result);

  return result;
}

export function tileSlotAt(
  layout: BoardScreenLayout,
  row: number,
  slotCol: number
): TileSlotGeometry | undefined {
  const rowGeom = layout.rows.find((r) => r.rowIndex === row);
  return rowGeom?.tiles.find((t) => t.slotCol === slotCol);
}

export function assertRowLayoutInvariants(layout: BoardScreenLayout): void {
  let prevRowCenterY = -Infinity;

  for (const row of layout.rows) {
    const rowScreenCenterX = row.left + row.width / 2;
    if (Math.abs(rowScreenCenterX - layout.boardCenterX) > 0.5) {
      throw new Error(`Row ${row.rowIndex} center X drifted off board axis`);
    }

    const centerYs = row.tiles.map((t) => t.centerY);
    const roundedYs = new Set(centerYs.map((y) => Math.round(y * 1000) / 1000));
    if (roundedYs.size !== 1) {
      throw new Error(
        `Row ${row.rowIndex} has ${roundedYs.size} tile center Y values: ${[...roundedYs].join(", ")}`
      );
    }

    for (const tile of row.tiles) {
      const expectedTop = row.tiles[0].centerY - tile.height / 2;
      if (Math.abs(tile.top - expectedTop) > 0.01) {
        throw new Error(
          `Row ${row.rowIndex} slot ${tile.slotCol} top ${tile.top} != expected row-local ${expectedTop}`
        );
      }
    }

    const rowCenterY = row.top + row.rowCenterY;
    if (rowCenterY <= prevRowCenterY) {
      throw new Error(`Row ${row.rowIndex} center Y is not below previous row`);
    }
    prevRowCenterY = rowCenterY;
  }

  const row0 = layout.rows[0];
  const row1 = layout.rows[1];
  if (row0 && row1) {
    const sevenX = row0.left + row0.tiles[0].centerX;
    const sixX = row1.left + row1.tiles[0].centerX;
    const expected = Math.abs(-3 * row0.localPitchX + 2.5 * row1.localPitchX);
    if (Math.abs(Math.abs(sevenX - sixX) - expected) > 0.5) {
      throw new Error("7/6 half-step stagger invariant failed");
    }
  }
}

export function renderedBoardBoundsFromLayout(layout: BoardScreenLayout): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const row of layout.rows) {
    const rowLeft = row.left - layout.paddingX;
    const rowTop = row.top - layout.paddingTop;
    minX = Math.min(minX, rowLeft);
    minY = Math.min(minY, rowTop);
    maxX = Math.max(maxX, rowLeft + row.width);
    maxY = Math.max(maxY, rowTop + row.height + row.tileDepthPx + row.shadowOffsetY);

    for (const tile of row.tiles) {
      const left = rowLeft + tile.left;
      const top = rowTop + tile.top;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + tile.width);
      maxY = Math.max(maxY, top + tile.height);
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function rowVerticalSteps(layout: BoardScreenLayout): number[] {
  const steps: number[] = [];
  for (let i = 1; i < layout.rows.length; i++) {
    const prev = layout.rows[i - 1];
    const cur = layout.rows[i];
    steps.push(cur.top + cur.rowCenterY - (prev.top + prev.rowCenterY));
  }
  return steps;
}
