// src/ui/app.tsx 
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  // Try pid-only first (most common)
  try {
    const a = (neighborIdsSameLayer as any)(pid);
    if (Array.isArray(a) && a.every((x) => typeof x === "string" && x.startsWith("L"))) return a;
  } catch {}

  // Then try (state, pid)
  try {
    const b = (neighborIdsSameLayer as any)(st, pid);
    if (Array.isArray(b) && b.every((x) => typeof x === "string" && x.startsWith("L"))) return b;
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
  --hexStepX: 72px; /* horizontal spacing between centers */

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
  opacity:.65;
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
  text-align:left;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor:pointer;
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
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
.cardTitle{ font-weight: 900; }
.cardDesc{ margin-top: 6px; color: var(--muted); font-size: 13px; }

.customBox{ margin-top: 14px; display:grid; gap: 10px; }
.lbl{ font-size: 12px; color: var(--muted); }
.inp{
  width:100%;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.24);
  color: var(--text);
  outline:none;
}
.portrait{
  width:120px; height:120px; border-radius: 18px;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.25);
  box-shadow: 0 14px 40px rgba(0,0,0,.28);
}

.tracks{ margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.08); }
.tracksTitle{ font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.tracksRow{ margin-top: 10px; display:flex; flex-wrap: wrap; gap: 10px; }
.chip{
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--stroke);
  background: rgba(0,0,0,.22);
  color: var(--text);
  cursor:pointer;
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
  min-height: 0;
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
  min-height: 0;
--boardInset: calc((100% - (var(--barColW) * 2) - var(--boardW)) / 2);
display: grid;
  grid-template-columns: var(--barColW) 1fr var(--barColW);
  align-items: stretch;       /* ✅ WAS center — this is the big bug */
}


.boardLayerBg{
  position:absolute; inset:0;
  background-size: cover;
  background-position: center;
  opacity: .28;
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
 position: relative; /* ADD THIS */
}

/* =========================================================
   HEX ROWS (7676767)
========================================================= */
.hexRow{
  display: flex;
  height: var(--hexHMain);
  align-items: center;
  justify-content: center;
  width: 100%;
}
.hexRow.offset{
  transform: translateX(calc(var(--hexStepX) / -5));
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

  padding: 0;
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
  border-color: rgba(255, 45, 161, .85);
  background: #ff2da1 !important;          /* HOT PINK FILL */
  background-image: none !important;       /* makes sure tile image doesn't cover it */
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.35),
    0 0 0 3px rgba(255, 45, 161, .22),
    0 0 16px rgba(255, 45, 161, .55);
  animation: reachPulse 1.0s ease-in-out infinite;
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

.hex .hexInner .pAura,
.hex .hexInner .pOrbs,
.hex .hexInner .pRim,
.hex .hexInner .pOval{
  position:absolute;
  inset:0;
  pointer-events:none;
  border-radius: 10px;
  clip-path: polygon(25% 6%,75% 6%,98% 50%,75% 94%,25% 94%,2% 50%);
  z-index: 100;
}


