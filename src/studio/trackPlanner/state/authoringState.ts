import type { PlannerTrack, Pos, RowMovementAuthored } from "../types";
import { emptyLayerBoard } from "../types";

export interface AuthoringPatch {
  label: string;
  apply: (track: PlannerTrack) => PlannerTrack;
}

export function cloneTrack(track: PlannerTrack): PlannerTrack {
  return JSON.parse(JSON.stringify(track)) as PlannerTrack;
}

export function toggleMissingHex(track: PlannerTrack, pos: Pos, remove: boolean): PlannerTrack {
  const next = cloneTrack(track);
  const layer = next.layers.find((l) => l.layer === pos.layer) ?? emptyLayerBoard(pos.layer);
  const idx = next.layers.findIndex((l) => l.layer === pos.layer);
  const missing = layer.missing.filter((m) => !(m.row === pos.row && m.col === pos.col));
  if (remove) missing.push({ ...pos });
  layer.missing = missing;
  if (idx >= 0) next.layers[idx] = layer;
  else next.layers.push(layer);
  return next;
}

export function setRowMovement(
  track: PlannerTrack,
  layer: number,
  row: number,
  inst: RowMovementAuthored,
): PlannerTrack {
  const next = cloneTrack(track);
  const lb = next.layers.find((l) => l.layer === layer) ?? emptyLayerBoard(layer);
  const normalized = normalizeRowMovement(inst);
  lb.rowMovement[String(row)] = normalized;
  const idx = next.layers.findIndex((l) => l.layer === layer);
  if (idx >= 0) next.layers[idx] = lb;
  else next.layers.push(lb);
  return next;
}

export function normalizeRowMovement(inst: RowMovementAuthored): RowMovementAuthored {
  if (inst.direction === "NONE") {
    return { direction: "NONE", amount: 0 };
  }
  const amount = inst.amount > 0 ? inst.amount : 1;
  return { direction: inst.direction, amount };
}

export class UndoStack {
  private past: PlannerTrack[] = [];
  private future: PlannerTrack[] = [];

  constructor(initial: PlannerTrack) {
    this.past.push(cloneTrack(initial));
  }

  get current(): PlannerTrack {
    return this.past[this.past.length - 1];
  }

  push(next: PlannerTrack): void {
    this.past.push(cloneTrack(next));
    this.future = [];
  }

  undo(): PlannerTrack | null {
    if (this.past.length <= 1) return null;
    const popped = this.past.pop()!;
    this.future.push(popped);
    return this.current;
  }

  redo(): PlannerTrack | null {
    if (this.future.length === 0) return null;
    const restored = this.future.pop()!;
    this.past.push(restored);
    return restored;
  }

  reset(track: PlannerTrack): void {
    this.past = [cloneTrack(track)];
    this.future = [];
  }
}
