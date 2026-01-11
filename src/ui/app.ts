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

type LogEntry = {
  n: number;
  id: string;
  ok: boolean;
  reason?: string;
  t: string; // HH:MM
};

const BUILD_TAG = "BUILD_TAG_TILES_DEMO_V1";

/** Optional start-screen background (put file in public/images/ui/start-screen.jpg) */
const START_BG_URL = "images/ui/start-screen.jpg";

/**
 * Board BACKGROUND image (put file in public/images/ui/board-bg.png)
 * This is the tower-grid illusion background (NO labels).
 */
const BOARD_BG_URL = "images/ui/board-bg.png";

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
    dropEl.style.background = "rgba(95,225,255,.08)";
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

/** GitHub Pages-safe public URL helper (respects Vite BASE_URL). */
function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const clean = String(p).replace(/^\/+/, "");
  return base + clean;
}

/** Preset player image (place files at public/images/players/p1.png, p2.png, ...) */
function presetPlayerImage(id: string): string {
  return `images/players/${id}.png`;
}

function timeHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function mountApp(root: HTMLElement | null) {
  if (!root) throw new Error('Missing element with id="app"');

  // --------------------------
  // App-level state
  // --------------------------
  let screen: Screen = "start";
  let mode: Mode | null = null;

  let scenarios: Scenario[] = [];
  let initialPath = "";
  let scenarioIndex = 0;

  const PLAYER_PRESETS_REGULAR = [
    { id: "p1", name: "Aeris", blurb: "A calm force. Moves with intent." },
    { id: "p2", name: "Devlan", blurb: "A wary hunter. Reads the board." },
  ];
  const PLAYER_PRESETS_KIDS = [
    { id: "p1", name: "Sunny", blurb: "Brave, bright, and curious." },
    { id: "p2", name: "Pip", blurb: "Small steps, big wins." },
  ];

  // kept (harmless) even if you’re not using enemies
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
  // Game state
  // --------------------------
  let state: GameState | null = null;

  let selectedId: string | null = null;
  let currentLayer = 1;
  let message = "";

  let reachMap: ReachMap = {};
  let reachable: Set<string> = new Set();

  // Mini-board shifting (UI-only): shiftLeft[layer][row] = cumulative left-rotation steps
  let miniShiftLeft: Record<number, Record<number, number>> = {};

  let transitionsAll: any[] = [];
  let transitionsByFrom = new Map<string, any[]>();
  let sourcesOnLayer = new Set<string>();
  let targetsSameLayer = new Map<string, string>();
  let outgoingFromSelected: any[] = [];

  let startHexId: string | null = null;

  // Move counter + story log
  let moveCount = 0;
  let logs: LogEntry[] = [];

  // --------------------------
  // Styles
  // --------------------------
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --bg0:#05070d;
      --bg1:#070a14;
      --ink:#eaf2ff;
      --muted:rgba(234,242,255,.72);

      --card: rgba(10, 16, 34, .52);
      --card2: rgba(10, 16, 34, .38);
      --stroke: rgba(160, 210, 255, .22);
      --stroke2: rgba(160, 210, 255, .14);

      --aqua:#5fe1ff;
      --ice:#bfe8ff;
      --violet:#7a6cff;

      --radius: 18px;
      --gap: 12px;

      --tileGap: 6px;
      --tileSize: 72px;
      --tileOffset: 39px;

      /* Pastel rainbow reversed (R1 violet -> R7 red) */
      --r1: rgba(190, 170, 255, .42); /* violet */
      --r2: rgba(155, 170, 255, .40); /* indigo */
      --r3: rgba(150, 210, 255, .40); /* blue */
      --r4: rgba(165, 245, 205, .40); /* green */
      --r5: rgba(255, 245, 170, .38); /* yellow */
      --r6: rgba(255, 215, 170, .38); /* orange */
      --r7: rgba(255, 170, 190, .38); /* red */

      --baseText: 12px;
      --line: 1.35;
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
      font-size: var(--baseText);
      line-height: var(--line);
    }

    .shell{
      width: min(1480px, calc(100vw - 36px));
      margin: 0 auto;
      padding: 18px 0 26px;
      position:relative;
      z-index:1;
      color: var(--ink);
    }
    .shell.kids{
      --card: rgba(10, 22, 50, .52);
      --card2: rgba(10, 22, 50, .38);
      --aqua: #4df6ff;
      --violet: #9a7cff;
    }

    .topBar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      padding: 0 6px;
      margin-bottom: 14px;
    }
    .brand{display:flex; align-items:center; gap:10px;}
    .dotBrand{
      width:8px;height:8px;border-radius:999px;
      background: radial-gradient(circle at 30% 30%, var(--ice), var(--aqua));
      box-shadow: 0 0 12px rgba(95,225,255,.35);
    }
    .brandTitle{
      font-weight:900;
      letter-spacing:.5px;
      font-size: 16px;
    }
    .crumb{
      opacity:.85;
      font-size: 12px;
      padding-top: 2px;
      text-align:right;
    }

    .view{ display:none; }
    .view.active{ display:block; }

    .card{
      border: 1px solid var(--stroke2);
      background: var(--card);
      border-radius: var(--radius);
      padding: 14px;
      box-shadow:
        0 0 0 1px rgba(95,225,255,.08) inset,
        0 18px 50px rgba(0,0,0,.45);
      backdrop-filter: blur(10px);
    }

    h1{margin:0; font-size: 44px; letter-spacing:.2px; line-height:1.05;}
    h2{margin:0 0 10px 0; font-size: 14px; letter-spacing:.2px;}
    h3{margin:0 0 10px 0; font-size: 13px; letter-spacing:.2px;}
    .hint{opacity:.82; font-size: 12px;}
    .muted{opacity:.82}

    .row{display:flex; gap:10px; align-items:center; flex-wrap:wrap}
    .btn{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(191,232,255,.18);
      background: rgba(10,16,34,.35);
      color: var(--ink);
      cursor:pointer;
      user-select:none;
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset, 0 10px 24px rgba(0,0,0,.25);
      font-size: 12px;
      font-weight: 800;
    }
    .btn:hover{border-color:rgba(191,232,255,.30); filter: brightness(1.06);}
    .btn.primary{
      border-color: rgba(95,225,255,.35);
      background:
        radial-gradient(circle at 20% 20%, rgba(191,232,255,.18), transparent 40%),
        linear-gradient(135deg, rgba(29,78,216,.45), rgba(122,108,255,.22));
    }
    .btn.small{padding:6px 8px;border-radius:10px;font-size:11px}

    .grid2{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 980px){ .grid2{ grid-template-columns: 1fr; } }

    .tile{
      padding: 12px;
      border-radius: 16px;
      border:1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.90);
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 10px;
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset, 0 12px 28px rgba(0,0,0,.28);
    }
    .tile:hover{border-color:rgba(191,232,255,.24)}
    .tile.selected{
      border-color: rgba(95,225,255,.40);
      box-shadow: 0 0 0 3px rgba(95,225,255,.10) inset, 0 16px 36px rgba(0,0,0,.30);
    }
    .tileMain{min-width:0}
    .tileTitle{font-weight:900; margin-bottom: 3px; font-size: 12px;}
    .tileDesc{font-size:11px; opacity:.82; line-height:1.25}

    .drop{
      border:1px dashed rgba(191,232,255,.18);
      background: rgba(255,255,255,.03);
      border-radius: 16px;
      padding: 12px;
      display:flex;
      gap: 12px;
      align-items:center;
    }
    .drop input{display:none}
    .preview{
      width:64px; height:64px;
      border-radius:16px;
      border:1px solid rgba(191,232,255,.14);
      background: rgba(0,0,0,.25);
      display:grid; place-items:center;
      overflow:hidden;
      font-size:11px;
      text-align:center;
      opacity:.85;
      flex:0 0 auto;
      white-space:pre-line;
    }
    .preview img{width:100%;height:100%;object-fit:cover;display:block}
    .field{display:flex;flex-direction:column;gap:6px;margin-top:10px}
    label{font-size:11px;opacity:.8}
    input[type="text"]{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(191,232,255,.18);
      background: rgba(5,8,18,.55);
      color: var(--ink);
      outline:none;
      font-size: 12px;
      font-weight: 700;
    }

    .startHero{
      margin-top: 14px;
      border-radius: 18px;
      overflow:hidden;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(0,0,0,.18);
      min-height: 220px;
      position: relative;
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset, 0 18px 40px rgba(0,0,0,.35);
    }
    .startHero img{
      position:absolute; inset:0;
      width:100%; height:100%;
      object-fit: cover;
      display:block;
      filter: saturate(1.05) contrast(1.03);
    }
    .startHero::after{
      content:"";
      position:absolute; inset:0;
      background:
        radial-gradient(700px 340px at 20% 25%, rgba(95,225,255,.18), transparent 55%),
        radial-gradient(700px 340px at 80% 60%, rgba(122,108,255,.18), transparent 60%),
        linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.55));
      pointer-events:none;
    }
    .startHeroLabel{
      position:relative;
      padding: 14px;
      z-index: 1;
      display:flex;
      justify-content:space-between;
      align-items:flex-end;
      gap: 10px;
      min-height: 220px;
    }
    .startHeroLabel b{font-size: 13px}

    /* ===== Game grid (2 rows x 3 cols = 6 equal cells) ===== */
    .gameStage{
      border-radius: calc(var(--radius) + 6px);
      border: 1px solid rgba(191,232,255,.18);
      background: linear-gradient(180deg, rgba(10,16,34,.58), rgba(10,16,34,.30));
      box-shadow:
        0 0 0 1px rgba(95,225,255,.08) inset,
        0 18px 60px rgba(0,0,0,.55);
      overflow:hidden;
      padding: 12px;
      position:relative;
    }
    .gameGrid{
      display:grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: var(--gap);
      height: calc(100vh - 160px);
      min-height: 560px;
    }
    .panel{
      border-radius: var(--radius);
      border: 1px solid rgba(160, 210, 255, .22);
      background: rgba(10,16,34,.45);
      overflow:hidden;
      box-shadow:
        0 0 0 1px rgba(95,225,255,.08) inset,
        0 18px 40px rgba(0,0,0,.35);
      display:flex;
      flex-direction:column;
      min-width: 0;
      min-height: 0;
    }
    .panelHead{
      padding:10px 12px;
      border-bottom: 1px solid rgba(191,232,255,.14);
      background: linear-gradient(180deg, rgba(10,16,34,.62), rgba(10,16,34,.28));
      backdrop-filter: blur(10px);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      min-height: 48px;
    }
    .panelBody{
      padding: 12px;
      overflow:auto;
      min-height: 0;
      min-width: 0;
    }
    .tag{
      font-size:11px;
      color: var(--muted);
      display:flex;
      align-items:center;
      gap:8px;
      opacity:.95;
      font-weight: 900;
      letter-spacing:.2px;
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
      font-weight: 800;
      white-space: nowrap;
    }

    /* Responsive fallback for high zoom / small screens */
    @media (max-width: 1180px){
      .gameGrid{
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: auto;
        height: auto;
        min-height: 0;
      }
    }
    @media (max-width: 760px){
      .gameGrid{ grid-template-columns: 1fr; }
    }

    /* ===== Top-left (Message + Moves) ===== */
    .msgBox{
      border-radius: 14px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.24);
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset;
      padding: 10px 12px;
      font-weight: 900;
      font-size: 12px;
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .msgLeft{min-width:0; overflow:hidden; text-overflow:ellipsis;}
    .msgRight{flex:0 0 auto; opacity:.92}

    .logList{ display:flex; flex-direction:column; gap:10px; }
    .logItem{
      display:flex; justify-content:space-between; align-items:center; gap:12px;
      border-radius: 14px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.26);
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset;
      padding: 10px 12px;
      font-weight: 900;
    }
    .logItem .t{ opacity:.78; font-weight:800; }
    .logItem.bad{ border-color: rgba(255,120,120,.22); }
    .logSmall{ margin-top: 10px; opacity:.82; font-weight:800; }

    /* ===== Mini boards (circle cells) ===== */
    .miniBoardGrid{
      display:flex;
      flex-direction:column;
      gap:8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 11px;
      line-height: 1.25;
    }
    .miniRow{
      display:flex;
      gap:8px;
      align-items:center;
      flex-wrap:wrap;
    }
    .miniRow b{
      opacity:.9;
      font-weight: 900;
      min-width: 34px;
    }
    .miniRow.offset{
      padding-left: calc((24px + 8px) / 2);
    }
    .miniCell{
      width: 24px;
      height: 24px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border-radius: 999px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(0,0,0,.22);
      opacity:.95;
      font-weight: 900;
      line-height:1;
      padding: 0;
      color: rgba(234,242,255,.9);
    }
    .miniCell.on{
      border-color: rgba(76,255,80,.75);
      background: rgba(76,255,80,.18);
      box-shadow: 0 0 0 2px rgba(76,255,80,.18) inset, 0 0 16px rgba(76,255,80,.22);
      color: rgba(234,242,255,.98);
    }
    .miniCell.empty{
      opacity:.45;
      color: rgba(234,242,255,.25);
    }
    .miniNote{
      margin-top: 10px;
      opacity:.75;
      font-weight: 800;
      font-size: 11px;
    }
    .miniWarn{ color: rgba(255,120,120,.95); font-weight: 900; }

    /* ===== Main board (square inside square; no extra "cloud bumps") ===== */
    .boardCell{
      display:flex;
      flex-direction:column;
      height: 100%;
      min-height: 0;
    }
    .boardSquare{
      position:relative;
      flex: 1;
      min-height: 0;
      overflow: hidden;     /* no scrollbars */
      border-radius: 16px;
      margin: 0 auto;
    }
    .boardBg{
      position:absolute;
      inset: 0;
      pointer-events:none;
      z-index: 0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      opacity: 1;
    }
    .boardBg::after{
      content:"";
      position:absolute; inset:0;
      background:
        radial-gradient(900px 500px at 20% 20%, rgba(95,225,255,.08), transparent 60%),
        radial-gradient(900px 500px at 80% 65%, rgba(122,108,255,.08), transparent 60%),
        linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.28));
    }
    .boardCenter{
      position:relative;
      z-index: 1;
      width:100%;
      height:100%;
      display:flex;
      align-items:center;
      justify-content:center;
      padding: 0;
    }
    .boardWrap{
      display:grid;
      gap: 10px;
      width: max-content;
      transform: scale(var(--boardScale, 1));
      transform-origin: center center;
    }
    .tileRow{
      display:flex;
      gap: var(--tileGap);
      align-items:center;
      justify-content:flex-start;
      width: 100%;
    }
    .tileRow.offset{ padding-left: var(--tileOffset); }

    .cloud{
      width: var(--tileSize);
      height: var(--tileSize);
      border-radius: 999px; /* single shape ONLY (removes the two extra bumps) */
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      position:relative;
      user-select:none;
      overflow:hidden;

      /* bright glowing white border */
      border: 2px solid rgba(255,255,255,.92);

      /* soft pastel fill (set via --fill) */
      background:
        radial-gradient(circle at 30% 28%, rgba(255,255,255,.35), transparent 45%),
        radial-gradient(circle at 70% 75%, rgba(0,0,0,.10), transparent 55%),
        var(--fill, rgba(255,255,255,.18));

      box-shadow:
        0 0 0 2px rgba(255,255,255,.10) inset,
        0 0 18px rgba(255,255,255,.22);

      transition: transform .12s ease, filter .12s ease, box-shadow .18s ease;
    }
    .cloud:hover{ transform: translateY(-1px) scale(1.02); filter: brightness(1.06); }
    .cloud:active{ transform: translateY(0) scale(.99); }

    /* Row fills */
    .cloud[data-row="1"]{ --fill: var(--r1); }
    .cloud[data-row="2"]{ --fill: var(--r2); }
    .cloud[data-row="3"]{ --fill: var(--r3); }
    .cloud[data-row="4"]{ --fill: var(--r4); }
    .cloud[data-row="5"]{ --fill: var(--r5); }
    .cloud[data-row="6"]{ --fill: var(--r6); }
    .cloud[data-row="7"]{ --fill: var(--r7); }

    /* Labels: centered, always 2 rows, NO background */
    .cloudLabel{
      position:relative;
      z-index: 2;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      text-align:center;
      line-height: 1.05;
      font-weight: 1000;
      letter-spacing: .2px;
      color: rgba(255,255,255,.95);
      /* black outline via multi-shadow */
      text-shadow:
        -1px -1px 0 rgba(0,0,0,.65),
        1px -1px 0 rgba(0,0,0,.65),
        -1px 1px 0 rgba(0,0,0,.65),
        1px 1px 0 rgba(0,0,0,.65),
        0 0 10px rgba(0,0,0,.35);
      background: transparent;
      border: none;
      padding: 0;
    }

    /* Reachable tiles: subtle blue glow (no extra rings) */
    .cloud.reach{
      box-shadow:
        0 0 0 2px rgba(255,255,255,.12) inset,
        0 0 18px rgba(0,200,255,.35),
        0 0 44px rgba(0,200,255,.20);
      filter: brightness(1.03);
    }

    /* Player tile: keep THIS highlight */
    .cloud.player{
      box-shadow:
        0 0 0 2px rgba(255,255,255,.18) inset,
        0 0 24px rgba(76,255,80,.60),
        0 0 70px rgba(76,255,80,.40);
      filter: brightness(1.12);
      z-index: 4;
    }

    /* Not reachable: dim only */
    .cloud.notReach{
      opacity: .58;
      filter: saturate(.86) brightness(.92);
      cursor: not-allowed;
    }
    .cloud.notReach:hover{ transform:none; filter: saturate(.86) brightness(.92); }

    /* Selected: thin outline only */
    .cloud.sel{
      outline: 2px solid rgba(234,242,255,.55);
      outline-offset: 2px;
    }

    /* blocked/missing/fog: keep subtle, no extra shapes */
    .cloud.blocked{ opacity: .70; filter: grayscale(.35) brightness(.90); }
    .cloud.missing{ opacity: .45; filter: grayscale(.70) brightness(.82); }
    .cloud.fog{ opacity: .80; filter: saturate(.80) brightness(.92); }

    .infoText{ font-size: 12px; line-height: 1.35; }
    .infoText b{ font-weight: 900; color: rgba(234,242,255,.98); }
  `;
  document.head.appendChild(style);

  // --------------------------
  // Root layout
  // --------------------------
  root.innerHTML = "";
  const shell = el("div", "shell");

  const topBar = el("div", "topBar");
  const brand = el("div", "brand");
  const brandDot = el("div", "dotBrand");
  const brandTitle = el("div", "brandTitle");
  brandTitle.textContent = "HEXLOG";
  brand.append(brandDot, brandTitle);

  const crumb = el("div", "crumb");
  topBar.append(brand, crumb);

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

    const row = el("div", "row");
    row.style.marginTop = "12px";

    const regularBtn = el("button", "btn primary") as HTMLButtonElement;
    regularBtn.textContent = "Regular";
    regularBtn.addEventListener("click", async () => {
      try {
        regularBtn.disabled = true;
        await loadModeContent("regular");
        chosenPlayer = null;
        chosenMonsters = [];
        renderSelect();
        setScreen("select");
      } catch (e: any) {
        alert(String(e?.message ?? e));
      } finally {
        regularBtn.disabled = false;
      }
    });

    const kidsBtn = el("button", "btn") as HTMLButtonElement;
    kidsBtn.textContent = "Kids / Friendly";
    kidsBtn.addEventListener("click", async () => {
      try {
        kidsBtn.disabled = true;
        await loadModeContent("kids");
        chosenPlayer = null;
        chosenMonsters = [];
        renderSelect();
        setScreen("select");
      } catch (e: any) {
        alert(String(e?.message ?? e));
      } finally {
        kidsBtn.disabled = false;
      }
    });

    row.append(regularBtn, kidsBtn);

    const hero = el("div", "startHero");
    hero.innerHTML = `
      <img src="${toPublicUrl(START_BG_URL)}" alt="start background"
        onerror="this.style.display='none'"/>
      <div class="startHeroLabel">
        <div>
          <b>Build:</b> <span class="muted">${escapeHtml(BUILD_TAG)}</span>
          <div class="muted" style="margin-top:6px">Ready</div>
        </div>
        <div class="pill">Play</div>
      </div>
    `;

    card.append(h, p, row, hero);
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

    const layout = el("div", "grid2");
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
      <div class="hint" style="margin-top:10px;">Mode: <b>${escapeHtml(String(mode ?? "—"))}</b></div>
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

    const layout = el("div", "grid2");
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
    (customCard as HTMLElement).style.background = "rgba(10,16,34,.28)";
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

    // Monsters (kept)
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

    // Footer
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
  // Game helpers
  // --------------------------
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

  function resetRunLog() {
    moveCount = 0;
    logs = [];
    miniShiftLeft = {};
  }

  function logClick(id: string, ok: boolean, reason?: string) {
    moveCount += 1;
    logs.unshift({
      n: moveCount,
      id,
      ok,
      reason,
      t: timeHHMM(),
    });
    if (logs.length > 200) logs = logs.slice(0, 200);
  }

  function getMovementRuleForLayer(layer: number): string {
    const s: any = scenario();
    const rule = s?.movement?.[String(layer)] ?? s?.movement?.[layer];
    return String(rule ?? "NONE").toUpperCase();
  }

  function bumpMiniShift(layer: number, row: number, deltaLeft: number) {
    if (!miniShiftLeft[layer]) miniShiftLeft[layer] = {};
    miniShiftLeft[layer][row] = (miniShiftLeft[layer][row] ?? 0) + deltaLeft;
  }

  // UI-only minimap shifting
  function applyMiniShiftsForEndTurn() {
    const s: any = scenario();
    const layers = Number(s?.layers ?? 1);

    for (let L = 1; L <= layers; L++) {
      const ruleRaw = getMovementRuleForLayer(L);
      const rule = ruleRaw === "NONE" ? "DEMO_SHIFT" : ruleRaw;

      if (rule === "DEMO_SHIFT" || rule === "SEVEN_LEFT_SIX_RIGHT") {
        for (let r = 1; r <= ROW_LENS.length; r++) {
          const len = ROW_LENS[r - 1] ?? 7;

          if (r % 2 === 1) bumpMiniShift(L, r, +1);
          else bumpMiniShift(L, r, -1);

          miniShiftLeft[L][r] = ((miniShiftLeft[L][r] % len) + len) % len;
        }
      }
    }
  }

  function startScenario(idx: number) {
    scenarioIndex = idx;

    state = newGame(scenario());
    selectedId = state.playerHexId ?? null;
    currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;

    startHexId = state.playerHexId ?? null;

    enterLayer(state, currentLayer);
    // We keep reveal for logic, but visuals no longer depend on it.
    revealWholeLayer(currentLayer);
    recomputeReachability();

    message = "";
    resetRunLog();
  }

  // --------------------------
  // Screen 4: Game (6-cell grid)
  // --------------------------
  let gameBuilt = false;
  let boardBodyResizeObserver: ResizeObserver | null = null;

  function renderGameScreen() {
    if (gameBuilt) return;
    gameBuilt = true;

    vGame.innerHTML = "";

    const stage = el("div", "gameStage");

    const grid = el("div", "gameGrid");

    // 1) Top-left: Message + Moves
    const pMsg = el("section", "panel");
    const pMsgHead = el("div", "panelHead");
    pMsgHead.innerHTML = `<div class="tag"><span class="dot"></span> Message + Moves</div><div class="pill" id="movesPillTL">Moves: 0</div>`;
    const pMsgBody = el("div", "panelBody");
    pMsgBody.innerHTML = `
      <div class="msgBox">
        <div class="msgLeft" id="msgLeft">Ready.</div>
        <div class="msgRight" id="msgRight">Moves: 0</div>
      </div>
      <div class="logList" id="logList"></div>
      <div class="logSmall">(Logs every cloud click. If a move is rejected, it’s marked.)</div>
    `;
    pMsg.append(pMsgHead, pMsgBody);

    // 2) Top-center: Layers Current
    const pCur = el("section", "panel");
    const pCurHead = el("div", "panelHead");
    pCurHead.innerHTML = `<div class="tag"><span class="dot"></span> Layers: Current</div><div class="pill" id="miniCurrentPill">—</div>`;
    const pCurBody = el("div", "panelBody");
    pCurBody.innerHTML = `
      <div class="miniBoardGrid" id="miniCurrentGrid"></div>
      <div class="miniNote" id="miniCurrentNote"></div>
    `;
    pCur.append(pCurHead, pCurBody);

    // 3) Top-right: HUD
    const pHud = el("section", "panel");
    const pHudHead = el("div", "panelHead");
    pHudHead.innerHTML = `<div class="tag"><span class="dot"></span> HUD</div><div class="pill">Build: ${escapeHtml(
      BUILD_TAG
    )}</div>`;
    const pHudBody = el("div", "panelBody");
    pHud.append(pHudHead, pHudBody);

    // 4) Bottom-left: Layers Below
    const pBelow = el("section", "panel");
    const pBelowHead = el("div", "panelHead");
    pBelowHead.innerHTML = `<div class="tag"><span class="dot"></span> Layers: Below</div><div class="pill" id="miniBelowPill">—</div>`;
    const pBelowBody = el("div", "panelBody");
    pBelowBody.innerHTML = `
      <div class="miniBoardGrid" id="miniBelowGrid"></div>
      <div class="miniNote" id="miniBelowNote"></div>
    `;
    pBelow.append(pBelowHead, pBelowBody);

    // 5) Bottom-center: Board
    const pBoard = el("section", "panel");
    const pBoardHead = el("div", "panelHead");
    pBoardHead.innerHTML = `<div class="tag"><span class="dot"></span> Board</div><div class="pill" id="boardPill">Layer</div>`;
    const pBoardBody = el("div", "panelBody");
    pBoardBody.style.overflow = "hidden";
    pBoardBody.style.padding = "12px";
    pBoardBody.style.display = "flex";
    pBoardBody.style.flexDirection = "column";
    pBoardBody.style.minHeight = "0";

    const boardCell = el("div", "boardCell");
    const boardSquare = el("div", "boardSquare");
    const boardBg = el("div", "boardBg");
    boardBg.id = "boardBg";
    const boardCenter = el("div", "boardCenter");
    const boardWrap = el("div", "boardWrap");
    boardWrap.id = "boardWrap";

    boardCenter.appendChild(boardWrap);
    boardSquare.append(boardBg, boardCenter);
    boardCell.appendChild(boardSquare);
    pBoardBody.appendChild(boardCell);
    pBoard.append(pBoardHead, pBoardBody);

    // 6) Bottom-right: Layers Above
    const pAbove = el("section", "panel");
    const pAboveHead = el("div", "panelHead");
    pAboveHead.innerHTML = `<div class="tag"><span class="dot"></span> Layers: Above</div><div class="pill" id="miniAbovePill">—</div>`;
    const pAboveBody = el("div", "panelBody");
    pAboveBody.innerHTML = `
      <div class="miniBoardGrid" id="miniAboveGrid"></div>
      <div class="miniNote" id="miniAboveNote"></div>
    `;
    pAbove.append(pAboveHead, pAboveBody);

    // Add panels to grid in the requested order
    grid.append(pMsg, pCur, pHud, pBelow, pBoard, pAbove);
    stage.appendChild(grid);
    vGame.appendChild(stage);

    // ----- HUD contents -----
    const controlsRow = el("div", "row");
    (controlsRow as HTMLElement).style.gap = "10px";
    (controlsRow as HTMLElement).style.marginBottom = "12px";

    const scenarioSelect = document.createElement("select") as HTMLSelectElement;
    scenarioSelect.style.fontSize = "12px";
    scenarioSelect.style.fontWeight = "900";
    scenarioSelect.style.borderRadius = "999px";
    scenarioSelect.style.padding = "8px 12px";
    scenarioSelect.style.border = "1px solid rgba(191,232,255,.18)";
    scenarioSelect.style.background = "rgba(10,16,34,.35)";
    scenarioSelect.style.color = "rgba(234,242,255,.92)";
    scenarios.forEach((s: any, i: number) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String((s as any).name ?? (s as any).title ?? (s as any).id ?? `Scenario ${i + 1}`);
      scenarioSelect.appendChild(opt);
    });
    scenarioSelect.value = String(scenarioIndex);

    const layerSelect = document.createElement("select") as HTMLSelectElement;
    layerSelect.style.fontSize = "12px";
    layerSelect.style.fontWeight = "900";
    layerSelect.style.borderRadius = "999px";
    layerSelect.style.padding = "8px 12px";
    layerSelect.style.border = "1px solid rgba(191,232,255,.18)";
    layerSelect.style.background = "rgba(10,16,34,.35)";
    layerSelect.style.color = "rgba(234,242,255,.92)";

    const endTurnBtn = el("button", "btn") as HTMLButtonElement;
    endTurnBtn.textContent = "End turn";

    const resetBtn = el("button", "btn") as HTMLButtonElement;
    resetBtn.textContent = "Reset run";

    const forceRevealBtn = el("button", "btn") as HTMLButtonElement;
    forceRevealBtn.textContent = "Force reveal layer";

    const exitBtn = el("button", "btn") as HTMLButtonElement;
    exitBtn.textContent = "Exit";
    exitBtn.addEventListener("click", () => {
      renderSetup();
      setScreen("setup");
    });

    controlsRow.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn, forceRevealBtn, exitBtn);

    const hudInfo = el("div", "infoText");
    pHudBody.append(controlsRow, hudInfo);

    // ===== Square board sizing + stable fit (relative to Board panel cell) =====
    function setBoardSquare() {
      const bodyW = pBoardBody.clientWidth;
      const bodyH = pBoardBody.clientHeight;

      const pad = 8;
      const availW = Math.max(0, bodyW - pad * 2);
      const availH = Math.max(0, bodyH - pad * 2);

      const size = Math.floor(Math.max(0, Math.min(availW, availH)));
      if (!size || size < 50) return;

      boardSquare.style.width = `${size}px`;
      boardSquare.style.height = `${size}px`;
    }

    function clamp(n: number, lo: number, hi: number) {
      return Math.max(lo, Math.min(hi, n));
    }

    function setTileLayoutVars() {
      const w = boardSquare.clientWidth;
      if (!w || w < 50) return;

      const innerPad = 18;
      const usable = Math.max(50, w - innerPad * 2);

      const gap = 6;
      const cols = 7;
      const minS = 46;
      const maxS = 94;

      const raw = (usable - gap * (cols - 1)) / cols;
      const tileSize = clamp(raw, minS, maxS);
      const offset = Math.round((tileSize + gap) / 2);

      (pBoard as HTMLElement).style.setProperty("--tileGap", `${gap}px`);
      (pBoard as HTMLElement).style.setProperty("--tileSize", `${Math.round(tileSize)}px`);
      (pBoard as HTMLElement).style.setProperty("--tileOffset", `${offset}px`);
    }

    function fitBoardWrapToSquare() {
      const size = boardSquare.clientWidth;
      if (!size || size < 50) return;

      const margin = 18;
      const targetW = Math.max(1, size - margin * 2);
      const targetH = Math.max(1, size - margin * 2);

      const w = boardWrap.scrollWidth || 1;
      const h = boardWrap.scrollHeight || 1;

      const s = Math.min(targetW / w, targetH / h, 1);
      boardWrap.style.setProperty("--boardScale", String(s));
    }

    function relayoutBoard() {
      setBoardSquare();
      setTileLayoutVars();
      requestAnimationFrame(() => fitBoardWrapToSquare());
    }

    if (boardBodyResizeObserver) boardBodyResizeObserver.disconnect();
    boardBodyResizeObserver = new ResizeObserver(() => relayoutBoard());
    boardBodyResizeObserver.observe(pBoardBody);

    window.addEventListener("resize", relayoutBoard, { passive: true });

    // ===== Helpers for mini boards =====
    function rotateCols(len: number, shiftLeft: number) {
      const cols = Array.from({ length: len }, (_, i) => i + 1);
      const s = ((shiftLeft % len) + len) % len;
      return cols.slice(s).concat(cols.slice(0, s));
    }

    function getScenarioLayerCount(): number {
      const s: any = scenario();
      return Number(s?.layers ?? 1);
    }

    function renderMiniBoardGeneric(opts: {
      gridId: string;
      pillId: string;
      noteId: string;
      layer: number;
      showPlayer: boolean;
      invalidLabel: "NO LAYER ABOVE" | "NO LAYER BELOW" | "NO SUCH LAYER";
    }) {
      const gridEl = document.getElementById(opts.gridId);
      const pillEl = document.getElementById(opts.pillId);
      const noteEl = document.getElementById(opts.noteId);
      if (!gridEl || !pillEl || !noteEl) return;

      const maxLayer = getScenarioLayerCount();
      const layer = opts.layer;

      const pc = idToCoord(state?.playerHexId ?? "");
      const playerRow = pc?.row ?? -1;
      const playerCol = pc?.col ?? -1;

      gridEl.innerHTML = "";

      const valid = layer >= 1 && layer <= maxLayer;

      if (!valid) {
        pillEl.innerHTML = `<span class="miniWarn">${escapeHtml(opts.invalidLabel)}</span>`;
        noteEl.textContent = "No tiles on this side. Showing empty outline only.";

        for (let r = 1; r <= ROW_LENS.length; r++) {
          const len = ROW_LENS[r - 1] ?? 7;
          const rowEl = el("div", "miniRow");
          if (r % 2 === 0) rowEl.classList.add("offset");

          const label = document.createElement("b");
          label.textContent = `R${r}:`;
          rowEl.appendChild(label);

          for (let i = 0; i < len; i++) {
            const cell = el("span", "miniCell empty");
            cell.textContent = "";
            rowEl.appendChild(cell);
          }

          gridEl.appendChild(rowEl);
        }
        return;
      }

      pillEl.textContent = `Layer ${layer}`;
      noteEl.textContent = opts.showPlayer ? "Green = your current column (this layer only)." : "Structure only (no player).";

      for (let r = 1; r <= ROW_LENS.length; r++) {
        const len = ROW_LENS[r - 1] ?? 7;
        const shiftLeft = miniShiftLeft?.[layer]?.[r] ?? 0;
        const orderedCols = rotateCols(len, shiftLeft);

        const rowEl = el("div", "miniRow");
        if (r % 2 === 0) rowEl.classList.add("offset");

        const label = document.createElement("b");
        label.textContent = `R${r}:`;
        rowEl.appendChild(label);

        for (const c of orderedCols) {
          const cell = el("span", "miniCell");
          cell.textContent = String(c);
          if (opts.showPlayer && r === playerRow && c === playerCol && layer === currentLayer) cell.classList.add("on");
          rowEl.appendChild(cell);
        }

        gridEl.appendChild(rowEl);
      }
    }

    // ===== Rendering =====
    function renderStoryLog() {
      const pillTL = document.getElementById("movesPillTL");
      const list = document.getElementById("logList");
      const msgRightEl = document.getElementById("msgRight");
      if (pillTL) pillTL.textContent = `Moves: ${moveCount}`;
      if (msgRightEl) msgRightEl.textContent = `Moves: ${moveCount}`;
      if (!list) return;

      list.innerHTML = "";
      for (const e of logs.slice(0, 40)) {
        const item = el("div", "logItem");
        if (!e.ok) item.classList.add("bad");
        const left = el("div");
        left.textContent = e.ok ? `Move ${e.n} ${e.id}` : `Move ${e.n} ${e.id} (rejected: ${e.reason ?? "INVALID"})`;
        const right = el("div", "t");
        right.textContent = e.t;
        item.append(left, right);
        list.appendChild(item);
      }
    }

    function renderMessage() {
      const left = document.getElementById("msgLeft");
      if (!left) return;

      const layerReachable = Array.from(reachable).filter((id) => idToCoord(id)?.layer === currentLayer).length;
      const stuckHint =
        layerReachable === 0 ? " No legal moves on this layer. Try another layer (or reset / find stairs)." : "";

      left.textContent = (message || "Ready.") + stuckHint;
    }

    function renderBoardBackgroundFixed() {
      const bg = document.getElementById("boardBg") as HTMLElement | null;
      if (!bg) return;
      bg.style.backgroundImage = `url("${toPublicUrl(BOARD_BG_URL)}")`;
    }

    function renderHud() {
      const s: any = scenario();
      const goal = posId((s as any).goal);
      const sel = selectedId ?? "—";
      const h: any = selectedId ? getHex(selectedId) : null;
      const { blocked, missing } = isBlockedOrMissing(h);
      const info = selectedId ? reachMap[selectedId] : undefined;

      const layerReachable = Array.from(reachable).filter((id) => idToCoord(id)?.layer === currentLayer).length;

      hudInfo.innerHTML = `
        <div>
          <b>Scenario:</b> ${escapeHtml(String(s.name ?? s.title ?? s.id ?? ""))}<br/>
          <b>Mode:</b> ${escapeHtml(String(mode ?? "—"))}<br/>
          <b>Player:</b> ${escapeHtml(String(state?.playerHexId ?? "?"))}<br/>
          <b>Goal:</b> ${escapeHtml(String(goal))}<br/>
          <b>Layer:</b> ${escapeHtml(String(currentLayer))}<br/>
          <b>Selected:</b> ${escapeHtml(sel)}<br/>
          <b>Status:</b> ${missing ? "missing" : blocked ? "blocked" : "usable"} · <b>Reachable:</b> ${escapeHtml(
        info?.reachable ? "yes" : "no"
      )} · <b>Distance:</b> ${escapeHtml(String(info?.distance ?? "—"))}<br/>
          <b>Reachable:</b> ${reachable.size} (layer ${currentLayer}: ${layerReachable})
        </div>
      `;

      const boardPill = document.getElementById("boardPill");
      if (boardPill) boardPill.textContent = `Layer ${currentLayer}`;
    }

    function renderMiniBoards() {
      renderMiniBoardGeneric({
        gridId: "miniAboveGrid",
        pillId: "miniAbovePill",
        noteId: "miniAboveNote",
        layer: currentLayer + 1,
        showPlayer: false,
        invalidLabel: "NO LAYER ABOVE",
      });

      renderMiniBoardGeneric({
        gridId: "miniCurrentGrid",
        pillId: "miniCurrentPill",
        noteId: "miniCurrentNote",
        layer: currentLayer,
        showPlayer: true,
        invalidLabel: "NO SUCH LAYER",
      });

      renderMiniBoardGeneric({
        gridId: "miniBelowGrid",
        pillId: "miniBelowPill",
        noteId: "miniBelowNote",
        layer: currentLayer - 1,
        showPlayer: false,
        invalidLabel: "NO LAYER BELOW",
      });
    }

    function renderBoard() {
      boardWrap.innerHTML = "";
      if (!state) return;

      for (let r = 1; r <= ROW_LENS.length; r++) {
        const len = ROW_LENS[r - 1] ?? 7;
        const row = el("div", "tileRow");
        if (r % 2 === 0) row.classList.add("offset");

        for (let c = 1; c <= len; c++) {
          const id = `L${currentLayer}-R${r}-C${c}`;
          const h: any = getHex(id);
          const info = reachMap[id];

          const btn = el("div", "cloud");
          btn.setAttribute("data-row", String(r));

          // Label: centered, 2 lines, no background (always)
          const label = el("div", "cloudLabel");
          label.innerHTML = `<div>R${r}</div><div>C${c}</div>`;
          btn.appendChild(label);

          const { blocked, missing } = isBlockedOrMissing(h);
          const isPlayer = state.playerHexId === id;

          // IMPORTANT: visuals should look the same before/after force reveal
          // -> do NOT swap images or add extra rings based on revealed state.
          if (!isRevealed(h)) btn.classList.add("fog");
          if (missing) btn.classList.add("missing");
          if (blocked) btn.classList.add("blocked");

          if (info?.reachable) btn.classList.add("reach");
          if (isPlayer) btn.classList.add("player");
          if (selectedId === id) btn.classList.add("sel");

          const canMove = !!info?.reachable;
          if (!canMove && !isPlayer) btn.classList.add("notReach");

          btn.addEventListener("click", () => {
            selectedId = id;
            rebuildTransitionIndexAndHighlights();

            const res = tryMove(state!, id);

            if (res.ok) {
              logClick(id, true);

              const playerCoord = idToCoord(state!.playerHexId);
              if (playerCoord) currentLayer = playerCoord.layer;

              // AUTO end-turn after successful move (unless won)
              if (!res.won) {
                endTurn(state!);
                applyMiniShiftsForEndTurn();
                enterLayer(state!, currentLayer);
              }

              message = res.won
                ? "🎉 You reached the goal!"
                : res.triggeredTransition
                ? "Moved (transition triggered) — turn ended."
                : "Moved — turn ended.";

              setLayerOptions(layerSelect);
              recomputeReachability();
              rebuildTransitionIndexAndHighlights();
              renderAll();
              return;
            } else {
              const reason = res.reason ?? "INVALID";
              message = `Move rejected: ${reason}`;
              logClick(id, false, reason);
            }

            renderAll();
          });

          row.appendChild(btn);
        }

        boardWrap.appendChild(row);
      }

      relayoutBoard();
    }

    function renderAll() {
      rebuildTransitionIndexAndHighlights();
      renderHud();
      renderMessage();
      renderBoardBackgroundFixed();
      renderBoard();
      renderStoryLog();
      renderMiniBoards();
    }

    // ---- Events ----
    scenarioSelect.addEventListener("change", () => {
      scenarioIndex = Number(scenarioSelect.value);
      startScenario(scenarioIndex);
      setLayerOptions(layerSelect);
      if (state) enterLayer(state, currentLayer);
      revealWholeLayer(currentLayer);
      recomputeReachability();
      message = "";
      renderAll();
    });

    layerSelect.addEventListener("change", () => {
      currentLayer = Number(layerSelect.value);
      if (!state) return;
      const err = enterLayer(state, currentLayer);
      message = err ? `Enter layer error: ${err}` : "";
      revealWholeLayer(currentLayer);
      recomputeReachability();
      renderAll();
    });

    endTurnBtn.addEventListener("click", () => {
      if (!state) return;

      endTurn(state);
      applyMiniShiftsForEndTurn();

      enterLayer(state, currentLayer);
      recomputeReachability();

      message = "Turn ended.";
      renderAll();
    });

    resetBtn.addEventListener("click", () => {
      startScenario(scenarioIndex);
      setLayerOptions(layerSelect);
      if (state) enterLayer(state, currentLayer);
      revealWholeLayer(currentLayer);
      recomputeReachability();
      message = "Ready.";
      renderAll();
    });

    forceRevealBtn.addEventListener("click", () => {
      // Logic reveal remains, but visuals remain consistent (no extra shapes/rings)
      revealWholeLayer(currentLayer);
      recomputeReachability();
      message = "Forced reveal layer + recomputed reachability.";
      renderAll();
    });

    // ---- Boot game view ----
    setLayerOptions(layerSelect);
    if (state) enterLayer(state, currentLayer);
    revealWholeLayer(currentLayer);
    recomputeReachability();
    rebuildTransitionIndexAndHighlights();

    renderBoardBackgroundFixed();
    relayoutBoard();
    renderAll();
  }

  // --------------------------
  // Start app
  // --------------------------
  applyModeTheme();
  renderStart();
  setScreen("start");
}