/* glow framing (subtle so your existing look stays) */
.hex.portalUp .hexInner,
.hex.portalDown .hexInner{
  border-color: color-mix(in srgb, var(--portalC) 55%, rgba(255,255,255,.12));
  box-shadow:
    inset 0 0 0 1px rgba(0,0,0,.35),
    0 0 0 3px color-mix(in srgb, var(--portalC) 16%, transparent),
    0 0 16px color-mix(in srgb, var(--portalC) 22%, transparent);
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
    z-index: 100;
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
  overflow:hidden;
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
   DECK CARDS (PINNED TO GUTTERS) + BORDER EFFECT
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

.hexDeckCard{
  position: absolute;

  width: clamp(170px, 18vw, 260px);
  max-width: max(150px, calc(var(--boardInset) - (var(--deckPadX) * 2)));

  aspect-ratio: 3 / 4;
  border-radius: 22px;
  overflow: hidden;

  border: 1px solid rgba(255,255,255,.18);
  background: linear-gradient(135deg, var(--a), var(--b));
  box-shadow:
    0 18px 48px rgba(0,0,0,.55),
    0 0 0 1px rgba(255,255,255,.06) inset;
}

/* positions */
.hexDeckCard.cosmic{
  left: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  top: calc(var(--boardPadTop) + var(--deckPadY));
  transform: translateX(-100%);
}
.hexDeckCard.risk{
  left: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  bottom: calc(var(--boardPadBottom) + var(--deckPadY));
  transform: translateX(-100%);
}
.hexDeckCard.terrain{
  right: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  top: calc(var(--boardPadTop) + var(--deckPadY));
  transform: translateX(100%);
}
.hexDeckCard.shadow{
  right: calc(var(--barColW) + var(--boardInset) - var(--deckPadX));
  bottom: calc(var(--boardPadBottom) + var(--deckPadY));
  transform: translateX(100%);
}

.hexDeckCard::before{
  content:"";
  position:absolute;
  inset:0;
  background:
    radial-gradient(120% 90% at 40% 20%, rgba(255,255,255,.12), transparent 55%),
    radial-gradient(90% 70% at 70% 80%, rgba(255,255,255,.08), transparent 60%);
  opacity: .9;
  pointer-events:none;
}

/* single combined ::after (no duplicate blocks) */
@property --spin { syntax: "<angle>"; inherits: false; initial-value: 0turn; }

@keyframes spinCW { from{ --spin: 0turn; } to{ --spin: 1turn; } }
@keyframes spinCCW{ from{ --spin: 1turn; } to{ --spin: 0turn; } }
@keyframes twinkle {
  0%,100%{ filter: drop-shadow(0 0 10px var(--cardGlow)); opacity:.92; }
  50%{ filter: drop-shadow(0 0 16px var(--cardGlow)); opacity:1; }
}

.hexDeckCard::after{
  content:"";
  position:absolute;
  inset:-2px;
  border-radius: 24px;
  padding: 2px;

  background:
    conic-gradient(
      from var(--spin),
      transparent 0 80%,
      rgba(255,255,255,.1) 82% 84%,
      var(--cardGlow) 86% 90%,
      rgba(255,255,255,.1) 92% 94%,
      transparent 96% 100%
    );

  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;

  opacity: .95;
  pointer-events:none;

  animation: var(--spinAnim) linear infinite, twinkle 1.3s ease-in-out infinite;
}

/* animation direction/speed via CSS var */
.hexDeckCard.cw.slow{  --spinAnim: spinCW 3.6s; }
.hexDeckCard.cw.fast{  --spinAnim: spinCW 2.4s; }
.hexDeckCard.ccw.slow{ --spinAnim: spinCCW 3.8s; }
.hexDeckCard.ccw.fast{ --spinAnim: spinCCW 2.2s; }

/* card themes */
.hexDeckCard.cosmic  { --a:#0C1026; --b:#1A1F4A; }
.hexDeckCard.risk    { --a:#12090A; --b:#6E0F1B; }
.hexDeckCard.terrain { --a:#0E3B2E; --b:#1FA88A; }
.hexDeckCard.shadow  { --a:#1B1B1E; --b:#2A1E3F; }

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
  // navigation
  const [screen, setScreen] = useState<Screen>("start");

  // worlds
  const [worlds, setWorlds] = useState<WorldEntry[]>([]);
  const [worldId, setWorldId] = useState<string | null>(null);
  const world = useMemo(() => worlds.find((w) => w.id === worldId) ?? null, [worlds, worldId]);

  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const scenarioEntry = useMemo(() => world?.scenarios.find((s) => s.id === scenarioId) ?? null, [world, scenarioId]);

  const [trackId, setTrackId] = useState<string | null>(null);
  const trackEntry = useMemo(() => {
    const tracks = scenarioEntry?.tracks;
    if (!tracks || tracks.length <= 0) return null;
    return tracks.find((t) => t.id === trackId) ?? null;
  }, [scenarioEntry, trackId]);

  useEffect(() => {
    setWorlds(loadWorlds());
  }, []);

  // player (character selection only)
  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);

  // game state
  const [state, setState] = useState<GameState | null>(null);
  const [uiTick, forceRender] = useState(0);

  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
const [startHexId, setStartHexId] = useState<string | null>(null);
  // ✅ single source of truth for player position (always follows engine)
  const playerId = useMemo(() => {
    const pid = (state as any)?.playerHexId;
    return typeof pid === "string" ? pid : null;
  }, [state, uiTick]);
  const playerCoord = useMemo(() => {
    return playerId ? idToCoord(playerId) : null;
  }, [playerId]);

  const playerLayer = playerCoord?.layer ?? null;

  // reachability
  // ids you can move to in ONE step (direct neighbors of the current player)
  const reachable = useMemo(() => {
    const set = new Set<string>();
    if (!state) return set;

    const pid = playerId;
    if (!pid) return set;

    const nbs = getNeighborsSameLayer(state as any, pid);
    for (const nbId of nbs) {
      const hex = getHexFromState(state, nbId) as any;
      const { blocked, missing } = isBlockedOrMissing(hex);
      if (!missing && !blocked) set.add(nbId);
    }

    return set;
  }, [state, uiTick, playerId]);

  // refs
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const walkTimer = useRef<number | null>(null);

  // encounter flow
  const pendingEncounterMoveIdRef = useRef<string | null>(null);
  const [villainTriggers, setVillainTriggers] = useState<VillainTrigger[]>([]);
  const [encounter, setEncounter] = useState<Encounter>(null);
  const encounterActive = !!encounter;
const pendingQuickStartRef = useRef(false);

// ... define startScenario useCallback here ...

useEffect(() => {
  if (pendingQuickStartRef.current && scenarioEntry) {
    pendingQuickStartRef.current = false;
    startScenario();
  }
}, [scenarioEntry, startScenario]);



  /* =========================
     Theme / assets (INSIDE App)
  ========================= */

  const activeTheme = scenarioEntry?.theme ?? null;
  const palette = activeTheme?.palette ?? null;

  const GAME__URL = activeTheme?.assets.backgroundGame ?? "";

  // ✅ ABSOLUTELY NO TEMPLATE LITERALS
  const backgroundLayers: any = (activeTheme && activeTheme.assets && activeTheme.assets.backgroundLayers) || {};
  const BOARD_LAYER_ = backgroundLayers["L" + currentLayer] || "";

  const DICE_FACES_BASE = activeTheme?.assets.diceFacesBase ?? "images/dice";
  const DICE_BORDER_IMG = activeTheme?.assets.diceCornerBorder ?? "";
  const VILLAINS_BASE = activeTheme?.assets.villainsBase ?? "images/villains";
  const HEX_TILE = activeTheme?.assets.hexTile ?? "";

  const [scenarioLayerCount, setScenarioLayerCount] = useState<number>(1);

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

  // Sprite sheet info
  const SPRITE_COLS = 4;
  const SPRITE_ROWS = 4; // set to 5 ONLY if your sheet has 5 direction rows

  const FRAME_W = 128;
  const FRAME_H = 128;

  function spriteSheetUrl() {
    return toPublicUrl("images/players/sprite_sheet_20.png");
  }

  // Animation state
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const [walkFrame, setWalkFrame] = useState(0);

  const SPRITE_FPS = 10;
  const FRAME_DURATION = 1000 / SPRITE_FPS;

  useEffect(() => {
    if (!isWalking) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setWalkFrame(0);
      return;
    }

    lastRef.current = performance.now();

    const tick = (t: number) => {
      if (t - lastRef.current >= FRAME_DURATION) {
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
  }, [isWalking, FRAME_DURATION]);

  // cleanup: if a move timer is still pending, clear it on unmount
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
  const [diceRot, setDiceRot] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const diceTimer = useRef<number | null>(null);

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
      const flicker = 1 + Math.floor(Math.random() * 6);
      setDiceValue(flicker);
      setDiceRot(rotForRoll(flicker));

      if (elapsed < duration) {
        diceTimer.current = window.setTimeout(tick, 55);
      } else {
        const final = 1 + Math.floor(Math.random() * 6);
        setDiceValue(final);
        setDiceRot(rotForRoll(final));
        setDiceRolling(false);
      }
    };

    tick();
  }, [diceRolling]);

  /* =========================
     Villain trigger helpers
  ========================= */

  function findTriggerForHex(id: string): VillainKey | null {
    const c = idToCoord(id);
    if (!c) return null;
    for (const t of villainTriggers) {
      if (t.layer !== c.layer) continue;
      if (t.row !== c.row) continue;
      if (!t.cols || t.cols === "any") return t.key;
      if (Array.isArray(t.cols) && t.cols.includes(c.col)) return t.key;
    }
    return null;
  }

  const parseVillainsFromScenario = useCallback((s: any): VillainTrigger[] => {
    if (Array.isArray(s?.villainTriggers)) {
      return s.villainTriggers
        .map((t: any) => ({
          key: t.key as VillainKey,
          layer: Number(t.layer),
          row: Number(t.row),
          cols: t.cols ?? "any",
        }))
        .filter((t: any) => t.key && Number.isFinite(t.layer) && Number.isFinite(t.row));
    }

    if (Array.isArray(s?.villains?.triggers)) {
      return s.villains.triggers
        .map((t: any) => ({
          key: String(t.id) as VillainKey,
          layer: Number(t.layer),
          row: Number(t.row),
          cols: "any" as const,
        }))
        .filter((t: any) => t.key && Number.isFinite(t.layer) && Number.isFinite(t.row));
    }

    return [];
  }, []);
  /* =========================
     Moves / optimal / log
  ========================= */

  const [movesTaken, setMovesTaken] = useState(0);

  const [goalId, setGoalId] = useState<string | null>(null);
  const [optimalAtStart, setOptimalAtStart] = useState<number | null>(null);
  const [optimalFromNow, setOptimalFromNow] = useState<number | null>(null);


const computeOptimalFromReachMap = useCallback((rm: any, gid: string | null) => {
  if (!gid || !rm) return null;

  // Map case
  if (typeof rm?.get === "function") {
    const info = rm.get(gid);
    return info?.reachable ? (info.distance as number) : null;
  }

  // Object case
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

      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, charges: Math.max(0, x.charges - 1) } : x)));

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
     Encounter resolution (✅ single effect, correct scope)
  ========================= */

  const prevRollingRef = useRef(false);
  useEffect(() => {
    const wasRolling = prevRollingRef.current;
    prevRollingRef.current = diceRolling;

    if (!encounter) return;
    if (diceRolling) return;
    if (!wasRolling) return; // only when roll just ended

    // count attempt
    setEncounter((e) => (e ? { ...e, tries: e.tries + 1 } : e));

    // only succeed on 6
    if (diceValue !== 6) return;

    const targetId = pendingEncounterMoveIdRef.current;
    pendingEncounterMoveIdRef.current = null;

    // close overlay
    setEncounter(null);

    if (!state || !targetId) return;

    const res: any = tryMove(state as any, targetId);
    const nextState = unwrapNextState(res);

    if (!nextState) {
      const msg =
        (res && typeof res === "object" && "reason" in res && String((res as any).reason)) || "Move failed.";
      pushLog(msg, "bad");
      return;
    }

    const pidBefore = (state as any)?.playerHexId as string | null;
    const pidAfter = (nextState as any).playerHexId as string | null;
console.log("MOVE RESULT", { pidBefore, pidAfter, moved: pidAfter && pidBefore !== pidAfter });


    const moved = !!pidBefore && !!pidAfter && pidAfter !== pidBefore;
    if (moved) {
      setIsWalking(true);

      if (walkTimer.current) window.clearTimeout(walkTimer.current);
      walkTimer.current = window.setTimeout(() => setIsWalking(false), 420);

      setPlayerFacing(facingFromMove(pidBefore, pidAfter));
    }

    // commit state first
setState(nextState);
forceRender((n) => n + 1);



    // layer ops after commit
    const c2 = pidAfter ? idToCoord(pidAfter) : null;
const nextLayer = c2?.layer ?? currentLayer;

// ✅ ALWAYS re-apply active layer to the NEW engine state
enterLayer(nextState, nextLayer);

if (nextLayer !== currentLayer) {
  setCurrentLayer(nextLayer);
  revealWholeLayer(nextState, nextLayer);
}

    const rm = getReachability(nextState) as any;
    setOptimalFromNow(computeOptimalFromReachMap(rm, goalId));

    pushLog("Encounter cleared — moved to " + (pidAfter ?? targetId), "ok");
    if (goalId && pidAfter && pidAfter === goalId) pushLog("Goal reached!", "ok");
  }, [
    encounter,
    diceRolling,
    diceValue,
    state,
    currentLayer,
    goalId,
    revealWholeLayer,
    computeOptimalFromReachMap,
    pushLog,
  ]);

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

  const s = (await loadScenario(chosenJson)) as any;

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

    // IMPORTANT ORDER: enter + reveal before reachability
    enterLayer(st, layer);
    revealWholeLayer(st, layer);

 const rm = getReachability(st) as any;

