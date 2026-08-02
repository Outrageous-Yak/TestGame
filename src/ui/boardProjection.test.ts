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
  tileSlotAt,
} from "./boardProjection";

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
    expect(rowUniformScale(0, 7, BOARD_PROJECT_CONFIG)).toBeCloseTo(0.78, 5);
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
