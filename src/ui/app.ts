import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, endTurn, type ReachMap } from "../engine/api";
import { ROW_LENS, posId, enterLayer, revealHex } from "../engine/board";

type Coord = { layer: number; row: number; col: number };
type Screen = "start" | "select" | "setup" | "game";
type Mode = "regular" | "kids";

type Manifest = { initial: string; files: string[] };

type PlayerChoice =
  | { kind: "preset"; id: string; name: string }
  | { kind: "custom"; name: string; imageDataUrl: string | null };

type MonsterChoice = {
  id: string;
  name: string;
  notes?: string;
  imageDataUrl: string | null;
  kind: "preset" | "custom";
};

const BUILD_TAG = "BUILD_TAG_3COL_3D_ROTATE_GLOW_FILLWIDTH_V1";

function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function appendHint(parent: HTMLElement, txt: string) {
  const h = el("div", "hint");
  h.textContent = txt;
  parent.appendChild(h);
  return h;
}

function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[m] ?? m;
  });
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  return res.json();
}

async function loadScenario(path: string): Promise<Scenario> {
  const s = await fetchJson<Scenario>(path);
  assertScenario(s);
  return s;
}

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function wireDropZone(
  dropEl: HTMLElement,
  inputEl: HTMLInputElement,
  previewEl: HTMLElement,
  onImage: (url: string) => void
) {
  dropEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropEl.style.background = "rgba(240,163,91,.08)";
  });
  dropEl.addEventListener("dragleave", () => {
    dropEl.style.background = "rgba(255,255,255,.03)";
  });
  dropEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropEl.style.background = "rgba(255,255,255,.03)";
    const file = (e as DragEvent).dataTransfer?.files?.[0];
    if (!file) return;
    const url = await readFileAsDataURL(file);
    previewEl.innerHTML = `<img src="${url}" alt="uploaded">`;
    onImage(url);
  });

  inputEl.addEventListener("change", async () => {
    const file = inputEl.files?.[0];
    if (!file) return;
    const url = await readFileAsDataURL(file);
    previewEl.innerHTML = `<img src="${url}" alt="uploaded">`;
    onImage(url);
  });
}