setState(st);
setSelectedId(pid);
setStartHexId(pid);
setCurrentLayer(layer);
setPlayerFacing("down");


setMovesTaken(0);
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
  }, [scenarioEntry, trackEntry, parseVillainsFromScenario, revealWholeLayer, computeOptimalFromReachMap, pushLog]);

  /* =========================
     Movement (no hooks inside)
  ========================= */


  const tryMoveToId = useCallback(
    (id: string) => {
      if (!state) return;
      if (encounterActive) return;
      // ✅ Guard: if you're viewing a different layer than the player is actually on,
      // clicking tiles on the viewed layer will never be a valid neighbor move.
      // So: snap the view back to the player's layer and stop.
     pushLog("Moved to " + (pidAfter ?? id), "ok");
      if (goalId && pidAfter && pidAfter === goalId) pushLog("Goal reached!", "ok");
    },
    [
      state,
      encounterActive,
      reachable,
      currentLayer,
      playerLayer,
      goalId,
      pushLog,
      revealWholeLayer,
      findTriggerForHex,
    ]
  );
        return;
      }

      const hex = getHexFromState(state, id) as any;
      const { blocked, missing } = isBlockedOrMissing(hex);
      if (missing) {
        pushLog("Missing tile.", "bad");
        return;
      }
      if (blocked) {
        pushLog("Blocked tile.", "bad");
        return;
      }

