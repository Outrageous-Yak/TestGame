import { describe, expect, it } from "vitest";
import { buildBoardGeometry } from "./boardGeometry";
import { buildBoardLattice, colOffsetForSlot } from "./boardLattice";
import {
  BOARD_PROJECT_CONFIG,
  assertRowLayoutInvariants,
  projectBoardLayout,
  renderedBoardBoundsFromLayout,
  rowDepthT,
  rowUniformScale,
  rowVerticalSteps,
  tileSlotAt,
  verticalStepBetweenRows,
} from "./boardProjection";
import { BOARD_TABLETOP_CONFIG } from "./boardTabletop";

const ROW_LENS = [7, 6, 7, 6, 7, 6, 7] as const;

describe("boardLattice", () => {
  it("uses constant logical pitch for all rows", () => {
    const lattice = buildBoardLattice(ROW_LENS, 50);
    expect(lattice.pitchX).toBe(50);
    expect(lattice.pitchY).toBeCloseTo(50 * 0.875 * 0.8, 5);

    const row0 = lattice.slots.filter((s) => s.row === 0);
    const step = row0[1].x - row0[0].x;
    expect(step).toBeCloseTo(lattice.pitchX, 5);

    const row1 = lattice.slots.filter((s) => s.row === 1);
    const step6 = row1[1].x - row1[0].x;
    expect(step6).toBeCloseTo(lattice.pitchX, 5);
  });

  it("preserves 7/6 honeycomb stagger in board space", () => {
    const lattice = buildBoardLattice(ROW_LENS, 50);
    const sevenCol0 = lattice.slots.find((s) => s.row === 0 && s.slotCol === 0)!;
    const sixCol0 = lattice.slots.find((s) => s.row === 1 && s.slotCol === 0)!;
    expect(Math.abs(sevenCol0.x - sixCol0.x)).toBeCloseTo(lattice.pitchX * 0.5, 5);
  });

  it("keeps board centre at origin", () => {
    const lattice = buildBoardLattice(ROW_LENS, 50);
    const midRow = lattice.slots.filter((s) => s.row === 3);
    const avgY = midRow.reduce((sum, s) => sum + s.y, 0) / midRow.length;
    expect(avgY).toBeCloseTo(0, 5);
  });
});

describe("boardGeometry", () => {
  it("creates seven structural row groups", () => {
    const lattice = buildBoardLattice(ROW_LENS, 50);
    const geometry = buildBoardGeometry(lattice);
    expect(geometry.rows).toHaveLength(7);
    expect(geometry.rows.map((r) => r.rowLength)).toEqual([7, 6, 7, 6, 7, 6, 7]);
    expect(geometry.boardCenter).toEqual({ x: 0, y: 0 });
  });
});

