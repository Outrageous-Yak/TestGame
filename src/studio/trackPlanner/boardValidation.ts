import { ROW_LENS } from "../../engine/board";
import type { PlannerTrack, Pos } from "./types";
import { validateStructuralCoords } from "./serialization/scenarioBridge";

export type BoardValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function inBounds(p: Pos): boolean {
  if (p.layer < 1 || p.layer > 7) return false;
  if (p.row < 0 || p.row >= ROW_LENS.length) return false;
  return p.col >= 0 && p.col < ROW_LENS[p.row];
}

export function validateBoard(track: PlannerTrack): BoardValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (track.layers.length !== 7) {
    errors.push(`Expected 7 layer boards, found ${track.layers.length}`);
  }

  const layerNums = new Set(track.layers.map((l) => l.layer));
  for (let layer = 1; layer <= 7; layer++) {
    if (!layerNums.has(layer)) errors.push(`Missing layer ${layer} board`);
  }

  for (const lb of track.layers) {
    const seen = new Set<string>();
    for (const m of lb.missing) {
      const k = `${m.row},${m.col}`;
      if (seen.has(k)) errors.push(`Layer ${lb.layer}: duplicate missing at row ${m.row} col ${m.col}`);
      seen.add(k);
      if (!inBounds({ layer: lb.layer, row: m.row, col: m.col })) {
        errors.push(`Layer ${lb.layer}: missing hex out of bounds R${m.row} C${m.col}`);
      }
    }

    for (let row = 0; row < 7; row++) {
      const inst = lb.rowMovement[String(row)] ?? { direction: "NONE", amount: 0 };
      if (inst.direction === "NONE" && inst.amount !== 0) {
        errors.push(`Layer ${lb.layer} row ${row}: NONE requires amount 0`);
      }
      if (inst.direction !== "NONE" && inst.amount <= 0) {
        errors.push(`Layer ${lb.layer} row ${row}: ${inst.direction} requires amount > 0`);
      }
      if (inst.amount < 0) errors.push(`Layer ${lb.layer} row ${row}: negative amount`);
    }
  }

  for (const msg of validateStructuralCoords(track)) {
    if (msg.includes("missing hex")) warnings.push(msg);
    else errors.push(msg);
  }

  return { ok: errors.length === 0, errors, warnings };
}