const pidBefore = (state as any).playerHexId as string | null;

console.log("CLICK", {
  pidBefore,
  clicked: id,
  reachableCount: reachable.size,
  reachable: Array.from(reachable),
});


// // only allow ONE-step neighbor moves
// if (pidBefore && id !== pidBefore) {
//   if (!reachable.has(id)) {
//     pushLog("Not a neighbor move.", "bad");
//     return;
//   }
// }





      // encounter gate BEFORE tryMove
      const vk = findTriggerForHex(id);
      if (vk) {
        pendingEncounterMoveIdRef.current = id;
        setEncounter((prev) => (prev ? { ...prev, villainKey: vk } : { villainKey: vk, tries: 0 }));
        pushLog("Encounter: " + vk + " — roll a 6 to continue", "bad");
        return;
      }

      const res: any = tryMove(state as any, id);
      const nextState = unwrapNextState(res);

      if (!nextState) {
        const msg =
          (res && typeof res === "object" && "reason" in res && String((res as any).reason)) || "Move failed.";
        pushLog(msg, "bad");
        return;
      }

      const pidAfter = (nextState as any).playerHexId as string | null;

      const moved = !!pidBefore && !!pidAfter && pidAfter !== pidBefore;
      if (moved) {
        setMovesTaken((n) => n + 1);

        setIsWalking(true);
        if (walkTimer.current) window.clearTimeout(walkTimer.current);
        walkTimer.current = window.setTimeout(() => setIsWalking(false), 420);

        setPlayerFacing(facingFromMove(pidBefore, pidAfter));
      }

      // commit next state first
  setState(nextState);
