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
  const clean = String(p).replace(/^\/+/, ""); // IMPORTANT: remove leading slash
  return base + clean;
}

function scenarioTileSet(s: any): string {
  const t = String(s?.tileset ?? s?.tileSet ?? s?.theme ?? "demo").trim();
  return t || "demo";
}

/** Preset player image (place files at public/images/players/p1.png, p2.png, ...) */
function presetPlayerImage(id: string): string {
  // IMPORTANT: no leading "/" so BASE_URL works on GitHub Pages
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
  let activeTileSet = "demo";

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

      --sideW: 320px;
      --gap: 12px;

      --hexGap: 6px;
      --hexW: 64px;
      --hexH: 56px;
      --hexOffset: 34px;

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

    /* subtle animated overlay (global) */
    body::before{
      content:"";
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      opacity: .22;
      mix-blend-mode: screen;
      background:
        linear-gradient(135deg,
          rgba(0,0,0,0) 0%,
          rgba(95,225,255,0) 35%,
          rgba(95,225,255,.95) 50%,
          rgba(95,225,255,0) 65%,
          rgba(0,0,0,0) 100%);
      background-size: 220% 220%;
      animation: hexWave 10s linear infinite;
      filter: blur(.2px) saturate(1.15);
    }

    body::after{
      content:"";
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      opacity: .14;
      --s: 44px;
      --h: calc(var(--s) * 0.57735);
      background:
        linear-gradient(60deg, rgba(191,232,255,.24) 12%, transparent 12.5%, transparent 87%, rgba(191,232,255,.24) 87.5%, rgba(191,232,255,.24)),
        linear-gradient(-60deg, rgba(191,232,255,.24) 12%, transparent 12.5%, transparent 87%, rgba(191,232,255,.24) 87.5%, rgba(191,232,255,.24)),
        linear-gradient(0deg, rgba(191,232,255,.18) 2%, transparent 2.5%, transparent 97.5%, rgba(191,232,255,.18) 98%);
      background-size: var(--s) calc(var(--h) * 2);
      background-position: 0 0, 0 0, calc(var(--s)/2) var(--h);
      mix-blend-mode: screen;
      filter: blur(.2px);
    }

    @keyframes hexWave{
      0%   { background-position: 120% 120%; opacity:.16; }
      50%  { opacity:.28; }
      100% { background-position: -20% -20%; opacity:.16; }
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
      margin-top: 0;
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
      background: rgba(10,16,34,.30);
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

    .gameStage{
      border-radius: calc(var(--radius) + 6px);
      border: 1px solid rgba(191,232,255,.18);
      background: linear-gradient(180deg, rgba(10,16,34,.58), rgba(10,16,34,.30));
      box-shadow:
        0 0 0 1px rgba(95,225,255,.08) inset,
        0 18px 60px rgba(0,0,0,.55);
      overflow:hidden;
      padding: 12px;
      min-height: calc(100vh - 140px);
      position:relative;
    }

    .gameWrap{
      position:relative;
      z-index:1;
      display:flex;
      flex-direction:column;
      gap: var(--gap);
      min-height: calc(100vh - 170px);
    }

    .hudHeader{
      border-radius: var(--radius);
      border: 1px solid rgba(160, 210, 255, .22);
      background: rgba(10,16,34,.45);
      box-shadow:
        0 0 0 1px rgba(95,225,255,.08) inset,
        0 18px 40px rgba(0,0,0,.20);
      overflow:hidden;
    }
    .hudHeaderHead{
      padding:10px 12px;
      border-bottom: 1px solid rgba(191,232,255,.14);
      background: linear-gradient(180deg, rgba(10,16,34,.62), rgba(10,16,34,.28));
      backdrop-filter: blur(10px);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
    }
    .hudTitleRow{
      display:flex;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
      min-width: 0;
    }
    .tag{
      font-size:11px;
      color: var(--muted);
      display:flex;
      align-items:center;
      gap:8px;
      opacity:.95;
      font-weight: 800;
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

    .hudControls{
      display:flex;
      align-items:center;
      justify-content:flex-end;
      gap: 10px;
      flex-wrap:wrap;
    }

    .hudBody{
      padding: 12px;
      display:block;
      min-width: 0;
    }

    .hudWide{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      align-items:start;
    }
    @media (max-width: 980px){
      .hudWide{ grid-template-columns: 1fr; }
    }

    .softCard{
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.28);
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset, 0 12px 28px rgba(0,0,0,.28);
      padding: 12px;
      min-width: 0;
    }

    .infoText{ font-size: 12px; line-height: 1.35; }
    .infoText b{ font-weight: 800; color: rgba(234,242,255,.98); }

    .gameLayout{
      display:grid;
      grid-template-columns: 1fr var(--sideW);
      gap: var(--gap);
      min-height: 0;
      flex: 1;
    }

    .mainLeft{
      display:grid;
      grid-template-columns: var(--sideW) 1fr;
      gap: var(--gap);
      min-height: 0;
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
    }
    .panelBody{
      padding: 12px;
      overflow:auto;
      min-height: 0;
    }

    .msgBar{
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.24);
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset;
      font-weight: 800;
      font-size: 12px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .msgLeft{min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
    .msgRight{flex:0 0 auto; opacity:.92}

    /* ===== Board container (NO scroll, square, centered) ===== */
    .boardArea{
      display:flex;
      flex-direction:column;
      min-height: 0;
      height: 100%;
      width: 100%;
    }

    .boardScroll{
      position:relative;
      flex: 1;
      min-height: 0;
      overflow: hidden;              /* ✅ no scrollbars */
      border-radius: 16px;
      margin: 0 auto;                /* ✅ centered */
      /* width/height set via JS so it’s perfectly square */
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
      filter: none;
      transform: none;
    }
    .boardBg::after{
      content:"";
      position:absolute; inset:0;
      background:
        radial-gradient(900px 500px at 20% 20%, rgba(95,225,255,.10), transparent 60%),
        radial-gradient(900px 500px at 80% 65%, rgba(122,108,255,.10), transparent 60%),
        linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.35));
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

    .hexRow{
      display:flex;
      gap: var(--hexGap);
      align-items:center;
      justify-content:flex-start;
      width: 100%;
    }
    .hexRow.offset{ padding-left: var(--hexOffset); }

    .hex{
      width: var(--hexW);
      height: var(--hexH);
      clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%);
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      position:relative;
      user-select:none;

      --glow-color: rgba(255,255,255,.28);
      --glow-spread-color: rgba(255,255,255,.14);
      --btn-color: rgba(255,255,255,.06);

      border: none;
      background-color: var(--btn-color);

      box-shadow:
        0 0 .8em .18em var(--glow-color),
        0 0 2.2em .7em var(--glow-spread-color),
        inset 0 0 .55em .18em var(--glow-color);

      transition:
        transform .12s ease,
        filter .12s ease,
        box-shadow .18s ease,
        background-color .18s ease;

      overflow: hidden;
    }

    .hex::after{
      pointer-events:none;
      content:"";
      position:absolute;
      left:-6%;
      right:-6%;
      top:105%;
      height:90%;
      background-color: var(--glow-spread-color);
      filter: blur(1.25em);
      opacity: .55;
      transform: perspective(1.5em) rotateX(35deg) scale(1, .6);
    }

    .hex:hover{
      transform: translateY(-1px) scale(1.02);
      filter: brightness(1.08);
    }
    .hex:active{ transform: translateY(0) scale(.99); }

    .hexImg{
      position:absolute;
      inset: -2px;
      width: calc(100% + 4px);
      height: calc(100% + 9px);
      object-fit:cover;
      clip-path: inherit;
      pointer-events:none;
      z-index: 0;
      transform: scale(1.02);
      transform-origin: center;
      filter: saturate(1.02) contrast(1.02);
    }

    /* You can hide labels by setting opacity:0; later if you want */
    .hexLabel{
      position:relative;
      z-index: 2;
      font-size: 10px;
      line-height: 1.05;
      font-weight: 900;
      letter-spacing: .2px;
      color: rgba(234,242,255,.94);
      text-shadow: 0 0 8px rgba(0,0,0,.65);
      background: rgba(0,0,0,.18);
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 999px;
      padding: 2px 6px;
      opacity: .92;
    }

    .hex.reach{
      --glow-color: rgba(0, 200, 255, 1);
      --glow-spread-color: rgba(0, 200, 255, .55);
      --btn-color: rgba(0, 200, 255, .10);

      box-shadow:
        0 0 1.0em .22em var(--glow-color),
        0 0 2.8em .95em var(--glow-spread-color),
        inset 0 0 .65em .22em var(--glow-color);
    }

    .hex.notReach{
      opacity: .58;
      filter: saturate(.82) brightness(.92);
      cursor: not-allowed;
    }
    .hex.notReach:hover{
      transform: none;
      filter: saturate(.82) brightness(.92);
    }

    .hex.player,
    .hex.player.reach,
    .hex.player.trSrc,
    .hex.player.trTgt,
    .hex.player.goal,
    .hex.player.fog,
    .hex.player.blocked,
    .hex.player.missing{
      --glow-color: rgba(76, 255, 80, 1) !important;
      --glow-spread-color: rgba(76, 255, 80, .70) !important;
      --btn-color: rgba(76, 255, 80, .16) !important;

      box-shadow:
        0 0 1.35em .30em rgba(76, 255, 80, 1),
        0 0 3.9em  1.35em rgba(76, 255, 80, .70),
        inset 0 0 .90em .30em rgba(76, 255, 80, 1) !important;

      filter: brightness(1.18) !important;
      opacity: 1 !important;
      z-index: 4;
    }
    .hex.player.trTgt{ animation: none !important; }

    .hex.goal{
      --glow-color: rgba(255,193,7,1);
      --glow-spread-color: rgba(255,193,7,.55);
      --btn-color: rgba(255,193,7,.14);
    }
    .hex.blocked{
      --glow-color: rgba(244,67,54,.95);
      --glow-spread-color: rgba(244,67,54,.45);
      --btn-color: rgba(244,67,54,.10);
      opacity: .9;
    }
    .hex.missing{
      --glow-color: rgba(255,255,255,.12);
      --glow-spread-color: rgba(255,255,255,.06);
      --btn-color: rgba(255,255,255,.03);
      opacity:.55;
    }
    .hex.fog{
      --glow-color: rgba(255,255,255,.18);
      --glow-spread-color: rgba(0,0,0,.45);
      --btn-color: rgba(0,0,0,.28);
      opacity: .85;
    }
    .hex.trSrc{
      --glow-color: rgba(255,152,0,1);
      --glow-spread-color: rgba(255,152,0,.55);
      --btn-color: rgba(255,152,0,.10);
    }
    .hex.trTgt{
      --glow-color: rgba(3,169,244,1);
      --glow-spread-color: rgba(3,169,244,.55);
      --btn-color: rgba(3,169,244,.10);
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse{
      0%{filter:brightness(1)}
      50%{filter:brightness(1.35)}
      100%{filter:brightness(1)}
    }

    .hex.sel{
      outline: 2px solid rgba(234,242,255,.55);
      outline-offset: 2px;
    }

    .miniDot{
      position:absolute;
      right:8px;
      top:8px;
      width:9px;height:9px;border-radius:999px;
      border:1px solid rgba(255,255,255,.35);
      background:rgba(255,255,255,.12);
      z-index: 3;
    }
    .miniDot.player{background:rgba(76,255,80,1);border-color:rgba(76,255,80,1)}
    .miniDot.goal{background:rgba(255,193,7,1);border-color:rgba(255,193,7,1)}
    .dist{
      position:absolute;
      left:8px;
      bottom:8px;
      padding:2px 6px;
      border-radius:999px;
      border:1px solid rgba(191,232,255,.14);
      background:rgba(0,0,0,.30);
      font-size:10px;
      line-height:1;
      font-weight: 900;
      z-index: 3;
    }
    .trBadge{
      position:absolute;
      left:8px;
      top:8px;
      padding:2px 6px;
      border-radius:999px;
      border:1px solid rgba(191,232,255,.14);
      background:rgba(0,0,0,.30);
      font-size:10px;
      line-height:1;
      font-weight: 900;
      z-index: 3;
    }

    /* story log */
    .logHeadRow{
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      margin-bottom: 10px;
    }
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

    /* mini boards */
    .miniBoard{
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.20);
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset;
      padding: 10px 12px;
      margin-bottom: 10px;
      overflow:hidden;
      position:relative;
    }

    .miniBoard.bgPlayer::before{
      content:"";
      position:absolute; inset:0;
      background-size: cover;
      background-position:center;
      filter: blur(6px) saturate(1.02) contrast(1.03);
      opacity:.30;
      transform: scale(1.05);
      pointer-events:none;
    }
    .miniBoard.bgPlayer::after{
      content:"";
      position:absolute; inset:0;
      background:
        radial-gradient(700px 340px at 30% 25%, rgba(95,225,255,.20), transparent 55%),
        linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.55));
      pointer-events:none;
    }
    .miniBoard > *{ position:relative; z-index:1; }

    .miniBoardHead{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom: 8px;
    }
    .miniBoardTitle{
      font-weight: 900;
      font-size: 12px;
      opacity:.92;
      display:flex;
      align-items:center;
      gap:8px;
    }
    .miniWarn{
      color: rgba(255,120,120,.95);
      font-weight: 900;
    }
    .miniBoardGrid{
      display:flex;
      flex-direction:column;
      gap:4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 11px;
      line-height: 1.25;
    }
    .miniRow{
      display:flex;
      gap:4px;
      align-items:center;
      flex-wrap:wrap;
    }
    .miniRow b{
      opacity:.9;
      font-weight: 900;
      min-width: 36px;
    }
    .miniRow.offset{
      padding-left: calc((28px + 4px) / 2);
    }
    .miniCell{
      width: 28px;
      height: 24px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%);
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(0,0,0,.22);
      opacity:.95;
      font-weight: 900;
      line-height:1;
      padding: 0;
      color: rgba(234,242,255,.9);
    }
    .miniCell.on{
      border-color: rgba(76,255,80,.65);
      background: rgba(76,255,80,.18);
      box-shadow: 0 0 0 1px rgba(76,255,80,.22) inset, 0 0 12px rgba(76,255,80,.22);
      color: rgba(234,242,255,.98);
    }
    .miniCell.empty{
      opacity:.60;
      color: rgba(234,242,255,.35);
    }
    .miniNote{
      margin-top: 8px;
      opacity:.75;
      font-weight: 800;
      font-size: 11px;
    }

    /* responsive */
    @media (max-width: 1100px){
      .gameLayout{ grid-template-columns: 1fr; }
      .mainLeft{ grid-template-columns: 1fr; }
      .gameStage{ min-height: auto; }
      .gameWrap{ min-height: auto; }
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
          <b>Demo tiles:</b> <span class="muted">${escapeHtml("/tiles/demo/")}</span>
          <div class="muted" style="margin-top:6px">Build: ${escapeHtml(BUILD_TAG)}</div>
        </div>
        <div class="pill">Ready</div>
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

  function tileUrlForHex(id: string, h: any): string {
    const s: any = scenario();
    const tileset = activeTileSet || scenarioTileSet(s);

    const { blocked, missing } = isBlockedOrMissing(h);

    if (missing) return toPublicUrl(`tiles/${tileset}/HOLE.png`);
    if (blocked) return toPublicUrl(`tiles/${tileset}/BLOCKED.png`);
    if (!isRevealed(h)) return toPublicUrl(`tiles/${tileset}/FOG.png`);

    if (String(h?.kind ?? "").toUpperCase() === "GOAL") return toPublicUrl(`tiles/${tileset}/GOAL.png`);
    if (startHexId && id === startHexId) return toPublicUrl(`tiles/${tileset}/START.png`);

    const outgoing = transitionsByFrom.get(id) ?? [];
    const hasDown = outgoing.some((t) => String(t.type ?? "").toUpperCase() === "DOWN");
    const hasUp = outgoing.some((t) => String(t.type ?? "").toUpperCase() !== "DOWN");

    if (hasDown) return toPublicUrl(`tiles/${tileset}/STAIRS_DOWN.png`);
    if (hasUp && outgoing.length) return toPublicUrl(`tiles/${tileset}/STAIRS_UP.png`);

    return toPublicUrl(`tiles/${tileset}/NORMAL.png`);
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

    const s: any = scenario();
    activeTileSet = scenarioTileSet(s);

    state = newGame(scenario());
    selectedId = state.playerHexId ?? null;
    currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;

    startHexId = state.playerHexId ?? null;

    enterLayer(state, currentLayer);
    revealWholeLayer(currentLayer);
    recomputeReachability();

    message = "";
    resetRunLog();
  }

  // --------------------------
  // Screen 4: Game
  // --------------------------
  let gameBuilt = false;
  let boardBodyResizeObserver: ResizeObserver | null = null;

  function renderGameScreen() {
    if (gameBuilt) return;
    gameBuilt = true;

    vGame.innerHTML = "";

    const stage = el("div", "gameStage");
    const wrap = el("div", "gameWrap");

    // ===== HUD header =====
    const hud = el("section", "hudHeader");
    const hudHead = el("div", "hudHeaderHead");

    const hudLeft = el("div", "hudTitleRow");
    hudLeft.innerHTML = `<div class="tag"><span class="dot"></span> HUD</div><div class="pill">Build: ${escapeHtml(
      BUILD_TAG
    )}</div>`;

    const hudControls = el("div", "hudControls");

    const scenarioSelect = el("select") as HTMLSelectElement;
    scenarioSelect.style.fontSize = "12px";
    scenarioSelect.style.fontWeight = "800";
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

    const layerSelect = el("select") as HTMLSelectElement;
    layerSelect.style.fontSize = "12px";
    layerSelect.style.fontWeight = "800";
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

    hudControls.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn, forceRevealBtn, exitBtn);
    hudHead.append(hudLeft, hudControls);

    const hudBody = el("div", "hudBody");
    const hudWide = el("div", "softCard hudWide");
    const hudScenario = el("div", "infoText");
    const hudSelected = el("div", "infoText");
    hudWide.append(hudScenario, hudSelected);
    hudBody.append(hudWide);
    hud.append(hudHead, hudBody);

    // ===== Layout =====
    const layout = el("div", "gameLayout");
    const mainLeft = el("div", "mainLeft");

    // Story panel
    const storyPanel = el("section", "panel");
    const storyHead = el("div", "panelHead");
    storyHead.innerHTML = `<div class="tag"><span class="dot"></span> Story Log</div><div class="pill">Moves</div>`;
    const storyBody = el("div", "panelBody");

    const storyCard = el("div", "softCard");
    storyCard.innerHTML = `
      <div class="logHeadRow">
        <div class="infoText"><b>Clicks / Moves</b></div>
        <div class="pill" id="movesPill">Moves: 0</div>
      </div>
      <div class="logList" id="logList"></div>
      <div class="logSmall">(Logs every hex click. If a move is rejected, it’s marked.)</div>
    `;
    storyBody.appendChild(storyCard);
    storyPanel.append(storyHead, storyBody);

    // Board panel
    const boardPanel = el("section", "panel");
    const boardHead = el("div", "panelHead");
    boardHead.innerHTML = `<div class="tag"><span class="dot"></span> Board</div><div class="pill">Now</div>`;
    const boardBody = el("div", "panelBody");
    boardBody.style.overflow = "hidden";
    boardBody.style.display = "flex";
    boardBody.style.flexDirection = "column";

    const boardArea = el("div", "boardArea");
    boardArea.style.flex = "1";

    const msgBar = el("div", "msgBar");
    msgBar.innerHTML = `<div class="msgLeft" id="msgLeft">Ready.</div><div class="msgRight" id="msgRight">Moves: 0</div>`;

    const boardScroll = el("div", "boardScroll");
    const boardBg = el("div", "boardBg");
    boardBg.id = "boardBg";
    const boardCenter = el("div", "boardCenter");
    const boardWrap = el("div", "boardWrap");
    boardWrap.id = "boardWrap";

    boardCenter.appendChild(boardWrap);
    boardScroll.append(boardBg, boardCenter);

    boardArea.append(msgBar, boardScroll);
    boardBody.appendChild(boardArea);
    boardPanel.append(boardHead, boardBody);

    mainLeft.append(storyPanel, boardPanel);

    // Layers panel (right)
    const imgPanel = el("section", "panel");
    const imgHead = el("div", "panelHead");
    imgHead.innerHTML = `<div class="tag"><span class="dot"></span> Layers</div><div class="pill">Mini</div>`;
    const imgBody = el("div", "panelBody");

    const miniAbove = el("div", "miniBoard");
    miniAbove.innerHTML = `
      <div class="miniBoardHead">
        <div class="miniBoardTitle">Above</div>
        <div class="pill" id="miniAbovePill" style="padding:6px 10px">—</div>
      </div>
      <div class="miniBoardGrid" id="miniAboveGrid"></div>
      <div class="miniNote" id="miniAboveNote"></div>
    `;

    const miniCurrent = el("div", "miniBoard bgPlayer");
    miniCurrent.id = "miniCurrentBoard";
    miniCurrent.innerHTML = `
      <div class="miniBoardHead">
        <div class="miniBoardTitle">Current</div>
        <div class="pill" id="miniCurrentPill" style="padding:6px 10px">—</div>
      </div>
      <div class="miniBoardGrid" id="miniCurrentGrid"></div>
      <div class="miniNote" id="miniCurrentNote"></div>
    `;

    const miniBelow = el("div", "miniBoard");
    miniBelow.innerHTML = `
      <div class="miniBoardHead">
        <div class="miniBoardTitle">Below</div>
        <div class="pill" id="miniBelowPill" style="padding:6px 10px">—</div>
      </div>
      <div class="miniBoardGrid" id="miniBelowGrid"></div>
      <div class="miniNote" id="miniBelowNote"></div>
    `;

    imgBody.append(miniAbove, miniCurrent, miniBelow);
    imgPanel.append(imgHead, imgBody);

    layout.append(mainLeft, imgPanel);
    wrap.append(hud, layout);
    stage.appendChild(wrap);
    vGame.appendChild(stage);

    // ===== Square board sizing + stable fit (no scroll, no pulsing) =====
    function setBoardSquare() {
      const bodyW = boardBody.clientWidth;
      const bodyH = boardBody.clientHeight;
      const msgH = msgBar.offsetHeight || 0;

      const pad = 6;
      const availW = Math.max(0, bodyW - pad * 2);
      const availH = Math.max(0, bodyH - msgH - pad * 2);

      // try to use full width, but never exceed height
      const size = Math.floor(Math.max(0, Math.min(availW, availH)));
      if (!size || size < 50) return;

      boardScroll.style.width = `${size}px`;
      boardScroll.style.height = `${size}px`;
    }

    function clamp(n: number, lo: number, hi: number) {
      return Math.max(lo, Math.min(hi, n));
    }

    function setHexLayoutVars() {
      const w = boardScroll.clientWidth;
      if (!w || w < 50) return;

      // Let background "towers" show between tiles
      const innerPad = 18;
      const usable = Math.max(50, w - innerPad * 2);

      const gap = 6;
      const cols = 7;
      const minW = 46;
      const maxW = 92;

      const raw = (usable - gap * (cols - 1)) / cols;
      const hexW = clamp(raw, minW, maxW);
      const hexH = Math.round(hexW * 0.88);
      const offset = Math.round((hexW + gap) / 2);

      (boardPanel as HTMLElement).style.setProperty("--hexGap", `${gap}px`);
      (boardPanel as HTMLElement).style.setProperty("--hexW", `${Math.round(hexW)}px`);
      (boardPanel as HTMLElement).style.setProperty("--hexH", `${hexH}px`);
      (boardPanel as HTMLElement).style.setProperty("--hexOffset", `${offset}px`);
    }

    function fitBoardWrapToSquare() {
      const size = boardScroll.clientWidth;
      if (!size || size < 50) return;

      const margin = 18;
      const targetW = Math.max(1, size - margin * 2);
      const targetH = Math.max(1, size - margin * 2);

      // ✅ unscaled content size (transform doesn't affect scrollWidth/scrollHeight)
      const w = boardWrap.scrollWidth || 1;
      const h = boardWrap.scrollHeight || 1;

      const s = Math.min(targetW / w, targetH / h, 1);
      boardWrap.style.setProperty("--boardScale", String(s));
    }

    function relayoutBoard() {
      setBoardSquare();
      setHexLayoutVars();
      requestAnimationFrame(() => fitBoardWrapToSquare());
    }

    if (boardBodyResizeObserver) boardBodyResizeObserver.disconnect();
    boardBodyResizeObserver = new ResizeObserver(() => relayoutBoard());
    boardBodyResizeObserver.observe(boardBody);

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

    function getPlayerImageUrl(): string | null {
      if (chosenPlayer?.kind === "custom") return chosenPlayer.imageDataUrl ?? null;
      if (chosenPlayer?.kind === "preset") return toPublicUrl(presetPlayerImage(chosenPlayer.id));
      return null;
    }

    // Ensure .miniBoard.bgPlayer::before reads --miniBg
    const extraMiniBgStyle = document.createElement("style");
    extraMiniBgStyle.textContent = `.miniBoard.bgPlayer::before{ background-image: var(--miniBg); }`;
    document.head.appendChild(extraMiniBgStyle);

    function setMiniCurrentBackground() {
      const board = document.getElementById("miniCurrentBoard") as HTMLElement | null;
      if (!board) return;

      const url = getPlayerImageUrl();
      board.style.setProperty("--miniBg", url ? `url("${url}")` : "");
    }

    function renderMiniBoardGeneric(opts: {
      gridId: string;
      pillId: string;
      noteId: string;
      layer: number;
      showPlayer: boolean;
      invalidLabel: "NO LAYER ABOVE" | "NO LAYER BELOW" | "NO SUCH LAYER";
    }) {
      const grid = document.getElementById(opts.gridId);
      const pill = document.getElementById(opts.pillId);
      const note = document.getElementById(opts.noteId);
      if (!grid || !pill || !note) return;

      const maxLayer = getScenarioLayerCount();
      const layer = opts.layer;

      const pc = idToCoord(state?.playerHexId ?? "");
      const playerRow = pc?.row ?? -1;
      const playerCol = pc?.col ?? -1;

      grid.innerHTML = "";

      const valid = layer >= 1 && layer <= maxLayer;

      if (!valid) {
        pill.innerHTML = `<span class="miniWarn">${escapeHtml(opts.invalidLabel)}</span>`;
        note.textContent = "No tiles on this side. Showing empty outline only.";

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

          grid.appendChild(rowEl);
        }
        return;
      }

      pill.textContent = `Layer ${layer}`;
      note.textContent = opts.showPlayer ? "Green = your current column (this layer only)." : "Structure only (no player).";

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

        grid.appendChild(rowEl);
      }
    }

    // ===== Rendering =====
    function renderStoryLog() {
      const pill = document.getElementById("movesPill");
      const list = document.getElementById("logList");
      const msgRight = document.getElementById("msgRight");
      if (pill) pill.textContent = `Moves: ${moveCount}`;
      if (msgRight) msgRight.textContent = `Moves: ${moveCount}`;
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

    function renderHudHeader() {
      const s: any = scenario();

      hudScenario.innerHTML = `
        <div>
          <b>Scenario:</b> ${escapeHtml(String(s.name ?? s.title ?? s.id ?? ""))}&nbsp;&nbsp;
          <b>Mode:</b> ${escapeHtml(String(mode ?? "—"))}&nbsp;&nbsp;
          <b>Player:</b> ${escapeHtml(String(state?.playerHexId ?? "?"))}<br/>
          <b>Goal:</b> ${escapeHtml(String(posId(s.goal)))}&nbsp;&nbsp;
          <b>Layer:</b> ${escapeHtml(String(currentLayer))}&nbsp;&nbsp;
          <b>Tileset:</b> ${escapeHtml(activeTileSet)}
        </div>
      `;

      if (!selectedId) {
        hudSelected.innerHTML = `<div class="hint">No selection.</div>`;
        return;
      }

      const h: any = getHex(selectedId);
      const { blocked, missing } = isBlockedOrMissing(h);
      const info = reachMap[selectedId];

      const layerReachable = Array.from(reachable).filter((id) => idToCoord(id)?.layer === currentLayer).length;

      hudSelected.innerHTML = `
        <div>
          <b>Selected:</b> ${escapeHtml(selectedId)}&nbsp;&nbsp;
          <b>Kind:</b> ${escapeHtml(String(h?.kind ?? "?"))}&nbsp;&nbsp;
          <b>Status:</b> ${missing ? "missing" : blocked ? "blocked" : "usable"}<br/>
          <b>Reachable:</b> ${escapeHtml(info?.reachable ? "yes" : "no")}&nbsp;&nbsp;
          <b>Distance:</b> ${escapeHtml(String(info?.distance ?? "—"))}&nbsp;&nbsp;
          <b>Reachable:</b> ${reachable.size} (layer ${currentLayer}: ${layerReachable})&nbsp;&nbsp;
          <b>Transitions:</b> ${transitionsAll.length} · <b>Sources (layer):</b> ${sourcesOnLayer.size} · <b>Outgoing:</b> ${
        outgoingFromSelected.length
      }
        </div>
      `;
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

      setMiniCurrentBackground();
    }

    function renderBoard() {
      boardWrap.innerHTML = "";
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

          const img = document.createElement("img");
          img.className = "hexImg";
          img.src = tileUrlForHex(id, h);
          img.alt = "tile";
          btn.appendChild(img);

          // Keep label for now; you can hide via CSS if you want
          const label = el("div", "hexLabel");
          label.textContent = `R${r} C${c}`;
          btn.appendChild(label);

          const { blocked, missing } = isBlockedOrMissing(h);
          const isGoal = String(h?.kind ?? "").toUpperCase() === "GOAL";
          const isPlayer = state.playerHexId === id;

          if (missing) btn.classList.add("missing");
          if (blocked) btn.classList.add("blocked");
          if (!isRevealed(h)) btn.classList.add("fog");
          if (info?.reachable) btn.classList.add("reach");
          if (isGoal) btn.classList.add("goal");
          if (isPlayer) btn.classList.add("player");
          if (selectedId === id) btn.classList.add("sel");

          if (sourcesOnLayer.has(id)) btn.classList.add("trSrc");

          if (targetsSameLayer.has(id)) {
            btn.classList.add("trTgt");
            const badge = el("div", "trBadge");
            badge.textContent = targetsSameLayer.get(id)!;
            btn.appendChild(badge);
          }

          if (isPlayer) btn.appendChild(el("div", "miniDot player"));
          else if (isGoal) btn.appendChild(el("div", "miniDot goal"));

          if (info?.reachable && info.distance != null) {
            const d = el("div", "dist");
            d.textContent = String(info.distance);
            btn.appendChild(d);
          }

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
                enterLayer(state!, currentLayer); // keep fog (no revealWholeLayer)
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

      // After render: stable relayout (no scroll, fit-to-square)
      relayoutBoard();
    }

    function renderAll() {
      rebuildTransitionIndexAndHighlights();
      renderHudHeader();
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

      // Do NOT reveal whole layer — keep fog.
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

    // background + square sizing immediately
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
