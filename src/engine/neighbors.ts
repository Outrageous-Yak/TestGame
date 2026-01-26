import { ROW_LENS } from "./board"; // wherever it is

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function idAtSlot(layer: number, row: number, slotCol: number, shift: number) {
  const len = ROW_LENS[row] ?? 7;
  const origCol = mod(slotCol - shift, len);
  return "L" + layer + "-R" + row + "-C" + origCol;
}

function slotOfId(row: number, origCol: number, shift: number) {
  const len = ROW_LENS[row] ?? 7;
  return mod(origCol + shift, len);
}

function neighborSlots(row: number, col: number) {
  const out: Array<{ r: number; c: number }> = [];
  const len = ROW_LENS[row] ?? 7;

  if (col - 1 >= 0) out.push({ r: row, c: col - 1 });
  if (col + 1 < len) out.push({ r: row, c: col + 1 });

  const up = row - 1;
  const dn = row + 1;

  const lenUp = up >= 0 ? (ROW_LENS[up] ?? 7) : 0;
  const lenDn = dn < ROW_LENS.length ? (ROW_LENS[dn] ?? 7) : 0;

  const curIs6 = (ROW_LENS[row] ?? 7) === 6;

  const upA = curIs6 ? col : col - 1;
  const upB = curIs6 ? col + 1 : col;

  const dnA = curIs6 ? col : col - 1;
  const dnB = curIs6 ? col + 1 : col;

  if (up >= 0) {
    if (upA >= 0 && upA < lenUp) out.push({ r: up, c: upA });
    if (upB >= 0 && upB < lenUp) out.push({ r: up, c: upB });
  }

  if (dn < ROW_LENS.length) {
    if (dnA >= 0 && dnA < lenDn) out.push({ r: dn, c: dnA });
    if (dnB >= 0 && dnB < lenDn) out.push({ r: dn, c: dnB });
  }

  return out;
}

function getRowShiftUnits(st: any, layer: number, row: number): number {
  const a =
    st?.rowShifts?.[layer]?.[row] ??
    st?.rowShifts?.["L" + layer]?.[row] ??
    0;
  const n = Number(a);
  return Number.isFinite(n) ? n : 0;
}

// ✅ shifted neighbors the engine can trust
export function neighborIdsSameLayer(st: any, pid: string): string[] {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(pid);
  if (!m) return [];

  const layer = Number(m[1]);
  const row = Number(m[2]);
  const col = Number(m[3]);

  const shiftCur = getRowShiftUnits(st, layer, row);
  const slotC = slotOfId(row, col, shiftCur);

  const slots = neighborSlots(row, slotC);

  const out: string[] = [];
  for (const s of slots) {
    const cols = ROW_LENS[s.r] ?? 7;
    if (s.c < 0 || s.c >= cols) continue;

    const shift = getRowShiftUnits(st, layer, s.r);
    out.push(idAtSlot(layer, s.r, s.c, shift));
  }
  return out;
}