setSelectedId(pidAfter ?? id);

forceRender((n) => n + 1);



      // layer ops after commit
      // layer ops after commit
const c2 = pidAfter ? idToCoord(pidAfter) : null;
const nextLayer = c2?.layer ?? currentLayer;

// ✅ ALWAYS re-apply active layer to the NEW engine state
enterLayer(nextState, nextLayer);

// ✅ Only change the UI layer + reveal when it actually changes
if (nextLayer !== currentLayer) {
  setCurrentLayer(nextLayer);
  revealWholeLayer(nextState, nextLayer);
}


const rm = getReachability(nextState) as any;
setOptimalFromNow(computeOptimalFromReachMap(rm, goalId));



      pushLog("Moved to " + (pidAfter ?? id), "ok");
      if (goalId && pidAfter && pidAfter === goalId) pushLog("Goal reached!", "ok");
        },
        [
      state,
      encounterActive,
      reachable,
      currentLayer,
      playerLayer, // ✅ ADD THIS
      goalId,
      pushLog,
      revealWholeLayer,
      findTriggerForHex,
    ]

  );

  const canGoDown = currentLayer - 1 >= 1;
  const canGoUp = currentLayer + 1 <= scenarioLayerCount;
  /* =========================
   Render helpers/components
========================= */

const layerRows = useMemo(() => ROW_LENS.length, []);
const rows = useMemo(() => Array.from({ length: layerRows }, (_, i) => i), [layerRows]);