describe("boardProjection (row-first)", () => {
  it("all rows share the board centre axis", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    for (const row of layout.rows) {
      const rowScreenCenterX = row.left + row.width / 2;
      expect(rowScreenCenterX).toBeCloseTo(layout.boardCenterX, 1);
    }
  });

  it("board centre invariant holds in stage coordinates", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    expect(layout.boardCenterX).toBeGreaterThan(0);
    expect(layout.boardCenterY).toBeGreaterThan(0);
    expect(layout.boardCenterX).toBeLessThan(layout.stageWidth);
    expect(layout.boardCenterY).toBeLessThan(layout.stageHeight);
  });

  it("row centre lines align to board axis", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    for (const row of layout.rows) {
      const tileCenterX = row.left + row.tiles[0].centerX;
      const last = row.tiles[row.tiles.length - 1];
      const rowMidX = (tileCenterX + row.left + last.centerX) / 2;
      expect(rowMidX).toBeCloseTo(layout.boardCenterX, 1);
    }
  });

  it("row-local placement uses constant pitch within each row", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    const row3 = layout.rows.find((r) => r.rowIndex === 3)!;
    const step = row3.tiles[1].centerX - row3.tiles[0].centerX;
    expect(step).toBeCloseTo(row3.localPitchX, 3);
    expect(row3.tiles[0].width).toBeCloseTo(row3.localTileW, 3);
  });

  it("seven-tile and six-tile rows preserve stagger after projection", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    const row0 = layout.rows.find((r) => r.rowIndex === 0)!;
    const row1 = layout.rows.find((r) => r.rowIndex === 1)!;
    const sevenX = row0.left + row0.tiles[0].centerX;
    const sixX = row1.left + row1.tiles[0].centerX;
    const expected = Math.abs(-3 * row0.localPitchX + 2.5 * row1.localPitchX);
    expect(Math.abs(sevenX - sixX)).toBeCloseTo(expected, 1);
  });

  it("near row is larger than far row", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    const far = layout.rows[0];
    const near = layout.rows[6];
    expect(near.localTileW).toBeGreaterThan(far.localTileW);
    expect(near.uniformScale).toBeGreaterThan(far.uniformScale);
  });

  it("row uniform scale endpoints", () => {
    expect(rowUniformScale(0, 7, BOARD_PROJECT_CONFIG)).toBeCloseTo(0.82, 5);
    expect(rowUniformScale(6, 7, BOARD_PROJECT_CONFIG)).toBeCloseTo(1.0, 5);
    expect(rowDepthT(0, 7)).toBe(0);
    expect(rowDepthT(6, 7)).toBe(1);
  });

  it("viewport fit keeps board inside stage", () => {
    const vw = 360;
    const vh = 520;
    const layout = projectBoardLayout(ROW_LENS, vw, vh);
    expect(layout.stageWidth).toBeLessThanOrEqual(vw + 1);
    expect(layout.stageHeight).toBeLessThanOrEqual(vh + 1);

    let maxRight = 0;
    let maxBottom = 0;
    for (const row of layout.rows) {
      maxRight = Math.max(maxRight, row.left + row.width);
      maxBottom = Math.max(maxBottom, row.top + row.height + row.tileDepthPx);
      for (const t of row.tiles) {
        maxRight = Math.max(maxRight, row.left + t.left + t.width);
        maxBottom = Math.max(maxBottom, row.top + t.top + t.height);
      }
    }
    expect(maxRight).toBeLessThanOrEqual(layout.stageWidth + 1);
    expect(maxBottom).toBeLessThanOrEqual(layout.stageHeight + 1);
  });

  it("bounding box matches body dimensions", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const row of layout.rows) {
      minX = Math.min(minX, row.left);
      minY = Math.min(minY, row.top);
      maxX = Math.max(maxX, row.left + row.width);
      maxY = Math.max(maxY, row.top + row.height);
    }

    expect(maxX - minX).toBeCloseTo(layout.bodyWidth, 1);
    expect(maxY - minY).toBeLessThanOrEqual(layout.bodyHeight + 1);
  });

  it("tileSlotAt returns row-local slot geometry", () => {
    const layout = projectBoardLayout(ROW_LENS, 400, 600);
    const slot = tileSlotAt(layout, 2, 3);
    expect(slot).toBeDefined();
    expect(slot!.width).toBeCloseTo(layout.rows[2].localTileW, 3);
  });

  it("projection output is deterministic", () => {
    const a = projectBoardLayout(ROW_LENS, 400, 600);
    const b = projectBoardLayout(ROW_LENS, 400, 600);
    expect(a).toEqual(b);
  });

  it("colOffset formula matches lattice stagger", () => {
    expect(colOffsetForSlot(0, 7)).toBe(-3);
    expect(colOffsetForSlot(0, 6)).toBe(-2.5);
    expect(colOffsetForSlot(3, 7)).toBe(0);
  });

  it("every row has exactly one unique tile center Y", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    for (const row of layout.rows) {
      const centerYs = row.tiles.map((t) => t.centerY);
      const unique = new Set(centerYs.map((y) => Math.round(y * 1000)));
      expect(unique.size).toBe(1);
    }
    expect(() => assertRowLayoutInvariants(layout)).not.toThrow();
  });

  it("row center Y increases monotonically from row 0 to row 6", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    let prev = -Infinity;
    for (const row of layout.rows) {
      const rowCenterY = row.top + row.rowCenterY;
      expect(rowCenterY).toBeGreaterThan(prev);
      prev = rowCenterY;
    }
  });

  it("rendered slot union matches calculated body bounds within 2px", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    const bounds = renderedBoardBoundsFromLayout(layout);
    expect(Math.abs(bounds.width - layout.bodyWidth)).toBeLessThanOrEqual(2);
    expect(Math.abs(bounds.height - layout.bodyHeight)).toBeLessThanOrEqual(2);
  });
});

