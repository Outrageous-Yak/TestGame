// src/ui/app.tsx 
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";


import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, type ReachMap } from "../engine/api";

import { ROW_LENS, enterLayer, revealHex } from "../engine/board";
import { neighborIdsSameLayer } from "../engine/neighbors";

/**
 * ✅ Worlds registry import (GitHub/Linux safe)
 * Requires a module at: src/worlds/index.(ts|js|tsx|jsx)
 * Supported export shapes:
 * - export const worlds = [...]
 * - export default [...]
 * - export const registry = [...]
 */
import * as WorldsMod from "../worlds";

/* =========================================================
   Types
========================================================= */

type Screen = "start" | "world" | "character" | "scenario" | "game";

type PlayerChoice =
  | { kind: "preset"; id: string; name: string }
  | { kind: "custom"; name: string; imageDataUrl: string | null };

type Coord = { layer: number; row: number; col: number };
type LogEntry = { n: number; t: string; msg: string; kind?: "ok" | "bad" | "info" };

type LayerPalette = {
  L1: string;
  L2: string;
  L3: string;
  L4: string;
  L5: string;
  L6: string;
  L7: string;
};

type ScenarioTheme = {
  palette: LayerPalette;
  assets: {
    backgroundGame?: string;
    backgroundLayers?: Partial<{
      L1: string;
      L2: string;
      L3: string;
      L4: string;
      L5: string;
      L6: string;
      L7: string;
    }>;
    diceFacesBase: string;
    diceCornerBorder: string;
    villainsBase: string;
    hexTile?: string;
  };
};

type Track = { id: string; name: string; scenarioJson: string };

type ScenarioEntry = {
  id: string;
  name: string;
  desc?: string;
  scenarioJson: string;
  theme: ScenarioTheme;
  tracks?: Track[];
};



type WorldEntry = {
  id: string;
  name: string;
  desc?: string;
  menu: { solidColor?: string };
  scenarios: ScenarioEntry[];
};

type VillainKey = "bad1" | "bad2" | "bad3" | "bad4";
type VillainTrigger = { key: VillainKey; layer: number; row: number; cols?: "any" | number[] };
type Encounter = null | { villainKey: VillainKey; tries: number };

/* =========================================================
   Worlds registry helpers
========================================================= */

function getRegisteredWorlds(): any[] {
  const anyMod: any = WorldsMod as any;
  const list =
    (Array.isArray(anyMod?.worlds) && anyMod.worlds) ||
    (Array.isArray(anyMod?.default) && anyMod.default) ||
    (Array.isArray(anyMod?.registeredWorlds) && anyMod.registeredWorlds) ||
    (Array.isArray(anyMod?.registry) && anyMod.registry) ||
    [];
  return list;
}

function normalizeWorldEntry(raw: any): WorldEntry | null {
  if (!raw) return null;
  const w = raw.default ?? raw;
const id = String(w.id ?? w.slug ?? w.key ?? "world");
const name = String(w.name ?? w.title ?? id);

  const scenarios = Array.isArray(w.scenarios) ? w.scenarios : [];

  const normScenarios: ScenarioEntry[] = scenarios
    .map((s: any, idx: number): ScenarioEntry | null => {
      if (!s) return null;

      const sid = String(s.id ?? s.slug ?? `scenario-${idx}`);
      const sname = String(s.name ?? s.title ?? sid);

      const scenarioJson = String(s.scenarioJson ?? s.json ?? "");
      if (!scenarioJson) return null;

      const theme: ScenarioTheme =
        s.theme ??
        ({
          palette: {
            L1: "#19ffb4",
            L2: "#67a5ff",
            L3: "#ffd36a",
            L4: "#ff7ad1",
            L5: "#a1ff5a",
            L6: "#a58bff",
            L7: "#ff5d7a",
          },
          assets: {
            diceFacesBase: "images/dice",
            diceCornerBorder: "",
            villainsBase: "images/villains",
          },
        } as ScenarioTheme);

      const tracks: Track[] | undefined = Array.isArray(s.tracks)
        ? (s.tracks
            .map((t: any, tIdx: number): Track | null => {
              if (!t) return null;
              const tid = String(t.id ?? `track-${tIdx}`);
              const tname = String(t.name ?? tid);
              const tjson = String(t.scenarioJson ?? t.json ?? "");
              if (!tjson) return null;
              return { id: tid, name: tname, scenarioJson: tjson };
            })
            .filter(Boolean) as Track[])
        : undefined;

      return {
        id: sid,
        name: sname,
        desc: s.desc,
        scenarioJson,
        theme,
        tracks: tracks && tracks.length ? tracks : undefined,
      };
    })
    .filter(Boolean) as ScenarioEntry[];

  if (normScenarios.length === 0) return null;

  return {
    id,
    name,
    desc: w.desc,
    menu: w.menu ?? {},
    scenarios: normScenarios,
  };
}