function hexId(layer: number, r: number, c: number) {
  return "L" + layer + "-R" + r + "-C" + c;
}

function isPlayerHere(id: string) {
  return !!playerId && playerId === id;
}

function SideBar(props: { side: "left" | "right"; currentLayer: number }) {
  const segments = [7, 6, 5, 4, 3, 2, 1];
  const { side, currentLayer } = props;

  return (
    <div className={"barWrap " + (side === "left" ? "barLeft" : "barRight")}>
      <div className="layerBar">
        {segments.map((layerVal) => {
          const active = layerVal === currentLayer;
          return (
            <div
              key={layerVal}
              className={"barSeg" + (active ? " isActive" : "")}
              data-layer={layerVal}
            />
          );
        })}
      </div>
    </div>
  );
}

function HexDeckCardsOverlay(props: { glowVar: string }) {
  return (
    <div
      className="hexDeckOverlay"
      style={{ ["--cardGlow" as any]: props.glowVar } as any}
    >
      <div className="hexDeckCol left">
        <div className="hexDeckCard cosmic ccw slow" />
        <div className="hexDeckCard risk ccw fast" />
      </div>

      <div className="hexDeckCol right">
        <div className="hexDeckCard terrain cw slow" />
        <div className="hexDeckCard shadow cw fast" />
      </div>
    </div>
  );
}

const resetAll = useCallback(() => {
  setScreen("start");
  setWorldId(null);
  setScenarioId(null);
  setTrackId(null);
  setChosenPlayer(null);

  setState(null);
  setCurrentLayer(1);
  setSelectedId(null);
setStartHexId(null);
  setVillainTriggers([]);
  setEncounter(null);
  pendingEncounterMoveIdRef.current = null;

  setGoalId(null);
  setOptimalAtStart(null);
  setOptimalFromNow(null);
  setMovesTaken(0);

  logNRef.current = 0;
  setLog([]);

  setItems([
    { id: "reroll", name: "Reroll", icon: "🎲", charges: 2 },
    { id: "revealRing", name: "Reveal", icon: "👁️", charges: 2 },
    { id: "peek", name: "Peek", icon: "🧿", charges: 1 },
  ]);
}, []);

const PLAYER_PRESETS: Array<{ id: string; name: string }> = [
  { id: "p1", name: "Aeris" },
  { id: "p2", name: "Devlan" },
];

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
        <div className="panel">
          <div className="title">Not in game yet</div>
          <div className="sub">Screen: {screen}</div>

          <div className="hint" style={{ marginTop: 12 }}>
            Pick a world / character / scenario (screens not pasted here yet),
            then start the scenario.
          </div>

          <div className="row">
            <button className="btn" onClick={resetAll}>
              Back
            </button>

            <button
  className="btn primary"
  onClick={() => {
    const w0 = worlds[0];
    const s0 = w0?.scenarios?.[0];
    if (w0 && s0) {
      setWorldId(w0.id);
      setScenarioId(s0.id);
      setTrackId(null);
      pendingQuickStartRef.current = true;
    }
  }}
>
  Quick start (debug)
</button>

          </div>
        </div>
      </div>

      <style>{baseCss}</style>
    </div>
  );
}

/* =========================
   GAME screen
========================= */


