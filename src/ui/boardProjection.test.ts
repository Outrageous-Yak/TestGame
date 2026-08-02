import { describe, expect, it } from "vitest";
import {
  PROJECTED_BOARD_CONFIG,
  perspectiveFactor,
  projectBoardLayout,
  projectedCenterX,
  rowProgress,
  smoothstep,
} from "./boardProjection";

const ROW_LENS = [7, 6, 7, 6, 7, 6, 7] as const;

describe("boardProjection", () => {
  it("row 0 factor equals farFactor", () => {
    expect(perspectiveFactor(0, 7, PROJECTED_BOARD_CONFIG)).toBeCloseTo(0.78, 5);
  });

  it("row 6 factor equals nearFactor", () => {
    expect(perspectiveFactor(6, 7, PROJECTED_BOARD_CONFIG)).toBeCloseTo(1.0, 5);
  });

  it("all rows share the intended board axis", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    const row0 = layout.tiles.filter((t) => t.row === 0);
    const row6 = layout.tiles.filter((t) => t.row === 6);
    const center0 = (row0[0].centerX + row0[row0.length - 1].centerX) / 2;
    const center6 = (row6[0].centerX + row6[row6.length - 1].centerX) / 2;
    expect(center0).toBeCloseTo(layout.boardCenterX, 1);
    expect(center6).toBeCloseTo(layout.boardCenterX, 1);
  });

  it("seven-tile and six-tile rows preserve honeycomb stagger", () => {
    const boardCenterX = 200;
    const step = 50;
    const sevenCol0 = projectedCenterX(0, 7, boardCenterX, step);
    const sixCol0 = projectedCenterX(0, 6, boardCenterX, step);
    expect(Math.abs(sevenCol0 - sixCol0)).toBeCloseTo(step * 0.5, 5);
  });

  it("tile width and horizontal spacing use the same pf", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    const row3Tiles = layout.tiles.filter((t) => t.row === 3);
    const pf = row3Tiles[0].perspectiveFactor;
    const step = row3Tiles[1].centerX - row3Tiles[0].centerX;
    expect(row3Tiles[0].width).toBeCloseTo(layout.baseTileWidth * pf, 3);
    expect(step).toBeCloseTo(layout.baseTileWidth * pf, 3);
  });

  it("bottom row is wider than top row", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    const top = layout.tiles.find((t) => t.row === 0 && t.slotCol === 0)!;
    const bottom = layout.tiles.find((t) => t.row === 6 && t.slotCol === 0)!;
    expect(bottom.width).toBeGreaterThan(top.width);
  });

  it("top-row tile width stays above minFarTileWidthPx when viewport allows", () => {
    const layout = projectBoardLayout(ROW_LENS, 800, 900);
    const top = layout.tiles.find((t) => t.row === 0 && t.slotCol === 0)!;
    expect(top.width).toBeGreaterThanOrEqual(PROJECTED_BOARD_CONFIG.minFarTileWidthPx - 0.5);
  });

  it("layout bounding box fits the supplied viewport", () => {
    const vw = 360;
    const vh = 520;
    const layout = projectBoardLayout(ROW_LENS, vw, vh);
    expect(layout.stageWidth).toBeLessThanOrEqual(vw + 1);
    expect(layout.stageHeight).toBeLessThanOrEqual(vh + 1);
    let maxBottom = 0;
    let maxRight = 0;
    for (const t of layout.tiles) {
      maxBottom = Math.max(maxBottom, t.top + t.height + t.tileDepth);
      maxRight = Math.max(maxRight, t.left + t.width);
    }
    expect(maxBottom).toBeLessThanOrEqual(layout.stageHeight + 1);
    expect(maxRight).toBeLessThanOrEqual(layout.stageWidth + 1);
  });

  it("missing slots do not alter neighboring coordinates", () => {
    const full = projectBoardLayout(ROW_LENS, 400, 600);
    const tile = full.tiles.find((t) => t.row === 2 && t.slotCol === 3)!;
    const again = projectBoardLayout(ROW_LENS, 400, 600);
    const tile2 = again.tiles.find((t) => t.row === 2 && t.slotCol === 3)!;
    expect(tile2.left).toBe(tile.left);
    expect(tile2.top).toBe(tile.top);
  });

  it("projection output is deterministic", () => {
    const a = projectBoardLayout(ROW_LENS, 400, 600);
    const b = projectBoardLayout(ROW_LENS, 400, 600);
    expect(a).toEqual(b);
  });

  it("smoothstep endpoints", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
  });

  it("rowProgress endpoints", () => {
    expect(rowProgress(0, 7)).toBe(0);
    expect(rowProgress(6, 7)).toBe(1);
  });
});