function randId(prefix: string) {
  return `${prefix}-${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

export function mountApp(root: HTMLElement | null) {
  if (!root) throw new Error('Missing element with id="app"');

  // --------------------------
  // App-level state
  // --------------------------
  let screen: Screen = "start";
  let mode: Mode | null = null;

  // Loaded per-mode after Screen 1
  let scenarios: Scenario[] = [];
  let initialPath = "";
  let scenarioIndex = 0;

  // Setup selections (Screen 3)
  const PLAYER_PRESETS_REGULAR = [
    { id: "p1", name: "Aeris", blurb: "A calm force. Moves with intent." },
    { id: "p2", name: "Devlan", blurb: "A wary hunter. Reads the board." },
  ];
  const PLAYER_PRESETS_KIDS = [
    { id: "p1", name: "Sunny", blurb: "Brave, bright, and curious." },
    { id: "p2", name: "Pip", blurb: "Small steps, big wins." },
  ];

  const MONSTER_PRESETS_REGULAR = [
    { id: "m1", name: "Boneguard", blurb: "Holds ground. Punishes carelessness." },
    { id: "m2", name: "Veilwing", blurb: "Skirmisher. Appears where you’re not looking." },
    { id: "m3", name: "Frostfang", blurb: "Cold pressure. Slows the pace." },
  ];
  const MONSTER_PRESETS_KIDS = [
    { id: "k1", name: "Bouncy Slime", blurb: "Goofy and harmless… mostly." },
    { id: "k2", name: "Patchwork Gremlin", blurb: "Mischief maker. Loves shiny things." },
    { id: "k3", name: "Cloud Puff", blurb: "Floats around and blocks the way." },
  ];

  let chosenPlayer: PlayerChoice | null = null;
  let chosenMonsters: MonsterChoice[] = [];

  // --------------------------
  // Game State (Screen 4)
  // --------------------------
  let state: GameState | null = null;

  let selectedId: string | null = null;
  let currentLayer = 1;
  let message = "";

  let reachMap: ReachMap = {};
  let reachable: Set<string> = new Set();

  // Transition index + highlights
  let transitionsAll: any[] = [];
  let transitionsByFrom = new Map<string, any[]>();
  let sourcesOnLayer = new Set<string>();
  let targetsSameLayer = new Map<string, string>();
  let outgoingFromSelected: any[] = [];

  // Story log (placeholder for now)
  type StoryEntry = { at: string; text: string };
  let story: StoryEntry[] = [];

  // --------------------------
  // Styles (Screens + Game)
  // --------------------------
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --bg0:#05070d;
      --bg1:#070a14;
      --ink:#eaf2ff;
      --muted:rgba(234,242,255,.72);

      --card: rgba(10, 16, 34, .62);
      --card2: rgba(10, 16, 34, .42);
      --stroke: rgba(160, 210, 255, .22);
      --stroke2: rgba(160, 210, 255, .14);

      --aqua:#5fe1ff;
      --ice:#bfe8ff;
      --violet:#7a6cff;

      --radius: 18px;

      --colGap: 12px;

      /* board geometry */
      --cols: 7;
      --hexGap: 5px;
      --hexMin: 44px;
      --hexMax: 96px;

      /* board “table” tilt */
      --boardRotZ: -6deg;
      --boardRotX: 10deg;
    }

    *{ box-sizing:border-box; }
    html,body{ height:100%; }
    body{
      margin:0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      color:var(--ink);
      background:
        radial-gradient(1200px 800px at 20% 10%, rgba(95,225,255,.10), transparent 60%),
        radial-gradient(900px 700px at 85% 30%, rgba(122,108,255,.12), transparent 55%),
        radial-gradient(1000px 900px at 50% 110%, rgba(0,170,255,.08), transparent 55%),
        linear-gradient(180deg, var(--bg0), var(--bg1));
      overflow-x:hidden;
      font-size: 14px;
    }
    body::before{
      content:"";
      position:fixed;
      inset:-60px;
      pointer-events:none;
      background:
        conic-gradient(from 90deg at 50% 50%,
          rgba(95,225,255,.06),
          rgba(122,108,255,.05),
          rgba(191,232,255,.06),
          rgba(95,225,255,.06));
      filter: blur(32px);
      opacity:.55;
      animation: prism 14s linear infinite;
      z-index:0;
    }
    @keyframes prism{
      0%{ transform: rotate(0deg) scale(1.05); }
      100%{ transform: rotate(360deg) scale(1.05); }
    }

    .shell{
      position:relative;
      z-index:1;
      max-width: 1400px;     /* uses more width */
      margin: 0 auto;
      padding: 18px;
      color: var(--ink);
    }
    .shell.kids{
      --card: rgba(8, 18, 46, .62);
      --card2: rgba(8, 18, 46, .42);
      --stroke: rgba(150, 230, 255, .22);
      --stroke2: rgba(150, 230, 255, .14);
      --aqua:#00d4ff;
      --violet:#7a6cff;
    }

    .topBar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom: 14px;
    }

    .brand{
      display:flex;
      align-items:center;
      gap:12px;
      padding:10px 12px;
      border-radius: 999px;
      border: 1px solid var(--stroke2);
      background: rgba(10,16,34,.35);
      box-shadow: 0 0 0 1px rgba(95,225,255,.08) inset, 0 10px 30px rgba(0,0,0,.35);
      backdrop-filter: blur(10px);
    }
    .sigil{
      width:34px; height:34px;
      border-radius: 12px;
      position:relative;
      background:
        radial-gradient(circle at 30% 30%, rgba(95,225,255,.35), transparent 55%),
        radial-gradient(circle at 70% 70%, rgba(122,108,255,.30), transparent 55%),
        rgba(10,16,34,.55);
      border:1px solid rgba(191,232,255,.22);
      box-shadow: 0 0 28px rgba(95,225,255,.12);
      flex: 0 0 auto;
    }
    .sigil:before{
      content:"";
      position:absolute; inset:7px;
      border-radius:10px;
      border:1px solid rgba(191,232,255,.28);
      transform: rotate(45deg);
      opacity:.8;
    }
    .titlebox{ display:flex; flex-direction:column; line-height:1.1; }
    .brandTitle{
      font-weight:850;
      letter-spacing:.2px;
      font-size: 15px;
    }
    .crumb{ opacity:.85; font-size: 13px; color: var(--muted); }

    .view{ display:none; }
    .view.active{ display:block; }

    .card{
      border: 1px solid rgba(191,232,255,.20);
      background: linear-gradient(180deg, rgba(10,16,34,.58), rgba(10,16,34,.34));
      border-radius: calc(var(--radius) + 6px);
      padding: 14px;
      box-shadow:
        0 0 0 1px rgba(95,225,255,.10) inset,
        0 18px 60px rgba(0,0,0,.45);
      position:relative;
      overflow:hidden;
    }
    .card::before{
      content:"";
      position:absolute; inset:0;
      background:
        radial-gradient(circle at 18% 20%, rgba(95,225,255,.10), transparent 40%),
        radial-gradient(circle at 85% 35%, rgba(122,108,255,.10), transparent 45%),
        repeating-linear-gradient(
          135deg,
          rgba(191,232,255,.06) 0px,
          rgba(191,232,255,.06) 1px,
          transparent 1px,
          transparent 16px
        );
      opacity:.50;
      pointer-events:none;
    }
    .card > *{ position:relative; z-index:1; }

    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 980px){ .grid{ grid-template-columns: 1fr; } }

    h1{margin:0;font-size:42px;letter-spacing:.3px}
    h2{margin:0 0 10px 0;font-size:18px}
    h3{margin:0 0 10px 0;font-size:15px}
    .hint{opacity:.85;font-size:13px;color:var(--muted)}
    .muted{opacity:.82}

    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .btn{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(191,232,255,.18);
      background: rgba(10,16,34,.28);
      color: var(--ink);
      cursor:pointer;
      user-select:none;
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset, 0 10px 24px rgba(0,0,0,.22);
    }
    .btn:hover{border-color:rgba(191,232,255,.34)}
    .btn.primary{
      border-color: rgba(95,225,255,.42);
      background: rgba(95,225,255,.14);
    }
    .btn.small{padding:6px 8px;border-radius:10px;font-size:12px}

    /* ✅ Start screen: 3-column grid (tile | empty gap | tile) */
    .modeGrid{
      display:grid;
      grid-template-columns: 1fr 96px 1fr;
      align-items: stretch;
      width: 100%;
    }
    @media (max-width: 980px){
      .modeGrid{
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }

    /* ✅ Start tiles: background image + overlay */
    .modeTile{
      position: relative;
      height: 150px;
      width: 100%;
      border-radius: 22px;
      overflow: hidden;
      border: 1px solid rgba(191,232,255,.20);
      background: rgba(10,16,34,.28);
      cursor: pointer;
      user-select: none;
      padding: 0;
      box-shadow: 0 0 0 1px rgba(95,225,255,.08) inset, 0 14px 34px rgba(0,0,0,.35);
    }
    .modeTile:hover{ border-color: rgba(191,232,255,.34); }
    .modeTile.primary{
      border-color: rgba(95,225,255,.48);
      box-shadow: 0 0 0 3px rgba(95,225,255,.10) inset, 0 14px 34px rgba(0,0,0,.38);
    }
    .modeBg{
      position:absolute;
      inset:0;
      background-size: cover;
      background-position: center;
      filter: saturate(1.05) contrast(1.05);
    }
    .modeShade{
      position:absolute;
      inset:0;
      background: linear-gradient(90deg,
        rgba(0,0,0,.62) 0%,
        rgba(0,0,0,.40) 42%,
        rgba(0,0,0,.18) 100%
      );
    }
    .modeContent{
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 14px;
      padding: 16px 18px;
    }
    .modeTextWrap{
      display:flex;
      flex-direction:column;
      justify-content:center;
      min-width: 0;
      text-align:left;
    }
    .modeTextWrap .title{
      font-weight: 900;
      font-size: 22px;
      line-height: 1.05;
    }
    .modeTextWrap .sub{
      margin-top: 8px;
      font-size: 14px;
      opacity: .85;
      line-height: 1.25;
      color: rgba(234,242,255,.80);
    }
    .modeArrow{
      flex: 0 0 auto;
      width: 46px;
      height: 46px;
      border-radius: 14px;
      display:flex;
      align-items:center;
      justify-content:center;
      border:1px solid rgba(191,232,255,.18);
      background: rgba(10,16,34,.28);
      font-size: 18px;
      opacity: .92;
    }

    .tile{
      padding: 12px;
      border-radius: 16px;
      border:1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.28);
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 10px;
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset, 0 12px 28px rgba(0,0,0,.28);
    }
    .tile:hover{border-color:rgba(191,232,255,.28)}
    .tile.selected{
      border-color: rgba(95,225,255,.42);
      box-shadow: 0 0 0 3px rgba(95,225,255,.10) inset, 0 12px 28px rgba(0,0,0,.30);
      background: rgba(95,225,255,.07);
    }
    .tileMain{min-width:0}
    .tileTitle{font-weight:800; margin-bottom: 3px}
    .tileDesc{font-size:12px; opacity:.82; line-height:1.25; color: rgba(234,242,255,.75)}

    .drop{
      border:1px dashed rgba(191,232,255,.18);
      background: rgba(10,16,34,.20);
      border-radius: 16px;
      padding: 12px;
      display:flex;
      gap: 12px;
      align-items:center;
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset;
    }
    .drop input{display:none}
    .preview{
      width:64px; height:64px;
      border-radius:16px;
      border:1px solid rgba(191,232,255,.12);
      background: rgba(0,0,0,.25);
      display:grid; place-items:center;
      overflow:hidden;
      font-size:12px;
      text-align:center;
      opacity:.85;
      flex:0 0 auto;
      white-space:pre-line;
    }
    .preview img{width:100%;height:100%;object-fit:cover;display:block}
    .field{display:flex;flex-direction:column;gap:6px;margin-top:10px}
    label{font-size:12px;opacity:.8;color:rgba(234,242,255,.75)}
    input[type="text"]{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(191,232,255,.18);
      background: rgba(10,16,34,.28);
      color: var(--ink);
      outline:none;
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset;
    }

    /* --- Screen 4 (3-column) --- */
    .gameShell{
      display:flex;
      flex-direction:column;
      gap: 12px;
      min-height: calc(100vh - 120px);
    }

    .gameTop{
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }
    .gameTitle{ display:flex; flex-direction:column; gap:6px; }
    .gameTitle h1{ font-size: 34px; }
    .gameControls{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
    }
    select,button{padding:8px 10px;border-radius:12px;border:1px solid rgba(191,232,255,.18);background:rgba(10,16,34,.28);color:var(--ink)}
    button{cursor:pointer}
    select:hover,button:hover{border-color:rgba(191,232,255,.32)}

    .gameGrid{
      flex:1;
      min-height: 0;
      display:grid;
      grid-template-columns: 320px 1fr 320px; /* story | board | images */
      gap: var(--colGap);
      align-items: stretch;
    }
    @media (max-width: 1100px){
      .gameGrid{
        grid-template-columns: 1fr;
      }
    }

    .panel{
      height: 100%;
      min-height: 0;
      border-radius: var(--radius);
      border: 1px solid rgba(160, 210, 255, .22);
      background: rgba(10,16,34,.45);
      overflow:hidden;
      box-shadow:
        0 0 0 1px rgba(95,225,255,.10) inset,
        0 18px 40px rgba(0,0,0,.35);
      display:flex;
      flex-direction:column;
    }
    .panelHead{
      padding:10px 12px;
      border-bottom: 1px solid rgba(191,232,255,.14);
      background: linear-gradient(180deg, rgba(10,16,34,.62), rgba(10,16,34,.30));
      backdrop-filter: blur(10px);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      flex: 0 0 auto;
    }
    .tag{
      font-size:11px;
      color: var(--muted);
      display:flex;
      align-items:center;
      gap:8px;
      opacity:.95;
    }
    .dot{
      width:8px; height:8px; border-radius:99px;
      background: radial-gradient(circle at 30% 30%, var(--ice), var(--aqua));
      box-shadow: 0 0 12px rgba(95,225,255,.35);
    }
    .pill{
      font-size:11px;
      color: var(--muted);
      padding:6px 10px;
      border-radius:999px;
      border: 1px solid rgba(191,232,255,.16);
      background: rgba(10,16,34,.30);
    }
    .pill strong{ color: var(--ink); }

    .panelBody{
      flex:1;
      min-height:0;
      overflow:auto;
      padding: 12px;
      background: rgba(10,16,34,.30);
    }

    /* small, consistent text blocks */
    .infoText{
      font-size: 12px;
      line-height: 1.35;
      color: rgba(234,242,255,.86);
    }
    .infoText b{ font-weight: 800; color: rgba(234,242,255,.96); }

    .softCard{
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.16);
      background: rgba(10,16,34,.28);
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset, 0 12px 28px rgba(0,0,0,.28);
      padding: 12px;
      overflow:hidden;
    }

    /* middle/board panel: top info grid + msg + board fills remaining */
    .boardColumn{
      display:flex;
      flex-direction:column;
      min-height:0;
    }
    .infoTopGrid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    @media (max-width: 1100px){
      .infoTopGrid{ grid-template-columns: 1fr; }
    }
    .msgBar{
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.30);
      color: rgba(234,242,255,.88);
      font-size: 12px;
      line-height: 1.35;
      flex: 0 0 auto;
    }

    .boardStage{
      margin-top: 10px;
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 12px;
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.16);
      background: rgba(10,16,34,.20);
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset;
    }

    /* board tilt wrapper */
    .boardTilt{
      perspective: 1100px;
      transform-style: preserve-3d;
    }
    .boardInner{
      transform: rotateX(var(--boardRotX)) rotateZ(var(--boardRotZ));
      transform-origin: center;
      transform-style: preserve-3d;
    }

    /* responsive hex sizing: "100% minus gaps then /7" + min/max */
    .hexRow{
      display:flex;
      gap: var(--hexGap);
      align-items:center;
      width: 100%;
    }
    .hexRow.offset{
      padding-left: calc((var(--hexW) / 2) + (var(--hexGap) / 2));
    }

    .boardInner{
      --hexW: clamp(
        var(--hexMin),
        calc((100% - ( (var(--cols) - 1) * var(--hexGap) )) / var(--cols)),
        var(--hexMax)
      );
    }

    /* Hex tile base (size + shape) */
    .hex{
      width: var(--hexW);
      height: calc(var(--hexW) * 0.88);
      clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%);

      display:flex;
      align-items:center;
      justify-content:center;

      cursor:pointer;
      user-select:none;

      font-size: 11px;
      line-height: 1.1;
      font-weight: 800;

      /* allow pseudo layers */
      position: relative;
      overflow: visible;

      /* 3D controls */
      --z: 10px;
      transform-style: preserve-3d;
    }

    /* 3D extrusion/base */
    .hex::before{
      content:"";
      position:absolute;
      inset:0;
      clip-path: inherit;
      transform: translate3d(6px, var(--z), -2px);
      background: linear-gradient(135deg, rgba(0,0,0,.22), rgba(0,0,0,.40));
      opacity: .95;
      z-index: -2;
      filter: blur(.15px);
    }

    /* Hex glow base (ported from Uiverse button) */
    .hex{
      /* defaults */
      --glow-color: rgba(255,255,255,.35);
      --glow-spread-color: rgba(255,255,255,.18);
      --enhanced-glow-color: rgba(255,255,255,.55);
      --btn-color: rgba(255,255,255,.06);

      border: .18em solid var(--glow-color);
      background-color: var(--btn-color);
      color: rgba(232,232,232,.92);

      box-shadow:
        0 0 .8em .18em var(--glow-color),
        0 0 2.2em .7em var(--glow-spread-color),
        inset 0 0 .55em .18em var(--glow-color);

      text-shadow: 0 0 .45em var(--glow-color);
      transition: transform .12s ease, filter .12s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease;
      z-index: 1;

      /* subtle top-face lighting */
      background-image:
        linear-gradient(180deg, rgba(255,255,255,.14), transparent 45%),
        radial-gradient(circle at 30% 25%, rgba(255,255,255,.10), transparent 55%);
      background-blend-mode: screen;
    }

    /* Optional “floor glow” under hex */
    .hex::after{
      pointer-events:none;
      content:"";
      position:absolute;
      left:-6%;
      right:-6%;
      top: 105%;
      height: 90%;
      background-color: var(--glow-spread-color);
      filter: blur(1.25em);
      opacity: .55;
      transform: perspective(1.5em) rotateX(35deg) scale(1, .6);
      z-index: -1;
    }

    .hex:hover{
      transform: translateY(-1px) scale(1.02);
      filter: brightness(1.08);
    }
    .hex:active{
      transform: translateY(0px) scale(0.99);
      box-shadow:
        0 0 .55em .18em var(--glow-color),
        0 0 1.6em .8em var(--glow-spread-color),
        inset 0 0 .4em .18em var(--glow-color);
    }

    /* State themes (variables only) */
    .hex.reach{
      --glow-color: rgba(76,175,80,.95);
      --glow-spread-color: rgba(76,175,80,.45);
      --btn-color: rgba(76,175,80,.10);
    }
    .hex.player{
      --glow-color: rgba(76,175,80,1);
      --glow-spread-color: rgba(76,175,80,.55);
      --btn-color: rgba(76,175,80,.18);
      --z: 14px;
    }
    .hex.goal{
      --glow-color: rgba(255,193,7,1);
      --glow-spread-color: rgba(255,193,7,.55);
      --btn-color: rgba(255,193,7,.14);
      --z: 12px;
    }
    .hex.blocked{
      --glow-color: rgba(244,67,54,.95);
      --glow-spread-color: rgba(244,67,54,.45);
      --btn-color: rgba(244,67,54,.10);
      opacity: .82;
      --z: 7px;
    }
    .hex.missing{
      --glow-color: rgba(255,255,255,.16);
      --glow-spread-color: rgba(255,255,255,.10);
      --btn-color: rgba(255,255,255,.04);
      opacity: .45;
      --z: 5px;
    }
    .hex.fog{
      --glow-color: rgba(255,255,255,.18);
      --glow-spread-color: rgba(0,0,0,.45);
      --btn-color: rgba(0,0,0,.28);
      opacity: .62;
      --z: 4px;
    }
    .hex.trSrc{
      --glow-color: rgba(255,152,0,1);
      --glow-spread-color: rgba(255,152,0,.55);
      --btn-color: rgba(255,152,0,.10);
      --z: 12px;
    }
    .hex.trTgt{
      --glow-color: rgba(3,169,244,1);
      --glow-spread-color: rgba(3,169,244,.55);
      --btn-color: rgba(3,169,244,.10);
      animation: pulse 1.2s ease-in-out infinite;
      --z: 12px;
    }
    @keyframes pulse{
      0%{filter:brightness(1)}
      50%{filter:brightness(1.35)}
      100%{filter:brightness(1)}
    }

    /* Priority overrides */
    .hex.trTgt{ opacity: 1; }
    .hex.player{ opacity: 1; }
    .hex.goal{ opacity: 1; }

    .hex.sel{
      outline: 2px solid rgba(234,242,255,.7);
      outline-offset: 2px;
    }

    /* story list */
    .list{
      display:flex;
      flex-direction:column;
      gap: 10px;
    }
    .storyItem{
      border-bottom: 1px solid rgba(191,232,255,.10);
      padding-bottom: 10px;
    }
    .storyItem:last-child{ border-bottom:none; padding-bottom:0; }
    .storyAt{ font-size: 11px; color: rgba(234,242,255,.60); margin-bottom: 6px; }
    .storyText{ font-size: 12px; line-height: 1.35; color: rgba(234,242,255,.86); }

    /* images column */
    .imgCol{
      display:flex;
      flex-direction:column;
      gap: 10px;
      height: 100%;
      min-height: 0;
    }
    .imgFrame{
      flex: 1;
      min-height: 0;
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.16);
      background: rgba(10,16,34,.22);
      overflow:hidden;
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset, 0 12px 28px rgba(0,0,0,.28);
      display:flex;
      flex-direction:column;
    }
    .imgTop{
      padding: 10px 10px;
      border-bottom: 1px solid rgba(191,232,255,.12);
      background: linear-gradient(180deg, rgba(10,16,34,.55), rgba(10,16,34,.28));
      font-size: 11px;
      color: rgba(234,242,255,.72);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 10px;
    }
    .img{
      width: 100%;
      height: 100%;
      object-fit: cover;
      display:block;
      background: rgba(0,0,0,.18);
    }
    .imgPh{
      flex:1;
      display:grid;
      place-items:center;
      color: rgba(234,242,255,.70);
      font-size: 12px;
      background:
        radial-gradient(500px 240px at 20% 20%, rgba(95,225,255,.10), transparent 60%),
        radial-gradient(500px 240px at 80% 40%, rgba(122,108,255,.10), transparent 60%),
        rgba(10,16,34,.18);
    }
  `;
  document.head.appendChild(style);

  // --------------------------
  // Root layout
  // --------------------------
  root.innerHTML = "";
  const shell = el("div", "shell");

  const topBar = el("div", "topBar");
  const brand = el("div", "brand");
  const sig = el("div", "sigil");
  const titlebox = el("div", "titlebox");
  const brandTitle = el("div", "brandTitle");
  brandTitle.textContent = "HEXLOG";
  const crumb = el("div", "crumb");
  titlebox.append(brandTitle, crumb);
  brand.append(sig, titlebox);

  topBar.append(brand);

  const vStart = el("section", "view");
  const vSelect = el("section", "view");
  const vSetup = el("section", "view");
  const vGame = el("section", "view");

  shell.append(topBar, vStart, vSelect, vSetup, vGame);
  root.appendChild(shell);

  function setScreen(next: Screen) {
    screen = next;
    [vStart, vSelect, vSetup, vGame].forEach((v) => v.classList.remove("active"));
    const name =
      next === "start" ? "Start" : next === "select" ? "Select Game" : next === "setup" ? "Setup" : "In Game";
    crumb.textContent = name;

    if (next === "start") vStart.classList.add("active");
    if (next === "select") vSelect.classList.add("active");
    if (next === "setup") vSetup.classList.add("active");
    if (next === "game") vGame.classList.add("active");
  }

  function applyModeTheme() {
    shell.classList.toggle("kids", mode === "kids");
  }

  async function loadModeContent(nextMode: Mode) {
    mode = nextMode;
    applyModeTheme();

    const base = mode === "kids" ? "kids/" : "";
    const manifest = await fetchJson<Manifest>(`${base}scenarios/manifest.json`);
    initialPath = manifest.initial;
    scenarios = await Promise.all(manifest.files.map((f) => loadScenario(`${base}${f}`)));

    const initialBase = initialPath.split("/").pop()?.replace(".json", "") ?? "";
    scenarioIndex = Math.max(
      0,
      scenarios.findIndex(
        (s: any) => String((s as any).id ?? "") === initialBase || String((s as any).name ?? "") === initialBase
      )
    );
  }

  // --------------------------
  // Screen 1: Start
  // --------------------------
  function renderStart() {
    vStart.innerHTML = "";
    const card = el("div", "card");

    const h = el("h1");
    h.textContent = "Hex Layers Puzzle";

    const p = el("div", "hint");
    p.textContent = "Choose a version, then select a scenario, set up, and play.";

    const grid = el("div", "modeGrid");

    // ✅ GitHub Pages safe base
    const baseUrl = import.meta.env.BASE_URL; // e.g. "/TestGame/" on GH pages
    const regularImg = `${baseUrl}images/ui/regular.png`;
    const kidsImg = `${baseUrl}images/ui/kids.png`;

    function makeTile(opts: {
      primary?: boolean;
      title: string;
      sub: string;
      bgUrl: string;
      onClick: () => void;
    }) {
      const btn = el("button", `modeTile${opts.primary ? " primary" : ""}`) as HTMLButtonElement;
      btn.type = "button";

      const bg = el("div", "modeBg") as HTMLDivElement;
      bg.style.backgroundImage = `url("${opts.bgUrl}")`;

      const shade = el("div", "modeShade");

      const content = el("div", "modeContent");
      const text = el("div", "modeTextWrap");
      text.innerHTML = `
        <div class="title">${escapeHtml(opts.title)}</div>
        <div class="sub">${escapeHtml(opts.sub)}</div>
      `;

      const arrow = el("div", "modeArrow");
      arrow.textContent = "→";

      content.append(text, arrow);
      btn.append(bg, shade, content);

      btn.addEventListener("click", opts.onClick);

      return { btn, arrow };
    }

    const { btn: regularBtn, arrow: regularArrow } = makeTile({
      primary: true,
      title: "Regular version",
      sub: "Standard tone and enemies",
      bgUrl: regularImg,
      onClick: async () => {
        try {
          regularBtn.disabled = true;
          regularArrow.textContent = "…";
          await loadModeContent("regular");
          chosenPlayer = null;
          chosenMonsters = [];
          renderSelect();
          setScreen("select");
        } catch (e: any) {
          alert(String(e?.message ?? e));
          regularBtn.disabled = false;
          regularArrow.textContent = "→";
        }
      },
    });

    const { btn: kidsBtn, arrow: kidsArrow } = makeTile({
      title: "Kids / Friendly",
      sub: "Brighter UI, non-scary foes",
      bgUrl: kidsImg,
      onClick: async () => {
        try {
          kidsBtn.disabled = true;
          kidsArrow.textContent = "…";
          await loadModeContent("kids");
          chosenPlayer = null;
          chosenMonsters = [];
          renderSelect();
          setScreen("select");
        } catch (e: any) {
          alert(String(e?.message ?? e));
          kidsBtn.disabled = false;
          kidsArrow.textContent = "→";
        }
      },
    });

    const spacer = document.createElement("div");
    grid.append(regularBtn, spacer, kidsBtn);

    card.append(h, p, grid);
    vStart.appendChild(card);
  }

  // --------------------------
  // Screen 2: Scenario select
  // --------------------------
  function scenarioLabel(s: any, i: number) {
    return String(s?.name ?? s?.title ?? s?.id ?? `Scenario ${i + 1}`);
  }

  function renderSelect() {
    vSelect.innerHTML = "";

    const layout = el("div", "grid");
    const left = el("div", "card");
    const right = el("div", "card");
    layout.append(left, right);

    const h2 = el("h2");
    h2.textContent = "Select scenario";
    left.appendChild(h2);

    const listWrap = el("div");
    listWrap.style.display = "grid";
    listWrap.style.gap = "10px";

    scenarios.forEach((s: any, i) => {
      const tile = el("div", "tile");
      if (i === scenarioIndex) tile.classList.add("selected");

      const main = el("div", "tileMain");
      const t = el("div", "tileTitle");
      t.textContent = scenarioLabel(s, i);
      const d = el("div", "tileDesc");
      d.textContent = String(s?.desc ?? s?.description ?? "—");
      main.append(t, d);

      const badge = el("div", "hint");
      badge.textContent = `#${i + 1}`;

      tile.append(main, badge);
      tile.addEventListener("click", () => {
        scenarioIndex = i;
        renderSelect();
      });

      listWrap.appendChild(tile);
    });

    left.appendChild(listWrap);

    const actions = el("div", "row");
    actions.style.marginTop = "12px";

    const back = el("button", "btn");
    back.textContent = "Back";
    back.addEventListener("click", () => {
      renderStart();
      setScreen("start");
    });

    const next = el("button", "btn primary");
    next.textContent = "Continue";
    next.addEventListener("click", () => {
      renderSetup();
      setScreen("setup");
    });

    actions.append(back, next);
    left.appendChild(actions);

    const h3 = el("h2");
    h3.textContent = "Selected";
    right.appendChild(h3);

    const s: any = scenarios[scenarioIndex];
    const details = el("div", "hint");
    details.innerHTML = `
      <div><b>${escapeHtml(scenarioLabel(s, scenarioIndex))}</b></div>
      <div class="muted" style="margin-top:6px;">
        ${escapeHtml(String(s?.desc ?? s?.description ?? "No description."))}
      </div>
      <div class="hint" style="margin-top:10px;">Mode: <b>${escapeHtml(mode ?? "—")}</b></div>
      <div class="hint">Tutorial/Demo are scenarios (locked)</div>
    `;
    right.appendChild(details);

    vSelect.appendChild(layout);
  }

  // --------------------------
  // Screen 3: Setup
  // --------------------------
  function getPlayerPresets() {
    return mode === "kids" ? PLAYER_PRESETS_KIDS : PLAYER_PRESETS_REGULAR;
  }
  function getMonsterPresets() {
    return mode === "kids" ? MONSTER_PRESETS_KIDS : MONSTER_PRESETS_REGULAR;
  }
  function monstersLabel() {
    return mode === "kids" ? "Creatures / baddies" : "Monsters / bad guys";
  }

  function renderSetup() {
    vSetup.innerHTML = "";

    const layout = el("div", "grid");
    const left = el("div", "card");
    const right = el("div", "card");
    layout.append(left, right);

    // Player
    const h2 = el("h2");
    h2.textContent = "Choose your player";
    left.appendChild(h2);

    const presetWrap = el("div");
    presetWrap.style.display = "grid";
    presetWrap.style.gap = "10px";

    for (const p of getPlayerPresets()) {
      const tile = el("div", "tile");
      const selected = chosenPlayer?.kind === "preset" && (chosenPlayer as any).id === p.id;
      if (selected) tile.classList.add("selected");

      const main = el("div", "tileMain");
      const t = el("div", "tileTitle");
      t.textContent = p.name;
      const d = el("div", "tileDesc");
      d.textContent = p.blurb;
      main.append(t, d);

      const badge = el("div", "hint");
      badge.textContent = "Preset";

      tile.append(main, badge);
      tile.addEventListener("click", () => {
        chosenPlayer = { kind: "preset", id: p.id, name: p.name };
        renderSetup();
      });

      presetWrap.appendChild(tile);
    }
    left.appendChild(presetWrap);

    const customCard = el("div", "card");
    (customCard as HTMLElement).style.background = "rgba(10,16,34,.30)";
    (customCard as HTMLElement).style.marginTop = "12px";

    const h3 = el("h3");
    h3.textContent = "Custom player";

    const drop = el("div", "drop");
    const preview = el("div", "preview");
    preview.textContent = "Drop\nImage";

    const controls = el("div");
    controls.style.flex = "1";
    controls.style.minWidth = "220px";

    const row = el("div", "row");
    const pickBtn = el("button", "btn small");
    pickBtn.textContent = "Upload image";

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    pickBtn.addEventListener("click", () => input.click());

    row.append(pickBtn, el("div", "hint"));
    (row.lastChild as HTMLElement).textContent = "PNG/JPG";

    const nameField = el("div", "field");
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "Enter name...";
    nameInput.value = chosenPlayer?.kind === "custom" ? chosenPlayer.name : "";

    nameField.append(nameLabel, nameInput);
    controls.append(row, nameField);
    drop.append(preview, controls, input);

    let customPlayerImage: string | null = chosenPlayer?.kind === "custom" ? chosenPlayer.imageDataUrl : null;
    wireDropZone(drop, input, preview, (url) => (customPlayerImage = url));

    const useCustom = el("button", "btn");
    useCustom.textContent = "Use custom player";
    useCustom.addEventListener("click", () => {
      const nm = nameInput.value.trim() || "Custom Player";
      chosenPlayer = { kind: "custom", name: nm, imageDataUrl: customPlayerImage };
      renderSetup();
    });

    customCard.append(h3, drop, useCustom);
    left.appendChild(customCard);

    // Monsters/Creatures (kept for later, but does not affect game UI yet)
    const mh2 = el("h2");
    mh2.textContent = monstersLabel();
    right.appendChild(mh2);

    const mpresetWrap = el("div");
    mpresetWrap.style.display = "grid";
    mpresetWrap.style.gap = "10px";

    for (const m of getMonsterPresets()) {
      const tile = el("div", "tile");
      const isSelected = chosenMonsters.some((x) => x.kind === "preset" && x.id === m.id);
      if (isSelected) tile.classList.add("selected");

      const main = el("div", "tileMain");
      const t = el("div", "tileTitle");
      t.textContent = m.name;
      const d = el("div", "tileDesc");
      d.textContent = m.blurb;
      main.append(t, d);

      const badge = el("div", "hint");
      badge.textContent = isSelected ? "Selected" : "Preset";
      tile.append(main, badge);

      tile.addEventListener("click", () => {
        if (isSelected) {
          chosenMonsters = chosenMonsters.filter((x) => !(x.kind === "preset" && x.id === m.id));
        } else {
          chosenMonsters.push({
            id: m.id,
            name: m.name,
            notes: m.blurb,
            imageDataUrl: null,
            kind: "preset",
          });
        }
        renderSetup();
      });

      mpresetWrap.appendChild(tile);
    }
    right.appendChild(mpresetWrap);

    // Footer actions
    const footer = el("div", "row");
    (footer as HTMLElement).style.marginTop = "14px";
    (footer as HTMLElement).style.justifyContent = "space-between";

    const back = el("button", "btn");
    back.textContent = "Back";
    back.addEventListener("click", () => setScreen("select"));

    const startBtn = el("button", "btn primary");
    startBtn.textContent = "Start game";
    startBtn.disabled = !chosenPlayer;

    const hint = el("div", "hint");
    hint.textContent = chosenPlayer ? "Ready." : "Pick a player to continue.";

    startBtn.addEventListener("click", () => {
      if (!chosenPlayer) return;
      startScenario(scenarioIndex);
      renderGameScreen();
      setScreen("game");
    });

    const rightPack = el("div", "row");
    rightPack.append(hint, startBtn);

    footer.append(back, rightPack);

    vSetup.appendChild(layout);
    vSetup.appendChild(footer);
  }

  // --------------------------
  // Screen 4: Game (3-column)
  // --------------------------
  let gameBuilt = false;

  function scenario(): Scenario {
    if (!scenarios.length) throw new Error("Scenarios not loaded yet.");
    return scenarios[scenarioIndex];
  }

  function recomputeReachability() {
    if (!state) return;
    reachMap = getReachability(state);
    reachable = new Set(Object.entries(reachMap).filter(([, v]) => v.reachable).map(([k]) => k));
  }

  function revealWholeLayer(layer: number) {
    if (!state) return;
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const len = ROW_LENS[r - 1] ?? 7;
      for (let c = 1; c <= len; c++) {
        revealHex(state, `L${layer}-R${r}-C${c}`);
      }
    }
  }

  function getHex(id: string): Hex | undefined {
    if (!state) return undefined;
    return (state.hexesById as any).get(id);
  }

  function isBlockedOrMissing(hex: any): { blocked: boolean; missing: boolean } {
    if (!hex) return { blocked: true, missing: true };
    return { missing: !!hex.missing, blocked: !!hex.blocked };
  }

  function isRevealed(hex: any): boolean {
    if (!hex) return false;
    return !!hex.revealed;
  }

  function setLayerOptions(layerSelect: HTMLSelectElement) {
    const layers = Number((scenario() as any).layers ?? 1);
    layerSelect.innerHTML = "";
    for (let i = 1; i <= layers; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Layer ${i}`;
      layerSelect.appendChild(opt);
    }
    if (currentLayer > layers) currentLayer = 1;
    layerSelect.value = String(currentLayer);
  }

  function rebuildTransitionIndexAndHighlights() {
    const s: any = scenario();
    transitionsAll = s.transitions ?? [];

    transitionsByFrom = new Map();
    sourcesOnLayer = new Set();

    for (const t of transitionsAll) {
      const fromId = posId(t.from);
      const toId = posId(t.to);

      const list = transitionsByFrom.get(fromId) ?? [];
      list.push({ ...t, __fromId: fromId, __toId: toId });
      transitionsByFrom.set(fromId, list);

      const fromC = idToCoord(fromId);
      if (fromC?.layer === currentLayer) sourcesOnLayer.add(fromId);
    }

    outgoingFromSelected = selectedId ? (transitionsByFrom.get(selectedId) ?? []) : [];
    targetsSameLayer = new Map();

    for (const t of outgoingFromSelected) {
      const toId = t.__toId;
      const toC = idToCoord(toId);
      if (toC?.layer === currentLayer) {
        const typ = String(t.type ?? "UP").toUpperCase();
        const badge = typ === "DOWN" ? "▼" : "▲";
        targetsSameLayer.set(toId, badge);
      }
    }
  }

  function pushStory(text: string) {
    story.push({ at: new Date().toLocaleString(), text });
    if (story.length > 80) story = story.slice(-80);
  }

  function startScenario(idx: number) {
    scenarioIndex = idx;

    state = newGame(scenario());
    selectedId = state.playerHexId ?? null;
    currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;

    enterLayer(state, currentLayer);
    revealWholeLayer(currentLayer);
    recomputeReachability();

    message = "";
    story = [];
    pushStory(`Run started. Build: ${BUILD_TAG}`);
    pushStory(`Player spawned at ${state.playerHexId}. Goal: ${posId((scenario() as any).goal)}.`);
  }

  function renderGameScreen() {
    if (gameBuilt) {
      renderAllGame();
      return;
    }
    gameBuilt = true;

    vGame.innerHTML = "";

    const shellGame = el("div", "gameShell");

    // Top row
    const top = el("div", "gameTop");

    const titleWrap = el("div", "gameTitle");
    const title = el("h1");
    title.textContent = "Game";
    const sub = el("div", "hint");
    const sc: any = scenarios[scenarioIndex];
    sub.textContent = `Mode: ${mode ?? "—"} | Scenario: ${String(sc?.name ?? sc?.title ?? sc?.id ?? "")} | Build: ${BUILD_TAG}`;
    titleWrap.append(title, sub);

    const controls = el("div", "gameControls");

    const scenarioSelect = el("select") as HTMLSelectElement;
    scenarios.forEach((s: any, i: number) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String((s as any).name ?? (s as any).title ?? (s as any).id ?? `Scenario ${i + 1}`);
      scenarioSelect.appendChild(opt);
    });
    scenarioSelect.value = String(scenarioIndex);

    const layerSelect = el("select") as HTMLSelectElement;

    const endTurnBtn = el("button") as HTMLButtonElement;
    endTurnBtn.textContent = "End turn";

    const resetBtn = el("button") as HTMLButtonElement;
    resetBtn.textContent = "Reset run";

    const forceRevealBtn = el("button") as HTMLButtonElement;
    forceRevealBtn.textContent = "Force reveal layer";

    const exitBtn = el("button") as HTMLButtonElement;
    exitBtn.textContent = "Exit";
    exitBtn.addEventListener("click", () => {
      // allow re-entering setup without stale game UI issues
      gameBuilt = false;
      vGame.innerHTML = "";
      renderSetup();
      setScreen("setup");
    });

    controls.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn, forceRevealBtn, exitBtn);
    top.append(titleWrap, controls);

    // 3-column grid
    const grid = el("div", "gameGrid");

    // (1) Story (left)
    const storyPanel = el("section", "panel");
    const storyHead = el("div", "panelHead");
    storyHead.innerHTML = `<div class="tag"><span class="dot"></span> Story Log</div><div class="pill"><strong>Run</strong></div>`;
    const storyBody = el("div", "panelBody");
    const storyList = el("div", "list");
    storyBody.appendChild(storyList);
    storyPanel.append(storyHead, storyBody);

    // (2) Board (middle)
    const boardPanel = el("section", "panel boardColumn");
    const boardHead = el("div", "panelHead");
    boardHead.innerHTML = `<div class="tag"><span class="dot"></span> Board</div><div class="pill"><strong>Hex</strong> grid</div>`;

    const boardBody = el("div", "panelBody");
    boardBody.style.overflow = "hidden"; // we control scrolling inside stage

    const infoTop = el("div", "infoTopGrid");
    const infoLeft = el("div", "softCard infoText");
    const infoRight = el("div", "softCard infoText");
    infoTop.append(infoLeft, infoRight);

    const msgBar = el("div", "msgBar");

    const stage = el("div", "boardStage");
    const tilt = el("div", "boardTilt");
    const boardInner = el("div", "boardInner");
    tilt.appendChild(boardInner);
    stage.appendChild(tilt);

    boardBody.append(infoTop, msgBar, stage);
    boardPanel.append(boardHead, boardBody);

    // (3) Images (right)
    const imgPanel = el("section", "panel");
    const imgHead = el("div", "panelHead");
    imgHead.innerHTML = `<div class="tag"><span class="dot"></span> Images</div><div class="pill"><strong>2</strong></div>`;
    const imgBody = el("div", "panelBody");
    imgBody.style.overflow = "hidden";

    const imgCol = el("div", "imgCol");

    const playerFrame = el("div", "imgFrame");
    const playerTop = el("div", "imgTop");
    playerTop.innerHTML = `<div>Player</div><div class="hint">${escapeHtml(chosenPlayer?.name ?? "—")}</div>`;
    const playerSlot = el("div", "imgPh");
    playerSlot.textContent = "Player image";
    playerFrame.append(playerTop, playerSlot);

    const hexFrame = el("div", "imgFrame");
    const hexTop = el("div", "imgTop");
    hexTop.innerHTML = `<div>Current hex</div><div class="hint">Landscape later</div>`;
    const hexSlot = el("div", "imgPh");
    hexSlot.textContent = "Hex image";
    hexFrame.append(hexTop, hexSlot);

    imgCol.append(playerFrame, hexFrame);
    imgBody.appendChild(imgCol);
    imgPanel.append(imgHead, imgBody);

    grid.append(storyPanel, boardPanel, imgPanel);
    shellGame.append(top, grid);
    vGame.appendChild(shellGame);

    // --------------------------
    // Render helpers (game)
    // --------------------------
    function renderStory() {
      storyList.innerHTML = "";
      if (!story.length) {
        const e = el("div", "hint");
        e.textContent = "No story yet.";
        storyList.appendChild(e);
        return;
      }
      for (let i = story.length - 1; i >= 0; i--) {
        const s = story[i];
        const item = el("div", "storyItem");
        const at = el("div", "storyAt");
        at.textContent = s.at;
        const tx = el("div", "storyText");
        tx.textContent = s.text;
        item.append(at, tx);
        storyList.appendChild(item);
      }
    }

    function renderImages() {
      // player
      const playerName = chosenPlayer?.name ?? "—";
      playerTop.innerHTML = `<div>Player</div><div class="hint">${escapeHtml(playerName)}</div>`;

      // swap placeholder with image if custom uploaded
      const customUrl = chosenPlayer?.kind === "custom" ? chosenPlayer.imageDataUrl : null;
      if (customUrl) {
        playerSlot.innerHTML = `<img class="img" alt="Player" src="${customUrl}">`;
      } else {
        playerSlot.innerHTML = "";
        const ph = el("div", "imgPh");
        ph.textContent = chosenPlayer ? "Preset (add art later)" : "Player image";
        playerSlot.replaceWith(ph);
        // restore reference
        (playerFrame.children[1] as HTMLElement).replaceWith(ph);
        // ensure slot points to correct node
        // (we won't use playerSlot further after this render, so fine)
      }

      // current hex “image” placeholder text
      const cur = state?.playerHexId ?? "—";
      hexTop.innerHTML = `<div>Current hex</div><div class="hint">${escapeHtml(cur)}</div>`;
      hexSlot.textContent = selectedId ? `Selected: ${selectedId}` : `On: ${cur}`;
    }

    function renderInfoTop() {
      const s: any = scenario();

      infoLeft.innerHTML = `
        <div><b>Scenario:</b> ${escapeHtml(String(s.name ?? s.title ?? s.id ?? ""))}</div>
        <div><b>Mode:</b> ${escapeHtml(String(mode ?? "—"))}</div>
        <div><b>Player:</b> ${escapeHtml(String(state?.playerHexId ?? "?"))}</div>
        <div><b>Goal:</b> ${escapeHtml(String(posId(s.goal)))}</div>
        <div><b>Layer:</b> ${escapeHtml(String(currentLayer))}</div>
      `;

      if (!selectedId) {
        infoRight.innerHTML = `<div class="hint">No selection.</div>`;
        return;
      }

      const h: any = getHex(selectedId);
      const { blocked, missing } = isBlockedOrMissing(h);
      const info = reachMap[selectedId];

      const layerReachable = Array.from(reachable).filter((id) => idToCoord(id)?.layer === currentLayer).length;

      infoRight.innerHTML = `
        <div><b>Selected:</b> ${escapeHtml(selectedId)}</div>
        <div><b>Kind:</b> ${escapeHtml(String(h?.kind ?? "?"))}</div>
        <div><b>Reachable:</b> ${escapeHtml(info?.reachable ? "yes" : "no")}</div>
        <div><b>Distance:</b> ${escapeHtml(String(info?.distance ?? "—"))}</div>
        <div style="margin-top:8px; opacity:.9">
          <b>Reachable:</b> ${reachable.size} (layer ${currentLayer}: ${layerReachable})<br/>
          <b>Transitions:</b> ${transitionsAll.length} · <b>Sources (layer):</b> ${sourcesOnLayer.size} · <b>Outgoing:</b> ${outgoingFromSelected.length}<br/>
          <b>Status:</b> ${missing ? "missing" : blocked ? "blocked" : "usable"}
        </div>
      `;
    }

    function renderMessage() {
      msgBar.textContent = message || "Ready.";
    }

    function renderBoard() {
      boardInner.innerHTML = "";
      if (!state) return;

      for (let r = 1; r <= ROW_LENS.length; r++) {
        const len = ROW_LENS[r - 1] ?? 7;
        const row = el("div", "hexRow");
        if (r % 2 === 0) row.classList.add("offset");

        for (let c = 1; c <= len; c++) {
          const id = `L${currentLayer}-R${r}-C${c}`;
          const h: any = getHex(id);
          const info = reachMap[id];

          const btn = el("div", "hex");

          // shorter label (less clutter)
          btn.textContent = `${r}:${c}`;

          const { blocked, missing } = isBlockedOrMissing(h);
          const isGoal = h?.kind === "GOAL";
          const isPlayer = state.playerHexId === id;

          // IMPORTANT: class priority by add-order (later rules win if same specificity)
          if (missing) btn.classList.add("missing");
          if (blocked) btn.classList.add("blocked");
          if (!isRevealed(h)) btn.classList.add("fog");
          if (info?.reachable) btn.classList.add("reach");

          if (sourcesOnLayer.has(id)) btn.classList.add("trSrc");
          if (targetsSameLayer.has(id)) btn.classList.add("trTgt");

          if (isGoal) btn.classList.add("goal");
          if (isPlayer) btn.classList.add("player");
          if (selectedId === id) btn.classList.add("sel");

          btn.addEventListener("click", () => {
            selectedId = id;
            rebuildTransitionIndexAndHighlights();

            const res = tryMove(state!, id);
            if (res.ok) {
              message = res.won
                ? "🎉 You reached the goal!"
                : res.triggeredTransition
                ? "Moved (transition triggered)."
                : "Moved.";

              pushStory(message + ` (${id})`);

              const playerCoord = idToCoord(state!.playerHexId);
              if (playerCoord) currentLayer = playerCoord.layer;

              setLayerOptions(layerSelect);
              recomputeReachability();
              rebuildTransitionIndexAndHighlights();
              renderAllGame();
              return;
            } else {
              message = res.reason ? `Move rejected: ${res.reason}` : "Move rejected.";
              pushStory(message + ` (${id})`);
            }

            renderAllGame();
          });

          row.appendChild(btn);
        }

        boardInner.appendChild(row);
      }
    }

    function renderAllGame() {
      rebuildTransitionIndexAndHighlights();
      renderInfoTop();
      renderMessage();
      renderBoard();
      renderStory();
      renderImages();
    }

    // --------------------------
    // Wire up UI events
    // --------------------------
    scenarioSelect.addEventListener("change", () => {
      scenarioIndex = Number(scenarioSelect.value);
      startScenario(scenarioIndex);
      setLayerOptions(layerSelect);
      if (state) enterLayer(state, currentLayer);
      revealWholeLayer(currentLayer);
      recomputeReachability();
      message = "";
      pushStory(`Scenario changed: ${(scenario() as any).name ?? (scenario() as any).title ?? (scenario() as any).id}`);
      renderAllGame();
    });

    layerSelect.addEventListener("change", () => {
      currentLayer = Number(layerSelect.value);
      if (!state) return;
      const err = enterLayer(state, currentLayer);
      message = err ? `Enter layer error: ${err}` : "";
      revealWholeLayer(currentLayer);
      recomputeReachability();
      pushStory(err ? `Layer change failed: ${err}` : `Entered layer ${currentLayer}.`);
      renderAllGame();
    });

    endTurnBtn.addEventListener("click", () => {
      if (!state) return;
      endTurn(state);
      enterLayer(state, currentLayer);
      revealWholeLayer(currentLayer);
      recomputeReachability();
      message = "Turn ended.";
      pushStory(message);
      renderAllGame();
    });

    resetBtn.addEventListener("click", () => {
      startScenario(scenarioIndex);
      setLayerOptions(layerSelect);
      if (state) enterLayer(state, currentLayer);
      revealWholeLayer(currentLayer);
      recomputeReachability();
      message = "";
      pushStory("Run reset.");
      renderAllGame();
    });

    forceRevealBtn.addEventListener("click", () => {
      revealWholeLayer(currentLayer);
      recomputeReachability();
      message = "Forced reveal layer + recomputed reachability.";
      pushStory(message);
      renderAllGame();
    });

    // initial boot for game view
    setLayerOptions(layerSelect);
    if (state) enterLayer(state, currentLayer);
    revealWholeLayer(currentLayer);
    recomputeReachability();
    renderAllGame();
  }

  // --------------------------
  // Start app
  // --------------------------
  applyModeTheme();
  renderStart();
  setScreen("start");
}