return (
  <div className="appRoot game" style={themeVars}>
    <div
      className="gameBg"
      style={{
        backgroundImage: GAME__URL ? "url(" + toPublicUrl(GAME__URL) + ")" : undefined,
      }}
    />

    <div className="topbar">
      <div className={"dice3d " + (diceRolling ? "rolling" : "")}>
        <div className="cube" style={{ transform: "rotateX(" + diceRot.x + "deg) rotateY(" + diceRot.y + "deg)" }}>
          <div className="face face-front" style={{ backgroundImage: "url(" + diceImg(diceValue) + ")" }} />
          <div className="face face-back" style={{ backgroundImage: "url(" + diceImg(5) + ")" }} />
          <div className="face face-right" style={{ backgroundImage: "url(" + diceImg(3) + ")" }} />
          <div className="face face-left" style={{ backgroundImage: "url(" + diceImg(4) + ")" }} />
          <div className="face face-top" style={{ backgroundImage: "url(" + diceImg(1) + ")" }} />
          <div className="face face-bottom" style={{ backgroundImage: "url(" + diceImg(6) + ")" }} />
        </div>

        {DICE_BORDER_IMG ? (
          <div className="diceBorder" style={{ backgroundImage: "url(" + toPublicUrl(DICE_BORDER_IMG) + ")" }} />
        ) : null}
      </div>

      <div className="items">
        {items.map((it) => (
          <button
            key={it.id}
            className={"itemBtn " + (it.charges <= 0 ? "off" : "")}
            disabled={it.charges <= 0 || !state || (encounterActive && it.id !== "reroll")}
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
        disabled={!state || !canGoDown || encounterActive}
        onClick={() => {
          if (!state) return;
          const next = Math.max(1, currentLayer - 1);
          setCurrentLayer(next);
          enterLayer(state, next);
revealWholeLayer(state, next);

forceRender((n) => n + 1);
          pushLog("Layer " + next, "info");
        }}
      >
        − Layer
      </button>

      <button
        className="btn"
        disabled={!state || !canGoUp || encounterActive}
  onClick={() => {
  if (!state) return;
  const next = Math.min(scenarioLayerCount, currentLayer + 1);
  setCurrentLayer(next);
  enterLayer(state, next);
  revealWholeLayer(state, next);
  
  forceRender((n) => n + 1); // ✅ ADD THIS LINE
  pushLog("Layer " + next, "info");
}}

      >
        + Layer
      </button>
    </div>

    <div className="gameLayout">
      {/* LEFT: board + bars + deck cards */}
      <div className="boardWrap">
        <SideBar side="left" currentLayer={currentLayer} />

        <div
          key={currentLayer}
          className="boardLayerBg"
          style={{
            backgroundImage: BOARD_LAYER_ ? "url(" + toPublicUrl(BOARD_LAYER_) + ")" : undefined,
          }}
        />

        <HexDeckCardsOverlay glowVar={layerCssVar(currentLayer)} />

        <div className="boardScroll" ref={scrollRef}>
<div className="board" key={currentLayer + "-" + uiTick}>

            {rows.map((r) => {
              const cols = ROW_LENS[r] ?? 0;
              const isOffset = cols === 6; // ✅ 7676767: offset only the 6-wide rows
const shift = getRowShiftUnits(state as any, currentLayer, r);
const base = isOffset ? "calc(var(--hexStepX) / -5)" : "0px";

// no template literals:
const tx = "calc(" + base + " + (" + shift + " * var(--hexStepX)))";

              return (
             <div
  key={r}
  className="hexRow"
  style={{ transform: "translateX(" + tx + ")" }}
>

                  {Array.from({ length: cols }, (_, c) => {
                    const id = hexId(currentLayer, r, c);
                    const hex = getHexFromState(state, id) as any;
                    const { blocked, missing } = isBlockedOrMissing(hex);
const portalDir = findPortalDirection(
  (state as any)?.scenario?.transitions,
  id
);

const isPortalUp = portalDir === "up";
const isPortalDown = portalDir === "down";



if (missing) return <div key={id} className="hexSlot empty" />;

const isSel = selectedId === id;
const isPlayer = isPlayerHere(id);
const isStart = startHexId === id;
// ✅ only highlight ONE-step neighbor targets (never the player tile)
const isReach = !isPlayer && reachable.has(id);


const upLayer = Math.min(scenarioLayerCount, currentLayer + 1);
const downLayer = Math.max(1, currentLayer - 1);

const portalTargetLayer = isPortalUp ? upLayer : isPortalDown ? downLayer : null;
const portalColor = portalTargetLayer ? layerCssVar(portalTargetLayer) : null;

const isGoal = goalId === id;
const isTrigger = !!findTriggerForHex(id);
const tile = HEX_TILE ? "url(" + toPublicUrl(HEX_TILE) + ")" : "";


                    return (
                      <div key={id} className="hexSlot">
                        <button
                          className={[
  "hex",
  isSel ? "sel" : "",
  isReach ? "reach" : "",
  blocked ? "blocked" : "",
  isPlayer ? "player" : "",
  isGoal ? "goal" : "",
  isTrigger ? "trigger" : "",
  isStart ? "portalStart" : "",
  isPortalUp ? "portalUp" : "",
  isPortalDown ? "portalDown" : "",
].join(" ")}

                          onClick={() => {
  // If view doesn’t match player, don’t select that tile
  if (playerLayer && currentLayer !== playerLayer) {
    tryMoveToId(id);
    return;
  }
  setSelectedId(id);
  tryMoveToId(id);
}}

disabled={!state || blocked || missing || encounterActive}

                          style={
  {
    ["--hexGlow" as any]: layerCssVar(currentLayer),     // keep your existing layer glow
    ...(portalColor ? { ["--portalC" as any]: portalColor } : {}), // portal uses DESTINATION color
  } as any
}
                          title={id}
                        >
                          <div className="hexAnchor">
                            <div className="hexInner" style={tile ? { backgroundImage: tile } : undefined}>
                               {(isPortalUp || isPortalDown) ? (
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
                              <div className="hexId">
                                {r},{c}
                              </div>
                          <div className="hexMarks">
  {isPortalUp ? <span className="mark">↑</span> : null}
  {isPortalDown ? <span className="mark">↓</span> : null}

  {isGoal ? <span className="mark g">G</span> : null}
  {isTrigger ? <span className="mark t">!</span> : null}
</div>

                            </div>

                            {isPlayer ? (
                              <span
                                className={"playerSpriteSheet " + (isWalking ? "walking" : "")}
                                style={
                                  {
                                    ["--spriteImg" as any]: "url(" + spriteSheetUrl() + ")",
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

        <SideBar side="right" currentLayer={currentLayer} />
      </div>

      {/* RIGHT: sidebar */}
      <div className="side">
        <div className="panelMini">
          <div className="miniTitle">Status</div>

          <div className="miniRow">
            <span className="k">Player</span>
            <span className="v">{chosenPlayer?.kind === "preset" ? chosenPlayer.name : chosenPlayer?.name ?? "—"}</span>
          </div>

         <div className="miniRow">
  <span className="k">Viewing</span>
  <span className="v">
    {currentLayer} / {scenarioLayerCount}
  </span>
</div>

<div className="miniRow">
  <span className="k">Player</span>
  <span className="v">
    {playerLayer ?? "—"}
  </span>
</div>


          <div className="miniRow">
            <span className="k">Moves</span>
            <span className="v">{movesTaken}</span>
          </div>

          <div className="miniRow">
            <span className="k">Optimal</span>
            <span className="v">{optimalFromNow ?? "—"}</span>
          </div>
        </div>

        <div className="panelMini">
          <div className="miniTitle">Log</div>
          <div className="log">
            {log.length === 0 ? (
              <div className="hint">No events yet.</div>
            ) : (
              log.map((e) => (
                <div key={e.n} className={"logRow " + (e.kind ?? "info")}>
                  <div className="lt">{e.t}</div>
                  <div className="lm">{e.msg}</div>
                </div>
              ))
            )}
          </div>
        </div> 
      </div>
    </div>

    {/* encounter overlay */}
    {encounter ? (
      <div className="overlay">
        <div className="overlayCard">
          <div className="overlayTitle">Encounter</div>
          <div className="overlaySub">Roll a 6 to continue.</div>

          <div className="villainBox">
            <img className="villainImg" src={villainImg(encounter.villainKey)} alt={encounter.villainKey} />
            <div className="villainMeta">
              <div className="hint">Tries: {encounter.tries}</div>
              <button className="btn primary" onClick={rollDice} disabled={diceRolling}>
                Roll
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null}

    <style>{baseCss}</style>
  </div>
);
}
   