function loadWorlds(): WorldEntry[] {
  const rawList = getRegisteredWorlds();
  const list: WorldEntry[] = [];

  for (const raw of rawList) {
    const norm = normalizeWorldEntry(raw);
    if (norm) list.push(norm);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

/* =========================================================
   Helpers
========================================================= */

function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const cleanBase = String(base).endsWith("/") ? String(base) : `${base}/`;
  const cleanPath = String(p).replace(/^\/+/, "");
  return cleanBase + cleanPath;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(toPublicUrl(path));
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  return res.json();
}

async function loadScenario(path: string): Promise<Scenario> {
  const s = await fetchJson<Scenario>(path);
  assertScenario(s as any);
  return s;
}

function getHexFromState(state: GameState | null, id: string): Hex | undefined {
  if (!state) return undefined;
  const m: any = (state as any).hexesById;
  if (m?.get) return m.get(id);
  return (state as any).hexesById?.[id];
}

function isBlockedOrMissing(hex: any): { blocked: boolean; missing: boolean } {
  if (!hex) return { blocked: true, missing: true };
  return { missing: !!hex.missing, blocked: !!hex.blocked };
}

function layerCssVar(n: number) {
  const clamped = Math.max(1, Math.min(7, Math.floor(n || 1)));
  return `var(--L${clamped})`;
}

function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function findGoalId(s: any, fallbackLayer: number): string | null {
  const direct =
    s?.goalHexId ??
    s?.goalId ??
    s?.exitHexId ??
    s?.exitId ??
    s?.targetHexId ??
    s?.targetId ??
    s?.winHexId ??
    s?.winId ??
    null;

  if (typeof direct === "string" && /^L\d+-R\d+-C\d+$/.test(direct)) return direct;

  const gc = s?.goal ?? s?.exit ?? s?.target ?? null;
  if (gc && typeof gc === "object") {
    const layer = Number(gc.layer ?? fallbackLayer);
    const row = Number(gc.row ?? gc.r);
    const col = Number(gc.col ?? gc.c);
    if (Number.isFinite(layer) && Number.isFinite(row) && Number.isFinite(col)) {
      return `L${layer}-R${row}-C${col}`;
    }
  }
  return null;
}

function findFirstPlayableHexId(st: GameState, layer: number): string {
  for (let r = 0; r < ROW_LENS.length; r++) {
    const len = ROW_LENS[r] ?? 7;
    for (let c = 0; c < len; c++) {
      const id = `L${layer}-R${r}-C${c}`;
      const hex = getHexFromState(st, id) as any;
      if (!hex) continue;
      if (hex.missing) continue;
      if (hex.blocked) continue;
      return id;
    }
  }
  return `L${layer}-R0-C0`;
}
function findPortalDirection(
  transitions: any[] | undefined,
  id: string
): "up" | "down" | null {
  if (!transitions) return null;

  const c = idToCoord(id);
  if (!c) return null;

  for (const t of transitions) {
    const from = t.from;
    if (!from) continue;

    if (
      Number(from.layer) === c.layer &&
      Number(from.row) === c.row &&
      Number(from.col) === c.col
    ) {
      return t.type === "UP" ? "up" : "down";
    }
  }

  return null;
}

function facingFromMove(fromId: string | null, toId: string | null): "down" | "up" | "left" | "right" {
  const a = fromId ? idToCoord(fromId) : null;
  const b = toId ? idToCoord(toId) : null;
  if (!a || !b) return "down";
  if (a.layer !== b.layer) return "down";

  const dRow = b.row - a.row;
  const dCol = b.col - a.col;

  if (Math.abs(dCol) >= Math.abs(dRow)) return dCol > 0 ? "right" : dCol < 0 ? "left" : "down";
  return dRow > 0 ? "down" : "up";
}
function facingFromMoveVisual(
  st: any,
  fromId: string | null,
  toId: string | null,
  _layer: number,
  movesTakenForLayer: number
): "down" | "up" | "left" | "right" {
  const a = fromId ? idToCoord(fromId) : null;
  const b = toId ? idToCoord(toId) : null;
  if (!a || !b) return "down";

  // different layer: keep "down" (or choose your own rule)
  if (a.layer !== b.layer) return "down";

  const lenA = ROW_LENS[a.row] ?? 7;
  const lenB = ROW_LENS[b.row] ?? 7;

  // shifts for each row (engine if non-zero else derived)
  const sAeng = getRowShiftUnits(st, a.layer, a.row);
  const sAraw = sAeng !== 0 ? sAeng : derivedRowShiftUnits(st, a.layer, a.row, movesTakenForLayer);
  const sA = normalizeRowShift(sAraw, lenA).visual;

  const sBeng = getRowShiftUnits(st, b.layer, b.row);
  const sBraw = sBeng !== 0 ? sBeng : derivedRowShiftUnits(st, b.layer, b.row, movesTakenForLayer);
  const sB = normalizeRowShift(sBraw, lenB).visual;

  // slot columns (already modulo)
  const slotA = slotOfId(a.row, a.col, sA);
  const slotB = slotOfId(b.row, b.col, sB);

  // compute dx in "slot units" and choose the shortest circular direction when same row
  let dxSlots = slotB - slotA;
  if (a.row === b.row) {
    const len = lenA;
    // wrap dx to [-len/2, len/2]
    dxSlots = ((dxSlots + len / 2) % len) - len / 2;
  }

  const dRow = b.row - a.row;

  // prefer horizontal if it dominates
  if (Math.abs(dxSlots) >= Math.abs(dRow) * 0.5) {
    return dxSlots > 0 ? "right" : dxSlots < 0 ? "left" : "down";
  }

  return dRow > 0 ? "down" : "up";
}


function unwrapNextState(res: any): GameState | null {
  if (!res) return null;

  if (typeof res === "object" && "state" in (res as any)) {
    const st = (res as any).state;
    return st && typeof st === "object" ? (st as GameState) : null;
  }

  if (typeof res === "object" && (("hexesById" in (res as any)) || ("playerHexId" in (res as any)))) {
    return res as GameState;
  }

  return null;
}
function getNeighborsSameLayer(st: any, pid: string): string[] {
  // ✅ FIRST: state-aware neighbors (respects shifting rows)
  try {
    const b = (neighborIdsSameLayer as any)(st, pid);
    if (Array.isArray(b)) return b;
  } catch {}

  // fallback: static neighbors (no shifting)
  try {
    const a = (neighborIdsSameLayer as any)(pid);
    if (Array.isArray(a)) return a;
  } catch {}

  return [];
}

function cloneReachMap(rm: any): ReachMap {
  if (!rm) return {} as any;

  // Map-like
  if (typeof rm?.entries === "function") {
    return new Map(rm) as any;
  }

  // Plain object
  return { ...(rm as any) } as any;
}

function getRowShiftUnits(st: any, layer: number, row: number): number {
  const a =
    st?.rowShifts?.[layer]?.[row] ??
    st?.rowShifts?.["L" + layer]?.[row] ??
    st?.shiftByLayer?.[layer]?.[row] ??
    st?.layerRowShift?.[layer]?.[row] ??
    0;
  const n = Number(a);
  return Number.isFinite(n) ? n : 0;
}
function getMovementPattern(st: any, layer: number): string {
  // st can be a GameState (st.scenario) OR a Scenario (st itself)
  const sc = st?.scenario ?? st;

  const m = sc?.movement ?? sc?.movementByLayer ?? null;
  if (!m) return "NONE";

  const v = m[layer] ?? m[String(layer)] ?? m["L" + layer];
  return typeof v === "string" ? v : "NONE";
}

function derivedRowShiftUnits(st: any, layer: number, row: number, movesTaken: number): number {
  if (!st) return 0;

  const pat = getMovementPattern(st, layer);
  const cols = ROW_LENS[row] ?? 7;

  if (pat === "SEVEN_LEFT_SIX_RIGHT") {
    if (cols === 7) return -movesTaken;
    if (cols === 6) return movesTaken;
  }

  return 0;
}


function posForHex(
  st: any,
  layer: number,
  row: number,
  col: number,
  movesTaken: number,
  stepX: number,
  stepY: number
) {
  const cols = ROW_LENS[row] ?? 7;
  const isOffset = cols === 6;

  // ✅ correct offset for 6-wide rows
  const base = isOffset ? (-stepX / 2) : 0;
const engineShift = getRowShiftUnits(st, layer, row);
const shift =
  engineShift !== 0
    ? engineShift
    : derivedRowShiftUnits(st, layer, row, movesTaken);


  const x = base + (col * stepX) + (shift * stepX);
  const y = row * stepY;

  return { x, y };
}


function getShiftedNeighborsSameLayer(st: any, pid: string, movesTaken: number): string[] {
  const c = idToCoord(pid);
  if (!c) return [];

  // shift for the player row
const engineShiftCur = getRowShiftUnits(st, c.layer, c.row);
const shiftCur =
  engineShiftCur !== 0
    ? engineShiftCur
    : derivedRowShiftUnits(st, c.layer, c.row, movesTaken);




  // player’s visual slot column
  const slotC = slotOfId(c.row, c.col, shiftCur);

  // neighbor slots on the 7676767 grid
  const slots = neighborSlots(c.row, slotC);

  const out: string[] = [];
  for (const s of slots) {
    const cols = ROW_LENS[s.r] ?? 7;
const engineShift = getRowShiftUnits(st, c.layer, s.r);
const shift =
  engineShift !== 0
    ? engineShift
    : derivedRowShiftUnits(st, c.layer, s.r, movesTaken);



    // ensure slot column is valid for that row length
    if (s.c < 0 || s.c >= cols) continue;

    const id = idAtSlot(c.layer, s.r, s.c, shift);

    const hex = getHexFromState(st, id) as any;
    if (!hex || hex.missing) continue;

    out.push(id);
  }

  return out;
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

// shift > 0 means row moved RIGHT by that many slots
// shift < 0 means row moved LEFT
function idAtSlot(layer: number, row: number, slotCol: number, shift: number) {
  const len = ROW_LENS[row] ?? 7;
  const origCol = mod(slotCol - shift, len); // inverse mapping
  return "L" + layer + "-R" + row + "-C" + origCol;
}

function slotOfId(row: number, origCol: number, shift: number) {
  const len = ROW_LENS[row] ?? 7;
  return mod(origCol + shift, len); // forward mapping
}

// 7676767 neighbor slots (static grid), returns up to 6 slot coords
function neighborSlots(row: number, col: number) {
  const out: Array<{ r: number; c: number }> = [];

  const len = ROW_LENS[row] ?? 7;

  // horizontal
  if (col - 1 >= 0) out.push({ r: row, c: col - 1 });
  if (col + 1 < len) out.push({ r: row, c: col + 1 });

  const up = row - 1;
  const dn = row + 1;

  const lenUp = up >= 0 ? (ROW_LENS[up] ?? 7) : 0;
  const lenDn = dn < ROW_LENS.length ? (ROW_LENS[dn] ?? 7) : 0;

  const curIs6 = (ROW_LENS[row] ?? 7) === 6;

  // If current row is 7, adjacent 6-row sits "between" cols => neighbors use (c-1,c)
  // If current row is 6, adjacent 7-row spans wider => neighbors use (c,c+1)
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
function readPxVar(el: HTMLElement | null, name: string, fallback: number) {
  if (!el) return fallback;
  const v = getComputedStyle(el).getPropertyValue(name).trim(); // e.g. "72px"
  const n = Number(v.replace("px", ""));
  return Number.isFinite(n) ? n : fallback;
}
function normalizeRowShift(rawShift: number, rowLen: number) {
  // wrap to 0..len-1
  let wrapped = ((rawShift % rowLen) + rowLen) % rowLen;

  // convert to a small signed shift so translateX doesn't drift forever
  let visual = wrapped;
  if (visual > rowLen / 2) visual = visual - rowLen; // e.g. 6 -> -1 for len=7

  return { wrapped, visual };
}

/* =========================================================
   CSS
========================================================= */

const baseCss = `
:root{
  --bg0: #070814;
  --bg1: rgba(10,14,24,.92);

  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.65);

  --panel: rgba(10,14,24,.88);
  --stroke: rgba(255,255,255,.10);
  --stroke2: rgba(255,255,255,.18);

  --shadow: 0 18px 52px rgba(0,0,0,.45);
  --shadow2: 0 18px 56px rgba(0,0,0,.55);

  /* board sizing */
  --boardW: 860px;
  --boardPadTop: 18px;
  --boardPadBottom: 18px;

  /* hex geometry (7676767) */
  --hexWMain: 96px;
  --hexHMain: 84px;
  --hexStepX: 90px; /* horizontal spacing between centers */

  /* derived: used by bars (match board height incl padding) */
  --hexFieldH: calc((var(--hexHMain) * 7) + var(--boardPadTop) + var(--boardPadBottom));

  /* side columns */
  --barColW: 86px;
  --barW: 26px;
  --sideColW: 340px;

  /* layer colors (overridden by themeVars inline) */
  --L1:#19ffb4;
  --L2:#67a5ff;
  --L3:#ffd36a;
  --L4:#ff7ad1;
  --L5:#a1ff5a;
  --L6:#a58bff;
  --L7:#ff5d7a;
}

*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  background: radial-gradient(1200px 900px at 50% 20%, rgba(60,80,180,.22), transparent 55%),
              radial-gradient(900px 650px at 20% 80%, rgba(120,255,210,.10), transparent 55%),
              var(--bg0);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  overflow:hidden;
}

.appRoot{
  min-height:100vh;
  position:relative;
}

.gameBg{
  position:absolute;
  inset:0;
  z-index:0;
  background-size: cover;
  background-position: center;
  opacity:1;
  filter: saturate(1.25) contrast(1.15) brightness(1.05);
}

/* =========================================================
   TOPBAR
========================================================= */
.topbar{
  height:64px;
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  background: linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.08));
  backdrop-filter: blur(10px);
  position:relative;
  z-index:5;

  flex-wrap: nowrap;
  overflow: hidden;
}
.spacer{ flex:1; }

/* =========================================================
   PANELS / COMMON UI
========================================================= */
.screen.center{ height: calc(100vh - 64px); display:grid; place-items:center; padding:18px; }
.panel{
  width: min(980px, 92vw);
  background: var(--panel);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 18px;
  backdrop-filter: blur(12px);
}
.panel.wide{ width:min(1040px, 94vw); }

.title{ font-size: 22px; font-weight: 900; letter-spacing: .3px; }
.sub{ margin-top:6px; color: var(--muted); font-size: 13px; }

.row{ display:flex; gap:10px; justify-content:flex-end; margin-top:14px; align-items:center; }
.hint{ margin-top:12px; color: var(--muted); font-size: 13px; }

.btn{
  border: 1px solid var(--stroke);
  background: rgba(255,255,255,.10);
  color: var(--text);
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.btn:hover{ background: rgba(255,255,255,.16); border-color: var(--stroke2); transform: translateY(-1px); }
.btn:active{ background: rgba(255,255,255,.22); transform: translateY(0); }
.btn:disabled{ opacity: .55; cursor: not-allowed; transform:none; }

.btn.primary{
  background: rgba(120,220,255,.22);
  border-color: rgba(120,220,255,.35);
}
.btn.primary:hover{ background: rgba(120,220,255,.28); border-color: rgba(120,220,255,.50); }
.btn.primary:active{ background: rgba(120,220,255,.36); }

.grid{
  margin-top: 12px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 12px;
}
@media (max-width: 700px){
  body{ overflow:auto; }
  .grid{ grid-template-columns: 1fr; }
}

.card{
  text-align: left;
  padding: 14px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor: pointer;

  position: relative;
  border-radius: 22px;
  overflow: hidden;              /* ✅ clips any animated/shine layers if you add them later */
  backface-visibility: hidden;   /* ✅ reduces edge shimmer */
  will-change: transform;

  transition:
    transform 140ms ease,
    border-color 140ms ease,
    background 140ms ease,
    box-shadow 140ms ease;
}

.card:hover{
  transform: translateY(-1px);
  border-color: rgba(120,220,255,.35);
  background: rgba(0,0,0,.30);
  box-shadow: 0 14px 40px rgba(0,0,0,.32);
}

.card.active{
  border-color: rgba(120,255,210,.45);
  box-shadow: 0 0 0 3px rgba(120,255,210,.12), 0 16px 45px rgba(0,0,0,.42);
}

.cardTitle{
  font-weight: 900;
}

.cardDesc{
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.customBox{
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.lbl{
  font-size: 12px;
  color: var(--muted);
}

.inp{
  width: 100%;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.24);
  color: var(--text);
  outline: none;
}

.portrait{
  width: 120px;
  height: 120px;
  border-radius: 18px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  box-shadow: 0 14px 40px rgba(0,0,0,.28);
}

.tracks{
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.tracksTitle{
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .4px;
}

.tracksRow{
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.chip{
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor: pointer;
}

.chip.active{
  border-color: rgba(120,255,210,.45);
  box-shadow: 0 0 0 3px rgba(120,255,210,.12);
}

/* =========================================================
   TOPBAR HUD GROUPS + ITEMS
========================================================= */
.hudGroup{
  display:flex;
  align-items:center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  box-shadow: 0 12px 30px rgba(0,0,0,.22);
}
.hudStat{
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  min-width: 86px;
}
.hudStat .k{
  font-size: 11px;
  color: var(--muted);
  letter-spacing: .35px;
  text-transform: uppercase;
}
.hudStat .v{
  margin-top: 4px;
  font-weight: 900;
  font-size: 13px;
}
.mutedSmall{
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  margin-left: 6px;
}

.items{ display:flex; gap: 10px; flex-wrap: nowrap; }
.itemBtn{
  display:grid;
  grid-template-columns: 20px auto 18px;
  align-items:center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor:pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
}
.itemBtn:hover{ background: rgba(0,0,0,.30); border-color: var(--stroke2); transform: translateY(-1px); }
.itemBtn:active{ transform: translateY(0); }
.itemBtn:disabled{ opacity: .55; cursor: not-allowed; transform:none; }
.itemBtn.off{ opacity: .5; filter: grayscale(.2); }
.itemIcon{ font-size: 16px; line-height: 1; }
.itemName{ font-size: 12px; font-weight: 900; letter-spacing: .25px; }
.itemCharges{
  font-size: 12px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.08);
  text-align:center;
}

/* =========================================================
   PILL
========================================================= */
.pill{
  display:inline-flex; align-items:center; gap:10px;
  padding: 9px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.22);
  box-shadow: 0 12px 35px rgba(0,0,0,.25);
}
.dot{
  width:10px; height:10px; border-radius:50%;
  background: radial-gradient(circle at 30% 30%, rgba(120,255,210,.95), rgba(120,150,255,.65));
  box-shadow: 0 0 0 3px rgba(120,255,210,.10);
}
.pillText{ font-weight: 800; font-size: 13px; color: rgba(255,255,255,.88); }

/* =========================================================
   DICE 3D
========================================================= */
.dice3d{
  width: 58px; height: 58px;
  position: relative;
  display:grid;
  place-items:center;
  perspective: 700px;
}
.dice3d .cube{
  width: 46px; height: 46px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 180ms ease;
}
.dice3d.rolling .cube{ animation: cubeWobble .35s ease-in-out infinite; }
@keyframes cubeWobble{
  0%{ transform: rotateX(0deg) rotateY(0deg); }
  25%{ transform: rotateX(18deg) rotateY(-16deg); }
  50%{ transform: rotateX(-16deg) rotateY(22deg); }
  75%{ transform: rotateX(14deg) rotateY(16deg); }
  100%{ transform: rotateX(0deg) rotateY(0deg); }
}
.dice3d .face{
  position:absolute; inset:0;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.14);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.35), 0 10px 22px rgba(0,0,0,.35);
  backface-visibility: hidden;
}
.dice3d .face-front{  transform: rotateY(  0deg) translateZ(23px); }
.dice3d .face-back{   transform: rotateY(180deg) translateZ(23px); }
.dice3d .face-right{  transform: rotateY( 90deg) translateZ(23px); }
.dice3d .face-left{   transform: rotateY(-90deg) translateZ(23px); }
.dice3d .face-top{    transform: rotateX( 90deg) translateZ(23px); }
.dice3d .face-bottom{ transform: rotateX(-90deg) translateZ(23px); }
.diceBorder{
  position:absolute; inset: 0;
  pointer-events:none;
  background-size: cover;
  background-position: center;
  opacity: .95;
  filter: drop-shadow(0 10px 22px rgba(0,0,0,.35));
}

/* =========================================================
   GAME LAYOUT GRID
========================================================= */
.gameLayout{
  position: relative;
  z-index: 3;
  height: calc(100vh - 64px);
  display: grid;
  grid-template-columns: 1fr var(--sideColW); /* ✅ only board + sidebar */
  gap: 14px;
  padding: 14px;
  grid-template-rows: 1fr;     /* ✅ IMPORTANT */
  min-height: 0;              /* ✅ keep */
  opacity: 1;
}

/* =========================================================
   LAYER BARS (HEIGHT MATCHES HEX FIELD + ACTIVE GLOW)
========================================================= */
.barWrap{
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 6;
}
.barLeft{ justify-content: flex-start; }
.barRight{ justify-content: flex-end; }

.layerBar{
  width: var(--barW);
  height: var(--hexFieldH);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(0,0,0,.18);
  box-shadow: 0 18px 40px rgba(0,0,0,.35);
  display: flex;
  flex-direction: column; 
  position: relative;
}
.barSeg{ height: var(--hexHMain); width: 100%; opacity: .95; }
.barSeg[data-layer="7"]{ background: var(--L7); }
.barSeg[data-layer="6"]{ background: var(--L6); }
.barSeg[data-layer="5"]{ background: var(--L5); }
.barSeg[data-layer="4"]{ background: var(--L4); }
.barSeg[data-layer="3"]{ background: var(--L3); }
.barSeg[data-layer="2"]{ background: var(--L2); }
.barSeg[data-layer="1"]{ background: var(--L1); }

.barSeg.isActive{
  filter: brightness(1.15);
  box-shadow:
    inset 0 0 0 2px rgba(255,255,255,.42),
    0 0 18px 6px rgba(255,255,255,.10);
  position: relative;
}
.barSeg.isActive::after{
  content:"";
  position:absolute;
  inset: -6px;
  background: radial-gradient(circle at 50% 50%, rgba(255,255,255,.35), transparent 60%);
  opacity: .55;
  pointer-events:none;
}
/* LEFT BAR: row shift labels */
.rowShiftBar{
  position: relative;
}

.rowShiftBar .rowSeg{
  display: grid;
  place-items: center; /* ✅ centers text in each row block */
  background: rgba(255,255,255,.03); /* subtle; optional */
}

.rowShiftLabel{
  font-weight: 1000;
  font-size: 12px;
  letter-spacing: .35px;
  color: rgba(255,255,255,.88);
  text-shadow: 0 2px 10px rgba(0,0,0,.45);
  user-select: none;
}
.goalMarker{
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-weight: 1000;
  font-size: 12px;
  letter-spacing: .2px;

  color: rgba(255, 220, 120, .95);
  background: rgba(0,0,0,.45);
  border: 1px solid rgba(255, 220, 120, .55);
  box-shadow:
    0 10px 22px rgba(0,0,0,.45),
    0 0 0 3px rgba(255, 220, 120, .10);
  z-index: 5;
  pointer-events: none;
}
/* =========================================================
   BOARD WRAP
========================================================= */
.boardWrap{
  position: relative;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.50);
  box-shadow: var(--shadow2);
  overflow: hidden;           /* ✅ important: contain scroll/overlays */
--boardInset: calc((100% - (var(--barColW) * 2) - var(--boardW)) / 2);
display: grid;
  grid-template-columns: var(--barColW) 1fr var(--barColW);
  align-items: stretch;       /* ✅ WAS center — this is the big bug */
  opacity: 1;

   height: 100%;               /* ✅ IMPORTANT */
  min-height: 0;
}


.boardLayerBg{
  position:absolute; inset:0;
  background-size: cover;
  background-position: center;
  opacity: 1;
  transform: scale(1.02);
  animation: bgFadeIn 220ms ease;
  z-index: 1;
}
@keyframes bgFadeIn{
  from{ opacity: 0; }
  to{ opacity: .45; }
}

.boardScroll{
  grid-column: 2;
  position: relative;
  z-index: 3;          /* above bg + overlay */
  height: 100%;        /* ✅ make it fill the stretched cell */
  min-height: 0;
  overflow: auto;
  padding: 0 10px;

}

.barWrap.barLeft{ grid-column: 1; }
.barWrap.barRight{ grid-column: 3; }
.board{
  width: var(--boardW);
  margin: 0 auto;
  padding: var(--boardPadTop) 0 var(--boardPadBottom);
  position: relative;
  height: var(--hexFieldH);
}


/* =========================================================
   HEX ROWS (7676767)
========================================================= */
.hexRow{
  display: flex;
  align-items: center;
  width: fit-content;
  margin: 0 auto;
  position: relative;
}
.hexGrid{
  width: fit-content;
  margin: 0 auto;
  position: relative;
}

/* =========================================================
   HEX SLOTS + HEX BUTTON
   ✅ FIX: removed invalid nested ".hex{ .hex{ ... } }"
========================================================= */
.hexSlot{
  width: var(--hexStepX);
  height: var(--hexHMain);
  display: grid;
  place-items: center;
  flex: 0 0 var(--hexStepX);
}
.hexSlot.empty{ opacity: 0; }

.hex{
  width: var(--hexWMain);
  height: var(--hexHMain);

  padding: 50;
  border: none;
  background: rgba(0,0,0,0);
  cursor: pointer;

  filter: drop-shadow(0 10px 16px rgba(0,0,0,.35));
  transition: transform 140ms ease, filter 140ms ease;
  position: relative;
  overflow: visible;

  --hexGlow: rgba(120,255,210,.51);
flex: 0 0 var(--hexWMain);
}
.hex:hover{
  transform: translateY(-2px);
  filter: drop-shadow(0 14px 22px rgba(0,0,0,.45));
}
.hex:disabled{
  opacity: .75;
  cursor: not-allowed;
  transform:none;
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.25));
}

/* =========================================================
   HEX INNER TILE + STATES
========================================================= */
.hexAnchor{ position: relative; width: 100%; height: 100%; overflow: visible; }

.hexInner{
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 10px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  border: 1px solid rgba(255,255,255,.12);
  background:
    radial-gradient(circle at 30% 25%, rgba(120,255,210,.12), transparent 55%),
    radial-gradient(circle at 70% 70%, rgba(120,150,255,.12), transparent 55%),
    rgba(0,0,0,.34);
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.35);
  overflow:hidden;
}
.hexInner::before{
  content:"";
  position:absolute;
  inset:-2px;
  opacity:.18;
  background:
    radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 55%),
    radial-gradient(circle at 80% 80%, rgba(255,255,255,.25), transparent 55%);
  pointer-events:none;
}
/* =========================================================
   START TILE PORTAL FX (Bonus: Portal Hex recreated)
   Uses your per-hex color: --hexGlow
========================================================= */

.hex.portalStart{
  --portalC: var(--hexGlow);
}

/* layers inside hexInner (already clipped) */
.hex .hexInner .pAura,
.hex .hexInner .pRunes,
.hex .hexInner .pVortex,
.hex .hexInner .pWell,
.hex .hexInner .pShine{
  position:absolute;
  inset:0;
  pointer-events:none;
  border-radius: 10px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
}

.hex.portalStart .hexInner{
  border-color: color-mix(in srgb, var(--portalC) 55%, rgba(255,255,255,.14));
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.35),
    0 0 0 3px color-mix(in srgb, var(--portalC) 18%, transparent),
    0 0 18px color-mix(in srgb, var(--portalC) 22%, transparent);
}

/* Aura bloom */
.hex.portalStart .hexInner .pAura{
  inset:-14%;
  background:
    radial-gradient(circle at 50% 50%,
      color-mix(in srgb, var(--portalC) 70%, transparent),
      transparent 60%),
    radial-gradient(circle at 60% 78%,
      rgba(0,255,195,0.18),
      transparent 64%);
  filter: blur(14px) saturate(1.15);
  opacity: 0.95;
  animation: portalBreathe 2.6s ease-in-out infinite;
}
@keyframes portalBreathe{
  0%,100%{ transform: scale(0.99); filter: blur(12px) saturate(1.05); }
  50%{ transform: scale(1.12); filter: blur(16px) saturate(1.25); }
}

/* Vortex (twirl) */
.hex.portalStart .hexInner .pVortex{
  inset: 9%;
  overflow:hidden;
  filter: saturate(1.15);
  opacity: 0.95;
}
.hex.portalStart .hexInner .pVortex::before{
  content:"";
  position:absolute; inset:-25%;
  background:
    conic-gradient(from 0deg,
      rgba(0,0,0,0) 0 10%,
      color-mix(in srgb, var(--portalC) 70%, transparent) 18%,
      rgba(0,255,195,0.22) 28%,
      rgba(255,80,170,0.16) 40%,
      color-mix(in srgb, var(--portalC) 50%, transparent) 54%,
      rgba(0,0,0,0) 70% 100%),
    radial-gradient(circle at 50% 50%,
      rgba(0,0,0,0.0) 0 42%,
      rgba(0,0,0,0.75) 64% 100%);
  mix-blend-mode: screen;
  animation: portalVortex 1.45s linear infinite;
}
@keyframes portalVortex{
  0%{ transform: rotate(0deg) scale(1.03); }
  100%{ transform: rotate(360deg) scale(1.03); }
}

/* Runic ring */
.hex.portalStart .hexInner .pRunes{
  inset: 2%;
  opacity: 0.85;
  background:
    repeating-conic-gradient(
      from 10deg,
      rgba(255,255,255,0.0) 0 10deg,
      color-mix(in srgb, var(--portalC) 55%, transparent) 10deg 12deg,
      rgba(255,255,255,0.0) 12deg 18deg
    );
  filter: blur(0.35px);
  animation: portalRunes 3.4s linear infinite reverse;
  mix-blend-mode: screen;
}
@keyframes portalRunes{
  0%{ transform: rotate(0deg); }
  100%{ transform: rotate(360deg); }
}

/* Depth “well” */
.hex.portalStart .hexInner .pWell{
  inset: 26%;
  background:
    radial-gradient(circle at 50% 52%,
      rgba(0,0,0,0.0) 0 35%,
      rgba(0,0,0,0.9) 70% 100%),
    radial-gradient(circle at 45% 40%,
      rgba(255,255,255,0.12),
      transparent 55%);
  opacity: 0.95;
}

/* Shimmer sweep */
.hex.portalStart .hexInner .pShine{
  inset:-25%;
  background:
    conic-gradient(from 210deg,
      transparent 0 45%,
      rgba(255,255,255,0.18) 48%,
      transparent 52% 100%);
  opacity:0.40;
  mix-blend-mode: screen;
  animation: portalShine 1.6s linear infinite;
}
@keyframes portalShine{
  0%{ transform: rotate(0deg); }
  100%{ transform: rotate(360deg); }
}

.hex.reach .hexInner{
  position: relative;
  background: transparent !important;
  background-image: none !important;

  border-color: rgba(255, 45, 161, .9);
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.4);
}
.hex.reach .hexInner::after{
  content:"";
  position:absolute;
  inset: -1px;                 /* sits just outside the hex edge */
  border-radius: inherit;
  padding: 2px;
  pointer-events: none;

  background:
    conic-gradient(
      from var(--reachSpin),
      transparent 0deg,
      rgba(255,45,161,.25) 60deg,
      rgba(255,45,161,.95) 110deg,
      rgba(255,45,161,.25) 160deg,
      transparent 220deg,
      transparent 360deg
    );

  /* cut the center so it’s outline-only */
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;

  filter: drop-shadow(0 0 6px rgba(255,45,161,.6));

  animation:
    reachSpin 2.6s linear infinite,
    reachPulse 1.2s ease-in-out infinite;

  will-change: transform;
  transform: translateZ(0);
}

@property --reachSpin {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes reachSpin {
  to { --reachSpin: 360deg; }
}

@keyframes reachPulse {
  0%,100% { opacity: .85; }
  50%     { opacity: 1; }
}

@keyframes reachPulse{
  0%{ filter: brightness(1); }
  50%{ filter: brightness(1.15); }
  100%{ filter: brightness(1); }
}

.hex.sel .hexInner{
  border-color: rgba(255,221,121,.55);
  box-shadow: inset 0 0 0 1px rgba(255,221,121,.20), 0 0 0 3px rgba(255,221,121,.10);
}
.hex.blocked .hexInner{
  border-color: rgba(255,93,122,.22);
  background: rgba(0,0,0,.55);
  filter: grayscale(.15) brightness(.9);
}
.hex.player .hexInner{
  border-color: rgba(120,255,210,.55);
  box-shadow: inset 0 0 0 1px rgba(120,255,210,.20), 0 0 0 3px rgba(120,255,210,.10);
}
.hex.goal .hexInner{
  border-color: rgba(255,211,106,.55);
  box-shadow: inset 0 0 0 1px rgba(255,211,106,.20), 0 0 0 3px rgba(255,211,106,.10);
}
.hex.trigger .hexInner{
  border-color: rgba(255,122,209,.40);
  box-shadow: inset 0 0 0 1px rgba(255,122,209,.18), 0 0 0 3px rgba(255,122,209,.08);
}

/* current layer glow */
.hex.sel{
  filter:
    drop-shadow(0 12px 18px rgba(0,0,0,.40))
    drop-shadow(0 0 14px color-mix(in srgb, var(--hexGlow) 70%, transparent));
}
.hex.reach{
  filter:
    drop-shadow(0 12px 18px rgba(0,0,0,.40))
    drop-shadow(0 0 10px color-mix(in srgb, var(--hexGlow) 55%, transparent));
}
/* =========================================================
   PORTAL TILE FX (uses destination color: --portalC)
   (keeps your existing tile bg / marks / borders)
========================================================= */

.hex.portalUp,
.hex.portalDown{
  --portalC: var(--hexGlow); /* fallback */
}

.hex.portalUp .hexInner .pAura,
.hex.portalDown .hexInner .pAura,
.hex.portalUp .hexInner .pOrbs,
.hex.portalDown .hexInner .pOrbs,
.hex.portalUp .hexInner .pRim,
.hex.portalDown .hexInner .pRim,
.hex.portalUp .hexInner .pOval,
.hex.portalDown .hexInner .pOval{
  position:absolute;
  inset:0;
  pointer-events:none;
  border-radius: 10px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
}



/* glow framing (subtle so your existing look stays) */
.hex.portalUp .hexInner,
.hex.portalDown .hexInner{
  border-color: color-mix(in srgb, var(--portalC) 55%, rgba(255,255,255,.12));
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.35),
    0 0 0 3px color-mix(in srgb, var(--portalC) 16%, transparent),
    0 0 16px color-mix(in srgb, var(--portalC) 22%, transparent);
    z-index: -2;
}

/* aura bloom */
.hex.portalUp .hexInner .pAura,
.hex.portalDown .hexInner .pAura{
  inset:-14%;
  background:
    radial-gradient(circle at 50% 50%,
      color-mix(in srgb, var(--portalC) 70%, transparent),
      transparent 60%);
  filter: blur(14px) saturate(1.15);
  opacity: .95;
  animation: pBreathe 2.6s ease-in-out infinite;
    
}
@keyframes pBreathe{
  0%,100%{ transform: scale(.99); opacity:.75; }
  50%{ transform: scale(1.12); opacity:1; }
}

/* crisp floating orbs (same idea as your demo) */
.hex.portalUp .hexInner .pOrbs,
.hex.portalDown .hexInner .pOrbs{
  inset: 0;
  background:
    radial-gradient(6px 5px at 20% 30%, rgba(255,255,255,0.18), transparent 58%),
    radial-gradient(7px 6px at 35% 22%, color-mix(in srgb, var(--portalC) 35%, transparent), transparent 58%),
    radial-gradient(6px 5px at 55% 18%, rgba(0,255,220,0.18), transparent 58%),
    radial-gradient(7px 6px at 72% 26%, color-mix(in srgb, var(--portalC) 28%, transparent), transparent 58%);
  mix-blend-mode: screen;
  filter: blur(0.25px);
  opacity: .95;
  animation: pOrbs 3.2s ease-in-out infinite;
}
@keyframes pOrbs{
  0%,100%{ transform: translateY(0); opacity:.75; }
  50%{ transform: translateY(-6px); opacity:1; }
}

/* oval + rim twirl (centered on hex) */
.hex.portalUp .hexInner .pOval,
.hex.portalDown .hexInner .pOval,
.hex.portalUp .hexInner .pRim,
.hex.portalDown .hexInner .pRim{
  left:50%;
  top:50%;
  width: 80%;
  height: 46%;
  transform:
    translate(-50%,-50%)
    rotate(-18deg)
    skewX(-10deg)
    perspective(800px)
    rotateX(60deg);
  border-radius: 999px;
}

.hex.portalUp .hexInner .pOval,
.hex.portalDown .hexInner .pOval{
  inset: auto;
  overflow:visible;
  background:
    radial-gradient(circle at 50% 50%,
      rgba(0,0,0,0) 0 38%,
      rgba(0,0,0,0.90) 70%),
    radial-gradient(circle at 45% 50%,
      color-mix(in srgb, var(--portalC) 35%, transparent),
      transparent 65%);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset;
}
.hex.portalUp .hexInner .pOval::before,
.hex.portalDown .hexInner .pOval::before{
  content:"";
  position:absolute;
  inset:-32%;
  background:
    conic-gradient(
      rgba(0,0,0,0) 0 14%,
      color-mix(in srgb, var(--portalC) 95%, transparent) 22%,
      rgba(0,255,220,0.20) 32%,
      rgba(255,80,170,0.12) 44%,
      color-mix(in srgb, var(--portalC) 60%, transparent) 58%,
      rgba(0,0,0,0) 72% 100%);
  mix-blend-mode: screen;
  animation: pSpin 1.25s linear infinite;
}
@keyframes pSpin{ to{ transform: rotate(360deg); } }

.hex.portalUp .hexInner .pRim,
.hex.portalDown .hexInner .pRim{
  inset:auto;
  background:
    conic-gradient(
      transparent 0 18%,
      rgba(255,255,255,0.22) 22%,
      color-mix(in srgb, var(--portalC) 95%, transparent) 32%,
      transparent 55% 100%);
  filter: blur(0.6px);
  mix-blend-mode: screen;
  animation: pRim 1.55s linear infinite;
  
}
@keyframes pRim{
  to{
    transform:
      translate(-50%,-50%)
      rotate(-18deg)
      skewX(-10deg)
      perspective(800px)
      rotateX(60deg)
      rotate(360deg);
  }
}

/* =========================================================
   HEX TEXT / MARKS
========================================================= */
.hexId{
  position:absolute;
  top: 9px;
  left: 9px;
  font-size: 11px;
  color: rgba(255,255,255,.70);
  font-variant-numeric: tabular-nums;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.20);
}
.hexMarks{
  position:absolute;
  right: 9px;
  bottom: 9px;
  display:flex;
  gap: 6px;
  align-items: flex-end;
  z-index: 20;
}
.mark{
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display:grid;
  place-items:center;
  font-weight: 900;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
}
.mark.g{
  border-color: rgba(255,211,106,.35);
  color: rgba(255,211,106,.95);
  background: rgba(255,211,106,.10);
}
.mark.t{
  border-color: rgba(255,122,209,.35);
  color: rgba(255,122,209,.95);
  background: rgba(255,122,209,.10);
}
/* =========================================================
   GHOST GRID (unshifted reference)
========================================================= */
.ghostGrid{
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;           /* behind real hexes (board content is z-index 3+) */
  opacity: 0.35;
}

.ghostRow{
  display: flex;
  height: var(--hexHMain);
  align-items: center;

  /* ✅ this is the centering fix */
  width: fit-content;
  margin: 0 auto;

  position: relative;
}

.ghostSlot{
  width: var(--hexStepX);
  height: var(--hexHMain);
  display: grid;
  place-items: center;
  flex: 0 0 var(--hexStepX);
}

.ghostHex{
  width: var(--hexWMain);
  height: var(--hexHMain);
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  border: 1px dashed rgba(255,255,255,.35);
  background: rgba(0,0,0,.12);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,.25);
}

.ghostText{
  position: absolute;
  font-size: 10px;
  color: rgba(255,255,255,.50);
  transform: translateY(-2px);
}

/* =========================================================
   SPRITE (LARGER)
========================================================= */
.playerSpriteSheet{
  position: absolute;
  left: 50%;
  top: 86%;
  width: calc(var(--frameW) * 1px);
  height: calc(var(--frameH) * 1px);

  --spriteScale: 0.78;  /* medium bigger */
  --footX: -10px;
  --footY: 0px;

  transform:
    translate(calc(-50% + var(--footX)), calc(-100% + var(--footY)))
    scale(var(--spriteScale));
  transform-origin: 50% 100%;

  z-index: 20;
  pointer-events: none;
  image-rendering: pixelated;

  background-image: var(--spriteImg);
  background-repeat: no-repeat;
  background-size:
    calc(var(--frameW) * var(--cols) * 1px)
    calc(var(--frameH) * var(--rows) * 1px);
  background-position:
    calc(var(--frameW) * -1px * var(--frameX))
    calc(var(--frameH) * -1px * var(--frameY));

  filter: drop-shadow(0 10px 18px rgba(0,0,0,.45));
}

/* =========================================================
   SIDEBAR (STATUS + LOG)
========================================================= */
.side{
  display:grid;
  grid-auto-rows: min-content;
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}
.panelMini{
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(10,14,24,.88);
  box-shadow: var(--shadow2);
  backdrop-filter: blur(10px);
}
.miniTitle{
  margin: 0 0 10px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .45px;
  color: rgba(255,255,255,.82);
  font-weight: 900;
}
.miniRow{
  display:flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(255,255,255,.08);
}
.miniRow:last-child{ border-bottom: none; }
.miniRow .k{ color: var(--muted); font-size: 12px; }
.miniRow .v{ font-weight: 900; font-size: 12px; }

.log{ max-height: 340px; overflow:auto; padding-right: 6px; }
.logRow{
  display:grid;
  grid-template-columns: 58px 1fr;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.logRow:last-child{ border-bottom:none; }
.lt{ color: rgba(255,255,255,.55); font-size: 12px; font-variant-numeric: tabular-nums; }
.lm{ font-size: 13px; color: rgba(255,255,255,.88); }
.logRow.ok .lm{ color: rgba(70,249,180,.92); }
.logRow.bad .lm{ color: rgba(255,93,122,.92); }
.logRow.info .lm{ color: rgba(119,168,255,.92); }

/* =========================================================
   DECK CARDS (PINNED TO GUTTERS)
   Continuous layer-colored border + constant inner motion
========================================================= */

.hexDeckOverlay{
  position: absolute;
  inset: 0;
  z-index: 7;
  pointer-events: none;

  --cardGlow: rgba(120,255,210,.65);
  --deckPadX: 14px;
  --deckPadY: 14px;
}

.hexDeckCol{ display: contents; }

/* =========================================================
   BASE CARD
========================================================= */

.hexDeckCard{
  position: absolute;

  width: clamp(187px, 18vw, 286px);
  max-width: max(150px, calc(var(--boardInset) - (var(--deckPadX) * 2)));

  aspect-ratio: 3 / 4;
  border-radius: 22px;
  overflow: hidden;

  isolation: isolate;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;

  border: 1px solid rgba(255,255,255,.18);
  background: linear-gradient(135deg, var(--a), var(--b));
  box-shadow:
    0 18px 48px rgba(0,0,0,.55),
    0 0 0 1px rgba(255,255,255,.06) inset;
}

/* =========================================================
   CARD POSITIONS
========================================================= */

.hexDeckCard.cosmic{
  left: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  top: calc(var(--boardPadTop) + var(--deckPadY));
  transform: translateX(-45%);
}
.hexDeckCard.risk{
  left: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  bottom: calc(var(--boardPadBottom) + var(--deckPadY));
  transform: translateX(-45%);
}
.hexDeckCard.terrain{
  right: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  top: calc(var(--boardPadTop) + var(--deckPadY));
  transform: translateX(45%);
}
.hexDeckCard.shadow{
  right: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  bottom: calc(var(--boardPadBottom) + var(--deckPadY));
  transform: translateX(45%);
}

/* =========================================================
   INNER FX LAYER (ambient motion, seamless loop)
========================================================= */

.hexDeckCard .deckFx{
  position:absolute;
  inset:0;
  border-radius: inherit;
  pointer-events:none;
  overflow:hidden;
  transform: translateZ(0);
}

/* static glow + pattern */
.hexDeckCard .deckFx::before{
  content:"";
  position:absolute;
  inset:0;
  border-radius: inherit;

  background:
    radial-gradient(120% 90% at 40% 20%,
      color-mix(in srgb, var(--a) 35%, white 10%),
      transparent 60%),
    radial-gradient(90% 70% at 70% 80%,
      color-mix(in srgb, var(--b) 35%, white 6%),
      transparent 60%),
    linear-gradient(90deg, rgba(255,255,255,.10) 1px, transparent 1px) 0 0 / 18px 16px,
    linear-gradient(30deg, rgba(0,0,0,.20) 1px, transparent 1px) 0 0 / 18px 16px,
    linear-gradient(150deg, rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 18px 16px;

  opacity: .55;
  mix-blend-mode: overlay;
}

/* constant inner movement (no visible loop reset) */
@keyframes deckInnerDrift{
  from { transform: translate3d(-90%,-90%,0) rotate(0deg); }
  to   { transform: translate3d( 90%, 90%,0) rotate(360deg); }
}

.hexDeckCard .deckFx::after{
  content:"";
  position:absolute;
  inset:-25%;
  border-radius: inherit;

  background:
    repeating-linear-gradient(
      115deg,
      rgba(255,255,255,0) 0px,
      rgba(255,255,255,0) 10px,
      rgba(255,255,255,.18) 14px,
      rgba(255,255,255,0) 18px
    ),
    repeating-linear-gradient(
      25deg,
      rgba(0,0,0,0) 0px,
      rgba(0,0,0,0) 12px,
      color-mix(in srgb, var(--b) 25%, transparent) 16px,
      rgba(0,0,0,0) 22px
    );

  background-size: 180% 180%;
  opacity: .38;
  mix-blend-mode: screen;

  will-change: transform;
  animation: deckInnerDrift 8s linear infinite;
}

/* =========================================================
   FULL 360° LAYER-COLORED BORDER (continuous loop)
========================================================= */

@property --spin {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes deckBorderSpin{
  to { --spin: 360deg; }
}

@keyframes deckBorderBreath{
  0%,100%{
    opacity:.95;
    filter: drop-shadow(0 0 10px var(--cardGlow));
  }
  50%{
    opacity:1;
    filter: drop-shadow(0 0 16px var(--cardGlow));
  }
}

.hexDeckCard::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius: inherit;
  padding: 2px;
  pointer-events:none;

  background:
    conic-gradient(
      from var(--spin),
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 0deg,
      color-mix(in srgb, var(--cardGlow) 65%, rgba(255,255,255,.10)) 90deg,
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 180deg,
      color-mix(in srgb, var(--cardGlow) 65%, rgba(255,255,255,.10)) 270deg,
      color-mix(in srgb, var(--cardGlow) 95%, rgba(255,255,255,.15)) 360deg
    );

  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;

  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;

  animation:
    deckBorderSpin 2.8s linear infinite,
    deckBorderBreath 1.35s ease-in-out infinite;
}

/* =========================================================
   CARD THEMES
========================================================= */

.hexDeckCard.cosmic  { --a:#0C1026; --b:#1A1F4A; }
.hexDeckCard.risk    { --a:#12090A; --b:#6E0F1B; }
.hexDeckCard.terrain { --a:#0E3B2E; --b:#1FA88A; }
.hexDeckCard.shadow  { --a:#1B1B1E; --b:#2A1E3F; }

@media (prefers-reduced-motion: reduce){
  .hexDeckCard::after,
  .hexDeckCard .deckFx::after{
    animation:none !important;
  }
}


/* =========================================================
   OVERLAY / ENCOUNTER
========================================================= */
.overlay{
  position:absolute;
  inset:0;
  z-index: 50;
  display:grid;
  place-items: center;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(8px);
}
.overlayCard{
  width: min(560px, 92vw);
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(10,14,24,.92);
  box-shadow: 0 24px 70px rgba(0,0,0,.55);
  padding: 16px;
}
.overlayTitle{
  font-size: 16px;
  font-weight: 1000;
  letter-spacing: .35px;
  text-transform: uppercase;
}
.overlaySub{
  margin-top: 8px;
  color: rgba(255,255,255,.78);
  font-size: 13px;
  line-height: 1.35;
}
.villainBox{
  margin-top: 14px;
  display:grid;
  grid-template-columns: 120px 1fr;
  gap: 14px;
  align-items:center;
  padding: 0;
  border: none;
  background: transparent;
}
.villainImg{
  width: 120px;
  height: 120px;
  border-radius: 16px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,.12);
  box-shadow: 0 14px 40px rgba(0,0,0,.35);
  background: rgba(0,0,0,.25);
}
.villainMeta{ display:grid; gap: 10px; }
.layerFxOverlay{
  position: absolute;
  inset: 0;
  z-index: 999;               /* higher than board + pieces */
  pointer-events: auto;       /* blocks clicks */
  display: grid;
  place-items: center;
  overflow: hidden;
}

/* Flash */
.layerFxOverlay::before{
  content: "";
  position: absolute;
  inset: -20%;
  background: var(--layerFxColor, rgba(255,255,255,.35));
  animation: layerFlash 3s ease-out forwards;
}

/* Center textbox */
.layerFxCard{
  position: relative;
  z-index: 1;
  padding: 18px 22px;
  border-radius: 16px;
  background: rgba(10,12,18,.72);
  border: 1px solid rgba(255,255,255,.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 18px 60px rgba(0,0,0,.45);
  animation: layerCardPop 3s ease-out forwards;
}

.layerFxTitle{
  font-size: 22px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(255,255,255,.92);
}

@keyframes layerFlash{
  0%   { opacity: 0; transform: scale(1.02); }
  8%   { opacity: 1; }
  55%  { opacity: .65; }
  100% { opacity: 0; transform: scale(1.06); }
}

@keyframes layerCardPop{
  0%   { opacity: 0; transform: translateY(10px) scale(.98); }
  10%  { opacity: 1; transform: translateY(0) scale(1); }
  70%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(-6px) scale(.99); }
}

/* =========================================================
   SCROLLBARS
========================================================= */
*::-webkit-scrollbar{ width: 10px; height: 10px; }
*::-webkit-scrollbar-thumb{
  background: rgba(255,255,255,.12);
  border-radius: 999px;
  border: 2px solid rgba(0,0,0,.25);
}
*::-webkit-scrollbar-thumb:hover{ background: rgba(255,255,255,.18); }
*::-webkit-scrollbar-corner{ background: transparent; }

@media (max-width: 980px){
  body{ overflow:auto; }
  .gameLayout{ grid-template-columns: 1fr; height:auto; }
  .barWrap{ display:none; }
  .side{ order: 10; }
  .board{ width: min(var(--boardW), 96vw); }
}

`;
  
/* =========================================================
   App
========================================================= */

export default function App() {
  /* =========================
     Navigation / overlays
  ========================= */
  const [screen, setScreen] = useState<Screen>("start");

  const [villainTriggers, setVillainTriggers] = useState<VillainTrigger[]>([]);
  const [encounter, setEncounter] = useState<Encounter>(null);
  const pendingEncounterMoveIdRef = useRef<string | null>(null);
  const encounterActive = !!encounter;

  /* =========================
     Worlds
  ========================= */
  const [worlds, setWorlds] = useState<WorldEntry[]>([]);
  const [worldId, setWorldId] = useState<string | null>(null);

  const world = useMemo(
    () => worlds.find((w) => w.id === worldId) ?? null,
    [worlds, worldId]
  );

  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenarioEntry = useMemo(
    () => world?.scenarios.find((s) => s.id === scenarioId) ?? null,
    [world, scenarioId]
  );

  const [trackId, setTrackId] = useState<string | null>(null);
  const trackEntry = useMemo(() => {
    const tracks = scenarioEntry?.tracks;
    if (!tracks || tracks.length <= 0) return null;
    return tracks.find((t) => t.id === trackId) ?? null;
  }, [scenarioEntry, trackId]);

  useEffect(() => {
    setWorlds(loadWorlds());
  }, []);

  /* =========================
     Player selection (optional)
  ========================= */
  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);

  /* =========================
     Core game state
  ========================= */
  const [state, setState] = useState<GameState | null>(null);
  const [uiTick, forceRender] = useState(0);

  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [scenarioLayerCount, setScenarioLayerCount] = useState<number>(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startHexId, setStartHexId] = useState<string | null>(null);

  const [showGhost, setShowGhost] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const playerBtnRef = useRef<HTMLButtonElement | null>(null);
  // ✅ used by "Quick start (debug)" + auto-start effect
  const pendingQuickStartRef = useRef(false);

  /* =========================
     Per-layer move counters (for shifting)
  ========================= */
  const [layerMoves, setLayerMoves] = useState<Record<number, number>>({});
  const [layerMoveArmed, setLayerMoveArmed] = useState<Record<number, boolean>>(
    {}
  );

  const getLayerMoves = useCallback(
    (layer: number) => {
      const n = layerMoves[layer];
      return Number.isFinite(n) ? (n as number) : 0;
    },
    [layerMoves]
  );

  /* =========================
     Layer flash overlay
  ========================= */
  const [layerFx, setLayerFx] = useState<null | { key: number; layer: number }>(
    null
  );
  const layerFxTimerRef = useRef<number | null>(null);

  const triggerLayerFx = useCallback((layer: number) => {
    if (layerFxTimerRef.current) window.clearTimeout(layerFxTimerRef.current);

    const key = Date.now();
    setLayerFx({ key, layer });

    layerFxTimerRef.current = window.setTimeout(() => {
      setLayerFx(null);
      layerFxTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (layerFxTimerRef.current) window.clearTimeout(layerFxTimerRef.current);
    };
  }, []);

  const layerFxStyle = useMemo(() => {
    if (!layerFx) return {} as React.CSSProperties;
    return {
      ["--layerFxColor" as any]: layerCssVar(layerFx.layer),
    } as React.CSSProperties;
  }, [layerFx]);

  /* =========================
     Player id / coord
  ========================= */
  const playerId = useMemo(() => {
    const pid = (state as any)?.playerHexId;
    return typeof pid === "string" ? pid : null;
  }, [state, uiTick]);

  const playerCoord = useMemo(() => {
    return playerId ? idToCoord(playerId) : null;
  }, [playerId]);

  const playerLayer = playerCoord?.layer ?? null;

  /* =========================
     Reset
  ========================= */
  const resetAll = useCallback(() => {
    setEncounter(null);
    pendingEncounterMoveIdRef.current = null;

    setVillainTriggers([]);
    setChosenPlayer(null);

    setWorldId(null);
    setScenarioId(null);
    setTrackId(null);

    setState(null);
    setUiTickSafe(forceRender);

    setCurrentLayer(1);
    setScenarioLayerCount(1);
    setSelectedId(null);
    setStartHexId(null);

    setMovesTaken(0);
    setLayerMoves({});
    setLayerMoveArmed({});

    setGoalId(null);
    setOptimalAtStart(null);
    setOptimalFromNow(null);

    logNRef.current = 0;
    setLog([]);

    setItems([
      { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
      { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
      { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
    ]);

    setLayerFx(null);
    setScreen("start");
  }, []);

  function setUiTickSafe(setter: React.Dispatch<React.SetStateAction<number>>) {
    setter((n) => n + 1);
  }
  // ---------------------------
  // Villain trigger lookup
  // ---------------------------
  const findTriggerForHex = useCallback(
    (id: string): VillainKey | null => {
      const c = idToCoord(id);
      if (!c) return null;

      for (const v of villainTriggers) {
        if (v.layer !== c.layer) continue;
        if (v.row !== c.row) continue;

        // cols: "any" OR list
        if (v.cols === "any" || !v.cols) return v.key;
        if (Array.isArray(v.cols) && v.cols.includes(c.col)) return v.key;
      }

      return null;
    },
    [villainTriggers]
  );

  /* =========================
     Render helpers/components (INSIDE App)
     ✅ AFTER playerId exists
  ========================= */

  const isPlayerHere = useCallback(
    (id: string) => {
      return !!playerId && playerId === id;
    },
    [playerId]
  );

function SideBar(props: { side: "left" | "right"; currentLayer: number }) {
  const side = props.side;
  const currentLayerLocal = props.currentLayer;

  // RIGHT BAR: keep your existing layer indicator (7..1)
if (side === "right") {
  const segments = [7, 6, 5, 4, 3, 2, 1];

  // goal layer from goalId like "L2-R1-C4"
  const goalLayer = goalId ? idToCoord(goalId)?.layer ?? null : null;

  // top position (center of that segment)
  // segments are 7 blocks tall, each is --hexHMain
  const goalTopPx =
    goalLayer && goalLayer >= 1 && goalLayer <= 7
      ? ((7 - goalLayer) * readPxVar(document.documentElement as any, "--hexHMain", 84)) +
        readPxVar(document.documentElement as any, "--hexHMain", 84) / 2
      : null;

  return (
    <div className="barWrap barRight">
      <div className="layerBar">
        {segments.map((layerVal) => {
          const active = layerVal === currentLayerLocal;
          return (
            <div
              key={layerVal}
              className={"barSeg" + (active ? " isActive" : "")}
              data-layer={layerVal}
            />
          );
        })}

        {/* ✅ GOAL MARKER */}
        {goalTopPx !== null ? (
          <div className="goalMarker" style={{ top: goalTopPx }}>
            G
          </div>
        ) : null}
      </div>
    </div>
  );
}


  // LEFT BAR: show row shifts for the CURRENT layer (r0..r6)
  return (
    <div className="barWrap barLeft">
      <div className="layerBar rowShiftBar">
        {rows.map((r) => {
          const cols = ROW_LENS[r] ?? 7;

          const engineShiftRaw =
            (viewState as any)?.rowShifts?.[currentLayerLocal]?.[r] ??
            (viewState as any)?.rowShifts?.["L" + currentLayerLocal]?.[r];

          const engineShift = Number(engineShiftRaw ?? 0);

          const rawShift =
            Number.isFinite(engineShift) && engineShift !== 0
              ? engineShift
              : derivedRowShiftUnits(
                  viewState as any,
                  currentLayerLocal,
                  r,
                  getLayerMoves(currentLayerLocal)
                );

          const ns = normalizeRowShift(rawShift, cols);
          const shift = ns.visual; // signed, small (-3..3 etc)

          // ✅ label rules: -1 => L1, +1 => R1, 0 => show nothing
          const label =
            shift === 0 ? "" : shift < 0 ? "L" + Math.abs(shift) : "R" + shift;

          return (
            <div key={"rowSeg-" + r} className="barSeg rowSeg">
              {label ? <span className="rowShiftLabel">{label}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}


  function HexDeckCardsOverlay(props: { glowVar: string }) {
    const overlayStyle = {
      ["--cardGlow" as any]: props.glowVar,
    } as React.CSSProperties;

    return (
      <div className="hexDeckOverlay" style={overlayStyle}>
        <div className="hexDeckCol left">
          <div className="hexDeckCard cosmic ccw slow">
            <div className="deckFx" />
          </div>
          <div className="hexDeckCard risk ccw fast">
            <div className="deckFx" />
          </div>
        </div>

        <div className="hexDeckCol right">
          <div className="hexDeckCard terrain cw slow">
            <div className="deckFx" />
          </div>
          <div className="hexDeckCard shadow cw fast">
            <div className="deckFx" />
          </div>
        </div>
      </div>
    );
  }

  /* =========================
     Moves / optimal / log
     ✅ MUST be before reachable (reachable depends on per-layer moves)
  ========================= */

  const [movesTaken, setMovesTaken] = useState(0);

  const [goalId, setGoalId] = useState<string | null>(null);
  const [optimalAtStart, setOptimalAtStart] = useState<number | null>(null);
  const [optimalFromNow, setOptimalFromNow] = useState<number | null>(null);

  const computeOptimalFromReachMap = useCallback((rm: any, gid: string | null) => {
    if (!gid || !rm) return null;

    if (typeof rm?.get === "function") {
      const info = rm.get(gid);
      return info?.reachable ? (info.distance as number) : null;
    }

    const info = rm[gid];
    return info?.reachable ? (info.distance as number) : null;
  }, []);

  const [log, setLog] = useState<LogEntry[]>([]);
  const logNRef = useRef(0);

  const pushLog = useCallback((msg: string, kind: LogEntry["kind"] = "info") => {
    logNRef.current += 1;
    const e: LogEntry = { n: logNRef.current, t: nowHHMM(), msg, kind };
    setLog((prev) => [e, ...prev].slice(0, 24));
  }, []);

  const rows = useMemo(() => {
    return Array.from({ length: ROW_LENS.length }, (_, i) => i);
  }, []);

  const viewState = useMemo(() => {
    if (!state) return null;

    const rs = (state as any).rowShifts;
    let hasEngineShift = false;

    if (rs && typeof rs === "object") {
      for (const k of Object.keys(rs)) {
        const rowsObj = rs[k];
        if (!rowsObj || typeof rowsObj !== "object") continue;
        for (const rKey of Object.keys(rowsObj)) {
          const n = Number(rowsObj[rKey]);
          if (Number.isFinite(n) && n !== 0) {
            hasEngineShift = true;
            break;
          }
        }
        if (hasEngineShift) break;
      }
    }

    if (hasEngineShift) return state;

    const injected: any = { ...(state as any) };
    const rowShifts: any = {};

    for (let layer = 1; layer <= scenarioLayerCount; layer++) {
      const perRow: any = {};
      const mL = getLayerMoves(layer);

      for (let r = 0; r < ROW_LENS.length; r++) {
        perRow[r] = derivedRowShiftUnits(state as any, layer, r, mL);
      }

      rowShifts[layer] = perRow;
      rowShifts["L" + layer] = perRow;
    }

    injected.rowShifts = rowShifts;
    return injected as any;
  }, [state, scenarioLayerCount, getLayerMoves, layerMoves, layerMoveArmed]);

  /* =========================
     Reachability (1-step neighbors)
  ========================= */

  const reachable = useMemo(() => {
    const set = new Set<string>();
    if (!viewState) return set;
    if (!playerId) return set;

    // only compute when viewing the player's layer
    if (playerLayer !== currentLayer) return set;

    const nbs = getShiftedNeighborsSameLayer(
      viewState as any,
      playerId,
      getLayerMoves(playerLayer ?? currentLayer)
    );

    for (const nbId of nbs) {
      const hex = getHexFromState(viewState as any, nbId) as any;
      const bm = isBlockedOrMissing(hex);
      if (!bm.missing && !bm.blocked) set.add(nbId);
    }

    return set;
  }, [viewState, playerId, playerLayer, currentLayer, getLayerMoves]);

  /* =========================
     Theme / assets
  ========================= */

  const activeTheme = scenarioEntry?.theme ?? null;
  const palette = activeTheme?.palette ?? null;

  const GAME__URL = activeTheme?.assets.backgroundGame ?? "";

  // ✅ ABSOLUTELY NO TEMPLATE LITERALS
  const backgroundLayers: any =
    (activeTheme && activeTheme.assets && activeTheme.assets.backgroundLayers) || {};
  const BOARD_LAYER_ = backgroundLayers["L" + currentLayer] || "";

  const DICE_FACES_BASE = activeTheme?.assets.diceFacesBase ?? "images/dice";
  const DICE_BORDER_IMG = activeTheme?.assets.diceCornerBorder ?? "";
  const VILLAINS_BASE = activeTheme?.assets.villainsBase ?? "images/villains";
  const HEX_TILE = activeTheme?.assets.hexTile ?? "";

  const themeVars = useMemo(() => {
    const p = palette;
    return {
      ["--L1" as any]: p?.L1 ?? "#19ffb4",
      ["--L2" as any]: p?.L2 ?? "#67a5ff",
      ["--L3" as any]: p?.L3 ?? "#ffd36a",
      ["--L4" as any]: p?.L4 ?? "#ff7ad1",
      ["--L5" as any]: p?.L5 ?? "#a1ff5a",
      ["--L6" as any]: p?.L6 ?? "#a58bff",
      ["--L7" as any]: p?.L7 ?? "#ff5d7a",
    } as React.CSSProperties;
  }, [palette]);

  function diceImg(n: number) {
    return toPublicUrl(DICE_FACES_BASE + "/D20_" + n + ".png");
  }

  function villainImg(key: VillainKey) {
    return toPublicUrl(VILLAINS_BASE + "/" + key + ".png");
  }

  /* =========================
     Sprite
  ========================= */

  type Facing = "down" | "up" | "left" | "right";

  const [playerFacing, setPlayerFacing] = useState<Facing>("down");
  const [isWalking, setIsWalking] = useState(false);

  const SPRITE_COLS = 4;
  const SPRITE_ROWS = 5;

  const FRAME_W = 128;
  const FRAME_H = 128;

  function spriteSheetUrl() {
    return toPublicUrl("images/players/sprite_sheet_20.png");
  }

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const [walkFrame, setWalkFrame] = useState(0);

  const WALK_FPS = 10;
  const IDLE_FPS = 4;

  useEffect(() => {
    const fps = isWalking ? WALK_FPS : IDLE_FPS;
    const frameDuration = 1000 / fps;

    lastRef.current = performance.now();

    const tick = (t: number) => {
      if (t - lastRef.current >= frameDuration) {
        setWalkFrame((f) => (f + 1) % SPRITE_COLS);
        lastRef.current = t;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isWalking]);

  const walkTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (walkTimer.current) window.clearTimeout(walkTimer.current);
    };
  }, []);

  function facingRow(f: Facing) {
    return f === "down" ? 0 : f === "left" ? 1 : f === "right" ? 2 : 3;
  }


 /* =========================
   Dice
========================= */

const [diceValue, setDiceValue] = useState<number>(2);
const [diceRolling, setDiceRolling] = useState(false);
const [diceRot, setDiceRot] = useState<{ x: number; y: number }>({
  x: 0,
  y: 0,
});
const diceTimer = useRef<number | null>(null);

// ✅ IMPORTANT: always remember the *final* roll value (not the flickers)
const lastRollValueRef = useRef<number>(2);

useEffect(() => {
  return () => {
    if (diceTimer.current) window.clearTimeout(diceTimer.current);
  };
}, []);

function rotForRoll(n: number) {
  switch (n) {
    case 1:
      return { x: -90, y: 0 };
    case 2:
      return { x: 0, y: 0 };
    case 3:
      return { x: 0, y: -90 };
    case 4:
      return { x: 0, y: 90 };
    case 5:
      return { x: 0, y: 180 };
    case 6:
      return { x: 90, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

const rollDice = useCallback(() => {
  if (diceRolling) return;

  setDiceRolling(true);

  const start = performance.now();
  const duration = 650;

  const tick = () => {
    const elapsed = performance.now() - start;

    // flicker values during roll
    const flicker = 1 + Math.floor(Math.random() * 6);
    setDiceValue(flicker);
    setDiceRot(rotForRoll(flicker));

    if (elapsed < duration) {
      diceTimer.current = window.setTimeout(tick, 55);
    } else {
      // ✅ final value
      const final = 1 + Math.floor(Math.random() * 6);

      lastRollValueRef.current = final; // ✅ use this in encounter resolution
      setDiceValue(final);
      setDiceRot(rotForRoll(final));

      setDiceRolling(false);
    }
  };

  tick();
}, [diceRolling]);


  /* =========================
     Reveal helpers
  ========================= */

  const revealWholeLayer = useCallback((st: GameState, layer: number) => {
    for (let r = 0; r < ROW_LENS.length; r++) {
      const len = ROW_LENS[r] ?? 7;
      for (let c = 0; c < len; c++) {
        revealHex(st, "L" + layer + "-R" + r + "-C" + c);
      }
    }
  }, []);

  const revealRing = useCallback((st: GameState, centerId: string) => {
    revealHex(st, centerId);

    let nbs: string[] = [];
    try {
      nbs = (neighborIdsSameLayer as any)(st, centerId) as string[];
    } catch {
      try {
        nbs = (neighborIdsSameLayer as any)(centerId) as string[];
      } catch {
        nbs = [];
      }
    }
    for (const nbId of nbs) revealHex(st, nbId);
  }, []);

  /* =========================
     Items
  ========================= */

  type ItemId = "reroll" | "revealRing" | "peek";
  type Item = { id: ItemId; name: string; icon: string; charges: number };

  const [items, setItems] = useState<Item[]>([
    { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
    { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
    { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
  ]);

  const useItem = useCallback(
    (id: ItemId) => {
      const it = items.find((x) => x.id === id);
      if (!it || it.charges <= 0) return;

      setItems((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, charges: Math.max(0, x.charges - 1) } : x
        )
      );

      if (id === "reroll") {
        rollDice();
        pushLog("Reroll used — rolling…", "info");
        return;
      }

      if (!state) return;
      const pid = (state as any).playerHexId ?? null;
      if (!pid) return;

      if (id === "revealRing") {
        revealRing(state, pid);
        forceRender((n) => n + 1);
        pushLog("Used: Reveal (ring)", "ok");
        return;
      }

      if (id === "peek") {
        const up = Math.min(scenarioLayerCount, currentLayer + 1);
        const dn = Math.max(1, currentLayer - 1);

        const upId = pid.replace(/^L\d+-/, "L" + up + "-");
        const dnId = pid.replace(/^L\d+-/, "L" + dn + "-");

        revealRing(state, upId);
        revealRing(state, dnId);

        forceRender((n) => n + 1);
        pushLog("Used: Peek (above/below ring)", "info");
        return;
      }
    },
    [items, rollDice, pushLog, state, revealRing, scenarioLayerCount, currentLayer]
  );

/* =========================
   Encounter resolution  ✅ FIXED (uses lastRollValueRef)
========================= */

const prevRollingRef = useRef(false);

useEffect(() => {
  const wasRolling = prevRollingRef.current;
  prevRollingRef.current = diceRolling;

  // Only resolve when an encounter is active AND a roll just finished
  if (!encounter) return;
  if (diceRolling) return;
  if (!wasRolling) return;

  try {
    // increment tries each finished roll
    setEncounter((e) => (e ? { ...e, tries: e.tries + 1 } : e));

    // ✅ only succeed on the FINAL roll result (not a stale diceValue)
    const rolled = lastRollValueRef.current;
    if (rolled !== 6) return;

    const targetId = pendingEncounterMoveIdRef.current;
    if (!targetId) {
      pushLog("Encounter error: missing pending move target.", "bad");
      return;
    }

    // IMPORTANT: use viewState (matches what the UI shows)
    if (!viewState) {
      pushLog("Encounter error: viewState missing.", "bad");
      return;
    }

    // Guard: pending tile might now be invalid (blocked/missing) after shifts
    const pendingHex = getHexFromState(viewState as any, targetId) as any;
    if (!pendingHex || pendingHex.missing || pendingHex.blocked) {
      pushLog("Encounter target is invalid now — click another tile.", "bad");
      pendingEncounterMoveIdRef.current = null; // prevents deadlock
      return;
    }

    const pidBefore = (viewState as any)?.playerHexId as string | null;

    // ✅ Use viewState here (NOT state)
    const res: any = tryMove(viewState as any, targetId);
    const nextState = unwrapNextState(res);

    if (!nextState) {
      const msg =
        (res &&
          typeof res === "object" &&
          "reason" in res &&
          String((res as any).reason)) ||
        "Move failed after rolling a 6 — click another tile and roll again.";

      pushLog(msg, "bad");

      // Clear target so player can choose a new one while encounter stays open
      pendingEncounterMoveIdRef.current = null;

      return;
    }

    const pidAfter = (nextState as any).playerHexId as string | null;

    // close encounter ONLY after we know we have a valid nextState
    pendingEncounterMoveIdRef.current = null;
    setEncounter(null);

    // walking / facing
    const moved = !!pidBefore && !!pidAfter && pidAfter !== pidBefore;
    if (moved) {
      setIsWalking(true);
      if (walkTimer.current) window.clearTimeout(walkTimer.current);
      walkTimer.current = window.setTimeout(() => setIsWalking(false), 420);

      const fromLayer =
        (pidBefore ? idToCoord(pidBefore)?.layer : currentLayer) ?? currentLayer;

      setPlayerFacing(
        facingFromMoveVisual(
          viewState as any,
          pidBefore,
          pidAfter,
          fromLayer,
          getLayerMoves(fromLayer)
        )
      );
    }

    setMovesTaken((n) => n + 1);

    setState(nextState);
    forceRender((n) => n + 1);

    const c2 = pidAfter ? idToCoord(pidAfter) : null;
    const nextLayer = c2?.layer ?? currentLayer;

    if (Number.isFinite(nextLayer)) {
      enterLayer(nextState, nextLayer);

      if (nextLayer !== currentLayer) {
        setCurrentLayer(nextLayer);
        revealWholeLayer(nextState, nextLayer);
      }
    }

    const rm = getReachability(nextState) as any;
    setOptimalFromNow(computeOptimalFromReachMap(rm, goalId));

    pushLog("Encounter cleared — moved to " + (pidAfter ?? targetId), "ok");
    if (goalId && pidAfter && pidAfter === goalId) pushLog("Goal reached!", "ok");
  } catch (err: any) {
    console.error("Encounter resolution crashed:", err);
    pushLog("Encounter crashed: " + String(err?.message ?? err), "bad");
    // keep encounter open so player can retry
  }
}, [
  encounter,
  diceRolling,
  viewState,
  diceValue, // ok to leave; not relied on for success anymore
  currentLayer,
  goalId,
  revealWholeLayer,
  computeOptimalFromReachMap,
  pushLog,
  getLayerMoves,
]);
// ---------------------------
// Villain triggers parser
// ---------------------------
function parseVillainsFromScenario(s: any): VillainTrigger[] {
  const src =
    (Array.isArray(s?.villains) && s.villains) ||
    (Array.isArray(s?.villainTriggers) && s.villainTriggers) ||
    (Array.isArray(s?.encounters) && s.encounters) ||
    (Array.isArray(s?.triggers) && s.triggers) ||
    [];

  const allowed: VillainKey[] = ["bad1", "bad2", "bad3", "bad4"];
  const out: VillainTrigger[] = [];

  // If the data looks 1-based, convert to 0-based.
  const toZeroBasedRow = (r: number) => (r >= 1 && r <= 7 ? r - 1 : r);
  const toZeroBasedCol = (c: number) => (c >= 1 && c <= 7 ? c - 1 : c);

  for (const raw of src) {
    if (!raw || typeof raw !== "object") continue;

    // allow nesting: { from:{layer,row,col}, key:"bad1" }
    const base = raw.from && typeof raw.from === "object" ? raw.from : raw;

    const keyRaw = String(raw.key ?? raw.villainKey ?? raw.id ?? base.key ?? "bad1");
    const key = (allowed.includes(keyRaw as any) ? keyRaw : "bad1") as VillainKey;

    const layer = Number(base.layer ?? base.L ?? raw.layer ?? raw.L ?? 1);

    let row = Number(base.row ?? base.r ?? raw.row ?? raw.r ?? 0);
    row = toZeroBasedRow(row);

    // cols can be: "any" OR number[] OR single number
    let cols: "any" | number[] | undefined = undefined;
    const c = base.cols ?? base.col ?? base.c ?? raw.cols ?? raw.col ?? raw.c;

    if (c === "any") {
      cols = "any";
    } else if (Array.isArray(c)) {
      cols = c
        .map((n: any) => toZeroBasedCol(Number(n)))
        .filter((n: any) => Number.isFinite(n));
    } else if (Number.isFinite(Number(c))) {
      cols = [toZeroBasedCol(Number(c))];
    }

    if (!Number.isFinite(layer) || !Number.isFinite(row)) continue;

    out.push({ key, layer, row, cols });
  }

  return out;
}

/* =========================
   Start scenario
========================= */

const startScenario = useCallback(async () => {
  if (!scenarioEntry) return;

  const tracks = scenarioEntry.tracks ?? [];
  const hasTracks = tracks.length > 1;
  const chosenJson = hasTracks
    ? trackEntry?.scenarioJson ?? scenarioEntry.scenarioJson
    : scenarioEntry.scenarioJson;

  // ✅ load FIRST
  const s = (await loadScenario(chosenJson)) as any;

  // ✅ then parse + log
  const vts = parseVillainsFromScenario(s);
  setVillainTriggers(vts);
  pushLog("Villain triggers loaded: " + vts.length, "info");

    setVillainTriggers(parseVillainsFromScenario(s));
    setEncounter(null);
    pendingEncounterMoveIdRef.current = null;

    const st = newGame(s);

    const layerCount = Math.max(1, Number(s?.layers ?? 1));
    setScenarioLayerCount(layerCount);

    let pid = (st as any).playerHexId as string | null;
    let layer = pid ? idToCoord(pid)?.layer ?? 1 : 1;
    layer = Math.max(1, Math.min(layerCount, layer));

    if (!pid || !/^L\d+-R\d+-C\d+$/.test(pid)) {
      pid = findFirstPlayableHexId(st, layer);
      (st as any).playerHexId = pid;
    }

    const pidCoord = idToCoord(pid);
    if (pidCoord) layer = Math.max(1, Math.min(layerCount, pidCoord.layer));

    const gid = findGoalId(s, layer);
    setGoalId(gid);

    enterLayer(st, layer);
    revealWholeLayer(st, layer);

    const rm = getReachability(st) as any;

    setState(st);
    setSelectedId(pid);
    setStartHexId(pid);
    setCurrentLayer(layer);
    setPlayerFacing("down");

    setMovesTaken(0);

    const initMoves: Record<number, number> = {};
    const initArmed: Record<number, boolean> = {};
    for (let L = 1; L <= layerCount; L++) {
      initMoves[L] = 0;
      initArmed[L] = L === layer;
    }
    setLayerMoves(initMoves);
    setLayerMoveArmed(initArmed);

    setOptimalAtStart(computeOptimalFromReachMap(rm, gid));
    setOptimalFromNow(computeOptimalFromReachMap(rm, gid));

    logNRef.current = 0;
    setLog([]);
    pushLog("Started: " + scenarioEntry.name, "ok");
    if (pid) pushLog("Start: " + pid, "info");
    if (gid) pushLog("Goal: " + gid, "info");

    setItems([
      { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
      { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
      { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
    ]);

    window.setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    }, 0);

    setScreen("game");
  }, [
    scenarioEntry,
    trackEntry,
    parseVillainsFromScenario,
    revealWholeLayer,
    computeOptimalFromReachMap,
    pushLog,
  ]);

  useEffect(() => {
    if (pendingQuickStartRef.current && scenarioEntry) {
      pendingQuickStartRef.current = false;
      startScenario();
    }
  }, [scenarioEntry, startScenario]);

  /* =========================
     Movement
  ========================= */

  const tryMoveToId = useCallback(
    (id: string) => {
      if (!state) return;
      if (encounterActive) return;

      // if viewing another layer, snap back
      if (playerLayer && currentLayer !== playerLayer) {
        setCurrentLayer(playerLayer);
        enterLayer(state, playerLayer);
        revealWholeLayer(state, playerLayer);
        forceRender((n) => n + 1);
        pushLog(
          "You were viewing layer " +
            currentLayer +
            " but the player is on layer " +
            playerLayer +
            " — switched back.",
          "info"
        );
        return;
      }

      const hex = getHexFromState(state, id) as any;
      const bm = isBlockedOrMissing(hex);
      if (bm.missing) {
        pushLog("Missing tile.", "bad");
        return;
      }
      if (bm.blocked) {
        pushLog("Blocked tile.", "bad");
        return;
      }

      const pidBefore = (state as any)?.playerHexId as string | null;

      // encounters block movement until you roll a 6
      const vk = findTriggerForHex(id);
      if (vk) {
        pendingEncounterMoveIdRef.current = id;
        setEncounter((prev) =>
          prev ? { ...prev, villainKey: vk } : { villainKey: vk, tries: 0 }
        );
        pushLog("Encounter: " + vk + " — roll a 6 to continue", "bad");
        return;
      }

      const res: any = tryMove(viewState as any, id);
      let nextState = unwrapNextState(res);

      // TEMP fallback: if engine rejects but UI says reachable, force move
      if (!nextState) {
        if (reachable.has(id) && viewState) {
          const forced: any = { ...(viewState as any) };

    function findPortalTransition(
  transitions: any[] | undefined,
  id: string
): null | { type: "UP" | "DOWN"; to: { layer: number; row: number; col: number } } {
  if (!transitions) return null;

  const c = idToCoord(id);
  if (!c) return null;

  for (const t of transitions) {
    const from = t?.from;
    if (!from) continue;

    if (
      Number(from.layer) === c.layer &&
      Number(from.row) === c.row &&
      Number(from.col) === c.col
    ) {
      const type = t?.type === "DOWN" ? "DOWN" : "UP";
      const to = t?.to;

      // ✅ If scenario provides "to", use it. Otherwise fallback to straight up/down.
      if (to && typeof to === "object") {
        return {
          type,
          to: {
            layer: Number(to.layer),
            row: Number(to.row),
            col: Number(to.col),
          },
        };
      }

      const fallbackLayer = type === "UP" ? c.layer + 1 : c.layer - 1;
      return { type, to: { layer: fallbackLayer, row: c.row, col: c.col } };
    }
  }

  return null;
}


          nextState = forced as any;
          pushLog("Force-moved (engine rejected)", "info");
        } else {
          const msg =
            (res &&
              typeof res === "object" &&
              "reason" in res &&
              String((res as any).reason)) ||
            "Move failed.";
          pushLog(msg, "bad");
          return;
        }
      }

      const pidAfter = (nextState as any).playerHexId as string | null;

      const fromLayer =
        (pidBefore ? idToCoord(pidBefore)?.layer : currentLayer) ?? currentLayer;

      const toLayer = pidAfter ? idToCoord(pidAfter)?.layer ?? null : null;

      const moved = !!pidBefore && !!pidAfter && pidAfter !== pidBefore;

      setMovesTaken((n) => n + 1);

      if (fromLayer) {
        setLayerMoves((prev) => ({
          ...prev,
          [fromLayer]: (prev[fromLayer] ?? 0) + 1,
        }));
        setLayerMoveArmed((prev) => ({ ...prev, [fromLayer]: true }));
      }

      if (toLayer && fromLayer && toLayer !== fromLayer) {
  setLayerMoves((prev) => ({ ...prev, [toLayer]: 0 }));
  setLayerMoveArmed((prev) => ({ ...prev, [toLayer]: true }));
  triggerLayerFx(toLayer);
}

      

      if (moved) {
        setIsWalking(true);
        if (walkTimer.current) window.clearTimeout(walkTimer.current);
        walkTimer.current = window.setTimeout(() => setIsWalking(false), 420);

        setPlayerFacing(
          facingFromMoveVisual(
            viewState as any,
            pidBefore,
            pidAfter,
            fromLayer,
            getLayerMoves(fromLayer)
          )
        );
      }

      setState(nextState);
      setSelectedId(pidAfter ?? id);
      forceRender((n) => n + 1);

      const c2 = pidAfter ? idToCoord(pidAfter) : null;
      const nextLayer = c2?.layer ?? currentLayer;

      enterLayer(nextState, nextLayer);

      if (nextLayer !== currentLayer) {
        setCurrentLayer(nextLayer);
        revealWholeLayer(nextState, nextLayer);
    
      };

      const rm = getReachability(nextState) as any;
      setOptimalFromNow(computeOptimalFromReachMap(rm, goalId));

      pushLog("Moved to " + (pidAfter ?? id), "ok");
      if (goalId && pidAfter && pidAfter === goalId) pushLog("Goal reached!", "ok");
    },
    [
      state,
      viewState,
      encounterActive,
      reachable,
      currentLayer,
      playerLayer,
      goalId,
      pushLog,
      revealWholeLayer,
      computeOptimalFromReachMap,
      scenarioLayerCount,
      findTriggerForHex,
      getLayerMoves,
       triggerLayerFx,
    ]
  );

  const canGoDown = currentLayer - 1 >= 1;
  const canGoUp = currentLayer + 1 <= scenarioLayerCount;



  /* =========================
     Screens
  ========================= */

  if (screen === "start") {
    return (
      <div className="appRoot" style={themeVars}>
        <div className="screen center">
          <div className="panel">
            <div className="title">Hex Game</div>
            <div className="sub">Start → World → Character → Scenario → Game</div>

            <div className="row">
              <button className="btn primary" onClick={() => setScreen("world")}>
                Start
              </button>
              <button className="btn" onClick={resetAll}>
                Reset
              </button>
            </div>

            <div className="hint">
              Worlds loaded: <b>{worlds.length}</b>
            </div>
          </div>
        </div>

        <style>{baseCss}</style>
      </div>
    );
  }

 if (screen !== "game") {
  return (
    <div className="appRoot" style={themeVars}>
      <div className="screen center">
        <div className="panel wide">
          <div className="title">Choose your run</div>
          <div className="sub">
            Pick a world, then a scenario, then (optionally) a track.
          </div>

          {/* WORLD PICKER */}
          <div className="grid" style={{ marginTop: 14 }}>
            {worlds.map((w) => {
              const active = w.id === worldId;
              return (
                <button
                  key={w.id}
                  className={"card " + (active ? "active" : "")}
                  onClick={() => {
                    setWorldId(w.id);

                    // default scenario
                    const s0 = w.scenarios && w.scenarios.length ? w.scenarios[0] : null;
                    setScenarioId(s0 ? s0.id : null);

                    // default track (if any)
                    const t0 = s0 && s0.tracks && s0.tracks.length ? s0.tracks[0] : null;
                    setTrackId(t0 ? t0.id : null);

                    setScreen("scenario");
                  }}
                >
                  <div className="cardTitle">{w.name}</div>
                  <div className="cardDesc">{w.desc ?? ""}</div>
                </button>
              );
            })}
          </div>

          {/* SCENARIO PICKER */}
          {world ? (
            <div style={{ marginTop: 16 }}>
              <div className="tracksTitle">Scenarios</div>
              <div className="grid">
                {world.scenarios.map((s) => {
                  const active = s.id === scenarioId;
                  return (
                    <button
                      key={s.id}
                      className={"card " + (active ? "active" : "")}
                      onClick={() => {
                        setScenarioId(s.id);

                        // default track (if any)
                        const t0 = s.tracks && s.tracks.length ? s.tracks[0] : null;
                        setTrackId(t0 ? t0.id : null);

                        setScreen("scenario");
                      }}
                    >
                      <div className="cardTitle">{s.name}</div>
                      <div className="cardDesc">{s.desc ?? ""}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* TRACK PICKER */}
          {scenarioEntry && scenarioEntry.tracks && scenarioEntry.tracks.length > 1 ? (
            <div className="tracks">
              <div className="tracksTitle">Tracks</div>
              <div className="tracksRow">
                {scenarioEntry.tracks.map((t) => {
                  const active = t.id === trackId;
                  return (
                    <button
                      key={t.id}
                      className={"chip " + (active ? "active" : "")}
                      onClick={() => setTrackId(t.id)}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>

              <div className="hint">
                Selected: <b>{trackEntry ? trackEntry.name : "—"}</b>
              </div>
            </div>
          ) : scenarioEntry ? (
            <div className="hint" style={{ marginTop: 12 }}>
              {scenarioEntry.tracks && scenarioEntry.tracks.length === 1
                ? "Only one track available."
                : "No tracks for this scenario (it will start normally)."}
            </div>
          ) : null}

          <div className="row">
            <button className="btn" onClick={resetAll}>
              Back
            </button>

            <button
              className="btn primary"
              disabled={!scenarioEntry}
              onClick={startScenario}
            >
              Start
            </button>

            <button
              className="btn"
              onClick={() => {
                const w0 = worlds[0];
                const s0 = w0 && w0.scenarios ? w0.scenarios[0] : null;

                if (w0 && s0) {
                  setWorldId(w0.id);
                  setScenarioId(s0.id);

                  const t0 = s0.tracks && s0.tracks.length ? s0.tracks[0] : null;
                  setTrackId(t0 ? t0.id : null);

                  pendingQuickStartRef.current = true;
                }
              }}
            >
              Quick start (debug)
            </button>
          </div>

          <div className="hint" style={{ marginTop: 10 }}>
            World: <b>{world ? world.name : "—"}</b> · Scenario:{" "}
            <b>{scenarioEntry ? scenarioEntry.name : "—"}</b>
          </div>
        </div>
      </div>

      <style>{baseCss}</style>
    </div>
  );
}

/* =========================
   GAME screen (complete)
========================= */

return (
  <div className="appRoot game" style={themeVars}>
    <div
      className="gameBg"
      style={{
        backgroundImage: GAME__URL
          ? "url(" + toPublicUrl(GAME__URL) + ")"
          : undefined,
      }}
    />

    <div className="topbar">
     

      <div className={"dice3d " + (diceRolling ? "rolling" : "")}>
        <div
          className="cube"
          style={{
            transform:
              "rotateX(" + diceRot.x + "deg) rotateY(" + diceRot.y + "deg)",
          }}
        >
          <div
            className="face face-front"
            style={{ backgroundImage: "url(" + diceImg(diceValue) + ")" }}
          />
          <div
            className="face face-back"
            style={{ backgroundImage: "url(" + diceImg(5) + ")" }}
          />
          <div
            className="face face-right"
            style={{ backgroundImage: "url(" + diceImg(3) + ")" }}
          />
          <div
            className="face face-left"
            style={{ backgroundImage: "url(" + diceImg(4) + ")" }}
          />
          <div
            className="face face-top"
            style={{ backgroundImage: "url(" + diceImg(1) + ")" }}
          />
          <div
            className="face face-bottom"
            style={{ backgroundImage: "url(" + diceImg(6) + ")" }}
          />
        </div>

        {DICE_BORDER_IMG ? (
          <div
            className="diceBorder"
            style={{
              backgroundImage: "url(" + toPublicUrl(DICE_BORDER_IMG) + ")",
            }}
          />
        ) : null}
      </div>

      <div className="items">
        {items.map((it) => (
          <button
            key={it.id}
            className={"itemBtn " + (it.charges <= 0 ? "off" : "")}
            disabled={
              it.charges <= 0 ||
              !state ||
              (encounterActive && it.id !== "reroll") ||
              (layerFx !== null)
            }
            onClick={() => useItem(it.id)}
            title={it.name + " (" + it.charges + ")"}
          >
            <span className="itemIcon">{it.icon}</span>
            <span className="itemName">{it.name}</span>
            <span className="itemCharges">{it.charges}</span>
          </button>
        ))}
      </div>

      <button
        className="btn"
        disabled={!state || !canGoDown || encounterActive || layerFx !== null}
        onClick={() => {
          if (!state) return;
          const next = Math.max(1, currentLayer - 1);
          setCurrentLayer(next);
          enterLayer(state, next);
          revealWholeLayer(state, next);
          forceRender((n) => n + 1);
          pushLog("Layer " + next, "info");
          triggerLayerFx(next);
        }}
      >
        − Layer
      </button>

      <button
        className="btn"
        disabled={!state || !canGoUp || encounterActive || layerFx !== null}
        onClick={() => {
          if (!state) return;
          const next = Math.min(scenarioLayerCount, currentLayer + 1);
          setCurrentLayer(next);
          enterLayer(state, next);
          revealWholeLayer(state, next);
          forceRender((n) => n + 1);
          pushLog("Layer " + next, "info");
          triggerLayerFx(next);
        }}
      >
        + Layer
      </button>
    </div>

    <div className="gameLayout">
      <div className="boardWrap">
        <SideBar side="left" currentLayer={currentLayer} />

        <div
          key={currentLayer}
          className="boardLayerBg"
          style={{
            backgroundImage: BOARD_LAYER_
              ? "url(" + toPublicUrl(BOARD_LAYER_) + ")"
              : undefined,
          }}
        />

        <HexDeckCardsOverlay glowVar={layerCssVar(currentLayer)} />

        <div className="boardScroll" ref={scrollRef}>
          <div className="board" ref={boardRef}>
            {/* ✅ ONE stable centering wrapper */}
            <div className="hexGrid">
              {/* ✅ LAYER FLASH OVERLAY (one per board) */}
           {layerFx ? (
  <div
    key={layerFx.key}
    className="layerFxOverlay"
    style={layerFxStyle}
    aria-live="polite"
  >
    <div className="layerFxCard">
      <div className="layerFxTitle">Layer {layerFx.layer}</div>
    </div>
  </div>
) : null}

              {showGhost && viewState ? (
                <div className="ghostGrid">
                  {rows.map((r) => {
                    const cols = ROW_LENS[r] ?? 0;
                    const isOffset = cols === 6;
                    const base = isOffset ? "calc(var(--hexStepX) / 5)" : "0px";

                    const engineShiftRaw =
                      (viewState as any)?.rowShifts?.[currentLayer]?.[r] ??
                      (viewState as any)?.rowShifts?.["L" + currentLayer]?.[r];

                    const engineShift = Number(engineShiftRaw ?? 0);

                    const rawShift =
                      Number.isFinite(engineShift) && engineShift !== 0
                        ? engineShift
                        : derivedRowShiftUnits(
                            viewState as any,
                            currentLayer,
                            r,
                            getLayerMoves(currentLayer)
                          );

                    const ns = normalizeRowShift(rawShift, cols);
                    const shift = ns.visual;

                    const tx =
                      "calc(" + base + " + (" + shift + " * var(--hexStepX)))";

                    return (
                      <div
                        key={"ghost-row-" + r}
                        className="ghostRow"
                        style={{ transform: "translateX(" + tx + ")" }}
                      >
                        {Array.from({ length: cols }, (_, c) => {
                          const logicalId = idAtSlot(currentLayer, r, c, shift);
                          const lc = idToCoord(logicalId);

                          return (
                            <div key={"g-" + r + "-" + c} className="ghostSlot">
                              <div
                                style={{
                                  position: "relative",
                                  width: "100%",
                                  height: "100%",
                                  display: "grid",
                                  placeItems: "center",
                                }}
                              >
                                <div className="ghostHex" />
                                <div className="ghostText">
                                  {r + "," + (lc ? lc.col : c)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {rows.map((r) => {
                const cols = ROW_LENS[r] ?? 0;
const isOffset = cols === 6;

              

                const engineShiftRaw =
                  (viewState as any)?.rowShifts?.[currentLayer]?.[r] ??
                  (viewState as any)?.rowShifts?.["L" + currentLayer]?.[r];

                const engineShift = Number(engineShiftRaw ?? 0);

                const rawShift =
                  Number.isFinite(engineShift) && engineShift !== 0
                    ? engineShift
                    : derivedRowShiftUnits(
                        viewState as any,
                        currentLayer,
                        r,
                        getLayerMoves(currentLayer)
                      );

                const ns = normalizeRowShift(rawShift, cols);
                const shift = ns.visual;

                const tx = isOffset ? "calc(var(--hexStepX) / 5)" : "0px";

                return (
                  <div
                    key={"row-" + r}
                    className="hexRow"
                    style={{ transform: "translateX(" + tx + ")" }}
                  >
             

                    {Array.from({ length: cols }, (_, c) => {
                      const id = "L" + currentLayer + "-R" + r + "-C" + c;

                      const hex = getHexFromState(viewState as any, id) as any;
                      const bm = isBlockedOrMissing(hex);

                      const portalDir = findPortalDirection(
                        (viewState as any)?.scenario?.transitions,
                        id
                      );

                      const isPortalUp = portalDir === "up";
                      const isPortalDown = portalDir === "down";

                      if (bm.missing)
                        return <div key={id} className="hexSlot empty" />;

                      const isSel = selectedId === id;
                      const isPlayer = isPlayerHere(id);
                      const isStart = startHexId === id;

                      const isReach =
                        playerLayer === currentLayer &&
                        !isPlayer &&
                        reachable.has(id);

                      const upLayer = Math.min(
                        scenarioLayerCount,
                        currentLayer + 1
                      );
                      const downLayer = Math.max(1, currentLayer - 1);

                      const portalTargetLayer = isPortalUp
                        ? upLayer
                        : isPortalDown
                        ? downLayer
                        : null;

                      const portalColor = portalTargetLayer
                        ? layerCssVar(portalTargetLayer)
                        : null;

                      const isGoal = goalId === id;
                      const isTrigger = !!findTriggerForHex(id);
                      const tile = HEX_TILE
                        ? "url(" + toPublicUrl(HEX_TILE) + ")"
                        : "";

                      return (
                        <div key={"v-" + r + "-" + c} className="hexSlot">
                          <button
                            ref={isPlayer ? playerBtnRef : null}
                            className={[
                              "hex",
                              isSel ? "sel" : "",
                              isReach ? "reach" : "",
                              bm.blocked ? "blocked" : "",
                              isPlayer ? "player" : "",
                              isGoal ? "goal" : "",
                              isTrigger ? "trigger" : "",
                              isStart ? "portalStart" : "",
                              isPortalUp ? "portalUp" : "",
                              isPortalDown ? "portalDown" : "",
                            ].join(" ")}
                            onClick={() => {
                              if (layerFx !== null) return;
                              if (playerLayer && currentLayer !== playerLayer) {
                                tryMoveToId(id);
                                return;
                              }
                              setSelectedId(id);
                              tryMoveToId(id);
                            }}
                            disabled={
                              !state ||
                              bm.blocked ||
                              bm.missing ||
                              encounterActive ||
                              layerFx !== null
                            }
                            style={
                              {
                                ["--hexGlow" as any]: layerCssVar(currentLayer),
                                ...(portalColor
                                  ? { ["--portalC" as any]: portalColor }
                                  : {}),
                              } as any
                            }
                            title={id}
                          >
                            <div className="hexAnchor">
                              

                           <div
  className="hexInner"
  style={tile ? { backgroundImage: tile } : undefined}
>
  {isPortalUp || isPortalDown ? (
    <>
      <div className="pAura" />
      <div className="pOrbs" />
      <div className="pRim" />
      <div className="pOval" />
    </>
  ) : null}

                                {isStart ? (
                                  <>
                                    <div className="pAura" />
                                    <div className="pRunes" />
                                    <div className="pVortex" />
                                    <div className="pWell" />
                                    <div className="pShine" />
                                  </>
                                ) : null}

                                <div className="hexId">{r + "," + c}</div>

                                <div className="hexMarks">
                                  {isPortalUp ? (
                                    <span className="mark">↑</span>
                                  ) : null}
                                  {isPortalDown ? (
                                    <span className="mark">↓</span>
                                  ) : null}
                                  {isGoal ? (
                                    <span className="mark g">G</span>
                                  ) : null}
                                  {isTrigger ? (
                                    <span className="mark t">!</span>
                                  ) : null}
                                </div>
                              </div>

                              {isPlayer ? (
                                <span
                                  className={
                                    "playerSpriteSheet " +
                                    (isWalking ? "walking" : "")
                                  }
                                  style={
                                    {
                                      ["--spriteImg" as any]:
                                        "url(" + spriteSheetUrl() + ")",
                                      ["--frameW" as any]: FRAME_W,
                                      ["--frameH" as any]: FRAME_H,
                                      ["--cols" as any]: SPRITE_COLS,
                                      ["--rows" as any]: SPRITE_ROWS,
                                      ["--frameX" as any]: walkFrame,
                                      ["--frameY" as any]: facingRow(playerFacing),
                                    } as any
                                  }
                                />
                              ) : null}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SideBar side="right" currentLayer={currentLayer} />
      </div>

      <div className="side">
        <div className="panelMini">
          <div className="miniTitle">Status</div>

          <div className="miniRow">
            <span className="k">Layer</span>
            <span className="v">
              {currentLayer}/{scenarioLayerCount}
            </span>
          </div>

          <div className="miniRow">
            <span className="k">Moves</span>
            <span className="v">{movesTaken}</span>
          </div>

          <div className="miniRow">
            <span className="k">Optimal (start)</span>
            <span className="v">{optimalAtStart ?? "-"}</span>
          </div>

          <div className="miniRow">
            <span className="k">Optimal (now)</span>
            <span className="v">{optimalFromNow ?? "-"}</span>
          </div>
        </div>

        <div className="panelMini">
          <div className="miniTitle">Log</div>
          <div className="log">
            {log.map((e) => (
              <div key={e.n} className={"logRow " + (e.kind ?? "")}>
                <div className="lt">{e.t}</div>
                <div className="lm">{e.msg}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {encounter ? (
  <div className="overlay" role="dialog" aria-modal="true">
    <div className="overlayCard">
      <div className="overlayTitle">Encounter!</div>
      <div className="overlaySub">
        A villain blocks your path. Roll a <b>6</b> to break through.
        <span style={{ display: "inline-block", marginLeft: 10, opacity: 0.8 }}>
          Tries: <b>{encounter.tries}</b>
        </span>
      </div>

      <div className="villainBox">
        <img
          className="villainImg"
          src={villainImg(encounter.villainKey)}
          alt={encounter.villainKey}
        />

        <div className="villainMeta">
          <div style={{ fontWeight: 900, fontSize: 14 }}>
            {encounter.villainKey.toUpperCase()}
          </div>

          <div style={{ color: "rgba(255,255,255,.78)", fontSize: 13, lineHeight: 1.35 }}>
            Click <b>Roll</b> (or use the <b>Reroll</b> item). If the die lands on <b>6</b>,
            you will automatically continue to the tile you clicked.
          </div>

          <div className="row" style={{ justifyContent: "flex-start", marginTop: 8 }}>
            <button
              className="btn primary"
              disabled={diceRolling}
              onClick={() => rollDice()}
              title="Roll the die"
            >
              {diceRolling ? "Rolling…" : "Roll"}
            </button>

            <button
              className="btn"
              disabled={diceRolling}
              onClick={() => {
                // optional escape hatch (prevents soft-lock during debugging)
                pendingEncounterMoveIdRef.current = null;
                setEncounter(null);
                pushLog("Encounter dismissed (debug)", "info");
              }}
              title="Debug: dismiss encounter"
            >
              Dismiss
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
            Current die: <b>{diceValue}</b>
          </div>
        </div>
      </div>
    </div>
  </div>
) : null}

    <style>{baseCss}</style>
  </div>
);
}