describe("boardProjection (Phase 4A depth)", () => {
  it("row scale is monotonic from far to near", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    for (let i = 1; i < layout.rows.length; i++) {
      expect(layout.rows[i].uniformScale).toBeGreaterThanOrEqual(layout.rows[i - 1].uniformScale);
    }
  });

  it("row 0 scale equals farScale and row 6 equals nearScale", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    expect(layout.rows[0].uniformScale).toBeCloseTo(BOARD_TABLETOP_CONFIG.farScale, 5);
    expect(layout.rows[6].uniformScale).toBeCloseTo(BOARD_TABLETOP_CONFIG.nearScale, 5);
  });

  it("tile width and row-local pitch use the same row scale", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    for (const row of layout.rows) {
      const ratio = row.localTileW / row.localPitchX;
      expect(ratio).toBeCloseTo(layout.lattice.tileW / layout.lattice.pitchX, 5);
      expect(row.localTileW).toBeCloseTo(layout.lattice.tileW * row.uniformScale, 3);
      expect(row.localPitchX).toBeCloseTo(layout.lattice.pitchX * row.uniformScale, 3);
    }
  });

  it("six-tile rows retain half-step stagger", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    const row0 = layout.rows[0];
    const row1 = layout.rows[1];
    const sevenX = row0.left + row0.tiles[0].centerX;
    const sixX = row1.left + row1.tiles[0].centerX;
    const expected = Math.abs(-3 * row0.localPitchX + 2.5 * row1.localPitchX);
    expect(Math.abs(sevenX - sixX)).toBeCloseTo(expected, 1);
  });

  it("far-row vertical step is smaller than near-row vertical step", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    const steps = rowVerticalSteps(layout);
    expect(steps[0]).toBeLessThan(steps[steps.length - 1]);
  });

  it("adjacent row spacing stays within safe honeycomb overlap limits", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    const steps = rowVerticalSteps(layout);
    for (let i = 0; i < layout.rows.length - 1; i++) {
      const prev = layout.rows[i];
      const next = layout.rows[i + 1];
      const avgH = (prev.localTileH + next.localTileH) / 2;
      const maxStep = avgH * 0.95;
      const minStep = avgH * 0.55;
      expect(steps[i]).toBeLessThanOrEqual(maxStep);
      expect(steps[i]).toBeGreaterThanOrEqual(minStep);
    }
  });

  it("near tile depth is greater than far tile depth", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    expect(layout.rows[6].tileDepthPx).toBeGreaterThan(layout.rows[0].tileDepthPx);
    expect(layout.rows[0].tileDepthPx).toBeCloseTo(BOARD_TABLETOP_CONFIG.farTileDepthPx, 1);
    expect(layout.rows[6].tileDepthPx).toBeCloseTo(BOARD_TABLETOP_CONFIG.nearTileDepthPx, 1);
  });

  it("board union fits inside the available viewport", () => {
    const vw = 390;
    const vh = 700;
    const layout = projectBoardLayout(ROW_LENS, vw, vh);
    expect(layout.stageWidth).toBeLessThanOrEqual(vw + 1);
    expect(layout.stageHeight).toBeLessThanOrEqual(vh + 1);
  });

  it("whole-board fit uses one scalar", () => {
    const layout = projectBoardLayout(ROW_LENS, 200, 200);
    expect(layout.fitScale).toBeGreaterThan(0);
    expect(layout.fitScale).toBeLessThanOrEqual(1);
    const unscaled = projectBoardLayout(ROW_LENS, 2000, 2000);
    expect(unscaled.fitScale).toBe(1);
  });

  it("no tile extends outside calculated board bounds", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    const bounds = renderedBoardBoundsFromLayout(layout);
    const bodyLeft = layout.paddingX;
    const bodyTop = layout.paddingTop;

    for (const row of layout.rows) {
      const rowLeft = row.left - bodyLeft;
      const rowTop = row.top - bodyTop;
      for (const tile of row.tiles) {
        const left = rowLeft + tile.left;
        const top = rowTop + tile.top;
        expect(left).toBeGreaterThanOrEqual(bounds.minX - 0.5);
        expect(top).toBeGreaterThanOrEqual(bounds.minY - 0.5);
        expect(left + tile.width).toBeLessThanOrEqual(bounds.maxX + 0.5);
        expect(top + tile.height).toBeLessThanOrEqual(bounds.maxY + 0.5);
      }
    }
  });

  it("vertical compression increases toward the near row", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    const { step: farStep } = verticalStepBetweenRows(
      0,
      1,
      layout.rows[0].localTileH,
      layout.rows[1].localTileH,
      7
    );
    const { step: nearStep } = verticalStepBetweenRows(
      5,
      6,
      layout.rows[5].localTileH,
      layout.rows[6].localTileH,
      7
    );
    expect(farStep).toBeLessThan(nearStep);
  });

  it("row z-index increases toward the near row", () => {
    const layout = projectBoardLayout(ROW_LENS, 390, 700);
    for (let i = 1; i < layout.rows.length; i++) {
      expect(layout.rows[i].zIndex).toBeGreaterThan(layout.rows[i - 1].zIndex);
    }
  });

  it("near row uses most of panel width", () => {
    const vw = 390;
    const layout = projectBoardLayout(ROW_LENS, vw, 700);
    const nearRow = layout.rows[6];
    const usableW = vw - BOARD_TABLETOP_CONFIG.horizontalPaddingPx * 2;
    const widthFraction = nearRow.width / usableW;
    expect(widthFraction).toBeGreaterThanOrEqual(0.9);
    expect(widthFraction).toBeLessThanOrEqual(0.98);
  });

  it("depth output remains deterministic", () => {
    const a = projectBoardLayout(ROW_LENS, 390, 700);
    const b = projectBoardLayout(ROW_LENS, 390, 700);
    expect(a.rows.map((r) => r.tileDepthPx)).toEqual(b.rows.map((r) => r.tileDepthPx));
    expect(a.rows.map((r) => r.uniformScale)).toEqual(b.rows.map((r) => r.uniformScale));
  });
});
