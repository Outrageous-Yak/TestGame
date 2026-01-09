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

/** Optional start-screen background (put file in public/images/ui/start-screen.jpg) */
const START_BG_URL = "images/ui/start-screen.jpg";

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

      --leftW: 340px;
      --rightW: 320px;
      --gap: 12px;

      --hexGap: 5px;
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
      align-items:flex-start;
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
      margin-top: 7px;
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

    .gameHeader{
      display:grid;
      grid-template-columns: var(--leftW) 1fr var(--rightW);
      gap: var(--gap);
      align-items:start;
      padding: 2px 2px 0;
    }
    .gameHeaderLeft{ padding: 6px 6px 0; }
    .gameHeaderTitle{
      font-size: 44px;
      font-weight: 900;
      letter-spacing:.2px;
      margin:0;
      line-height: 1.05;
    }
    .gameHeaderSub{
      margin-top: 6px;
      font-size: 12px;
      opacity:.82;
    }
    .gameHeaderControls{
      grid-column: 2 / 4;
      display:flex;
      justify-content:flex-end;
      align-items:center;
      gap: 10px;
      flex-wrap:wrap;
      padding: 6px 6px 0;
    }

    .gameLayout{
      display:grid;
      grid-template-columns: var(--leftW) 1fr var(--rightW);
      gap: var(--gap);
      min-height: 0;
      flex: 1;
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
    .pill.red{
      color: rgba(255,145,145,.92);
      border-color: rgba(255,120,120,.26);
      background: rgba(255,0,0,.06);
    }

    .panelBody{
      padding: 12px;
      overflow:auto;
      min-height: 0;
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

    /* msgBar now shows message + move counter */
    .msgBar{
      margin-top: 10px;
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
    }
    .msgLeft{min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
    .msgRight{flex:0 0 auto; opacity:.92}

    .boardBody{
      display:flex;
      flex-direction:column;
      gap: 10px;
      padding: 12px;
      overflow:hidden;
      min-height: 0;
      flex: 1;
    }
    .infoTop{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      min-width: 0;
    }
    @media (max-width: 980px){
      .infoTop{ grid-template-columns: 1fr; }
    }

    .boardScroll{
      flex: 1;
      min-height: 0;
      overflow:auto;
      padding-right: 4px;
    }

    .hexRow{
      display:flex;
      gap: var(--hexGap);
      align-items:center;
      justify-content:flex-start;
      width: 100%;
    }
    .hexRow.offset{ padding-left: var(--hexOffset); }

    /* ========= HEX BASE ========= */
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
        background-color .18s ease,
        border-color .18s ease;

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

    /* Tile image */
    .hexImg{
      position:absolute;
      inset: -3px;
      width: calc(100% + 6px);
      height: calc(100% + 10.5px);
      object-fit:cover;
      clip-path: inherit;
      border-radius: 0;
      pointer-events:none;
      z-index: 0;
      transform: scale(1.04);
      transform-origin: center;
    }

    /* Overlay text (optional) */
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

    /* Reachable tiles: BLUE/CYAN glow */
    .hex.reach{
      --glow-color: rgba(0, 200, 255, 1);
      --glow-spread-color: rgba(0, 200, 255, .55);
      --btn-color: rgba(0, 200, 255, .10);

      box-shadow:
        0 0 1.0em .22em var(--glow-color),
        0 0 2.8em .95em var(--glow-spread-color),
        inset 0 0 .65em .22em var(--glow-color);
    }

    /* Non-reachable: looks disabled */
    .hex.notReach{
      opacity: .58;
      filter: saturate(.82) brightness(.92);
      cursor: not-allowed;
    }
    .hex.notReach:hover{
      transform: none;
      filter: saturate(.82) brightness(.92);
    }

    /* Player current position (always-on) — LIME, always wins */
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

    .imgBox{
      height: 220px;
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(0,0,0,.18);
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding: 10px;
      color: rgba(234,242,255,.82);
      font-weight: 800;
      font-size: 12px;
    }
    .imgBox img{
      width:100%;
      height:100%;
      object-fit: cover;
      display:block;
    }

    /* ---- Mini moving boards ---- */
    .miniStrip{
      display:grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      min-width: 0;
    }
    @media (max-width: 1100px){
      .miniStrip{ grid-template-columns: 1fr; }
    }

    .miniBoard{
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.20);
      box-shadow: 0 0 0 1px rgba(95,225,255,.05) inset;
      padding: 10px 12px;
      min-width: 0;
    }
    .miniBoardHead{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom: 8px;
      flex-wrap:wrap;
    }
    .miniBoardTitle{
      font-weight: 900;
      font-size: 12px;
      opacity:.92;
    }
    .miniBoardTitle.red{ color: rgba(255,145,145,.92); opacity: 1; }
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
      padding-left: calc((28px + 4px) / 2); /* (miniCell width + miniRow gap)/2 */
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
    }
    .miniCell.ghost{
      opacity:.35;
      background: rgba(0,0,0,.16);
      border-color: rgba(191,232,255,.10);
    }
    .miniCell.on{
      border-color: rgba(76,255,80,.65);
      background: rgba(76,255,80,.18);
      box-shadow: 0 0 0 1px rgba(76,255,80,.22) inset, 0 0 12px rgba(76,255,80,.22);
      color: rgba(234,242,255,.98);
      opacity: 1;
    }
    .miniNote{
      margin-top: 8px;
      opacity:.75;
      font-weight: 800;
      font-size: 11px;
    }

    /* story log list */
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

    @media (max-width: 1100px){
      :root{ --leftW: 1fr; --rightW: 1fr; }
      .gameHeader{ grid-template-columns: 1fr; }
      .gameHeaderControls{ grid-column: 1 / 2; justify-content:flex-start; }
      .gameLayout{ grid-template-columns: 1fr; }
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

    // Monsters (not needed now; kept)
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
  let boardResizeObserver: ResizeObserver | null = null;

  function renderGameScreen() {
    if (gameBuilt) return;
    gameBuilt = true;

    vGame.innerHTML = "";

    const stage = el("div", "gameStage");
    const wrap = el("div", "gameWrap");

    const header = el("div", "gameHeader");

    const headerLeft = el("div", "gameHeaderLeft");
    const title = el("div", "gameHeaderTitle");
    title.textContent = "Game";
    const sub = el("div", "gameHeaderSub");
    const sc: any = scenarios[scenarioIndex];
    sub.textContent = `Mode: ${mode ?? "—"} | Scenario: ${String(sc?.name ?? sc?.title ?? sc?.id ?? "")} | Tiles: ${
      activeTileSet
    }`;
    headerLeft.append(title, sub);

    const controls = el("div", "gameHeaderControls");

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

    controls.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn, forceRevealBtn, exitBtn);

    header.append(headerLeft, el("div"), el("div"));
    header.appendChild(controls);

    const layout = el("div", "gameLayout");

    // Left: Story log
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

    // Middle: Board
    const boardPanel = el("section", "panel");
    const boardHead = el("div", "panelHead");
    const boardTitle = el("div", "tag");
    boardTitle.innerHTML = `<span class="dot"></span> Board`;
    const boardPill = el("div", "pill");
    boardPill.textContent = `Build: ${BUILD_TAG}`;
    boardHead.append(boardTitle, boardPill);

    const boardBody = el("div", "boardBody");

    const infoTop = el("div", "infoTop");
    const infoLeft = el("div", "softCard infoText");
    const infoRight = el("div", "softCard infoText");
    infoTop.append(infoLeft, infoRight);

    // === 3 mini boards (left/below, center/current, right/above) ===
    const miniStrip = el("div", "miniStrip");

    const miniBelow = el("div", "miniBoard");
    miniBelow.innerHTML = `
      <div class="miniBoardHead">
        <div class="miniBoardTitle" id="miniBelowTitle">Layer —</div>
        <div class="pill" id="miniBelowPill" style="padding:6px 10px">—</div>
      </div>
      <div class="miniBoardGrid" id="miniBelowGrid"></div>
    `;

    const miniCurrent = el("div", "miniBoard");
    miniCurrent.innerHTML = `
      <div class="miniBoardHead">
        <div class="miniBoardTitle" id="miniCurrentTitle">Moving Map</div>
        <div class="pill" id="miniCurrentPill" style="padding:6px 10px">Layer —</div>
      </div>
      <div class="miniBoardGrid" id="miniCurrentGrid"></div>
    `;

    const miniAbove = el("div", "miniBoard");
    miniAbove.innerHTML = `
      <div class="miniBoardHead">
        <div class="miniBoardTitle" id="miniAboveTitle">Layer —</div>
        <div class="pill" id="miniAbovePill" style="padding:6px 10px">—</div>
      </div>
      <div class="miniBoardGrid" id="miniAboveGrid"></div>
    `;

    miniStrip.append(miniBelow, miniCurrent, miniAbove);

    const msgBar = el("div", "msgBar");
    msgBar.innerHTML = `<div class="msgLeft" id="msgLeft">Ready.</div><div class="msgRight" id="msgRight">Moves: 0</div>`;

    const boardScroll = el("div", "boardScroll");
    const boardWrap = el("div");
    boardWrap.style.display = "grid";
    boardWrap.style.gap = "10px";
    boardWrap.style.padding = "4px 4px 12px";
    boardScroll.appendChild(boardWrap);

    boardBody.append(infoTop, miniStrip, msgBar, boardScroll);
    boardPanel.append(boardHead, boardBody);

    // Right: Images
    const imgPanel = el("section", "panel");
    const imgHead = el("div", "panelHead");
    imgHead.innerHTML = `<div class="tag"><span class="dot"></span> Images</div><div class="pill">Now</div>`;
    const imgBody = el("div", "panelBody");

    // Keep existing moving-board in Images panel (so nothing is removed)
    const miniBoard = el("div", "miniBoard");
    miniBoard.innerHTML = `
      <div class="miniBoardHead">
        <div class="miniBoardTitle">Moving Map</div>
        <div class="pill" id="miniLayerPill" style="padding:6px 10px">Layer —</div>
      </div>
      <div class="miniBoardGrid" id="miniBoardGrid"></div>
      <div class="miniNote">Shows current row ordering (wraparound). Green = your current column.</div>
    `;

    const playerBox = el("div", "softCard");
    playerBox.innerHTML = `
      <div class="infoText" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <b>Player</b>
        <span class="pill" style="padding:6px 10px">${escapeHtml(chosenPlayer?.name ?? "—")}</span>
      </div>
      <div class="imgBox" style="margin-top:10px" id="playerImgBox">No player image.</div>
    `;

    const hexBox = el("div", "softCard");
    hexBox.style.marginTop = "10px";
    hexBox.innerHTML = `
      <div class="infoText" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <b>Current Hex</b>
        <span class="pill" id="hexLabelPill" style="padding:6px 10px">—</span>
      </div>
      <div class="imgBox" style="margin-top:10px" id="hexImgBox">No hex image.</div>
    `;

    imgBody.append(miniBoard, playerBox, hexBox);
    imgPanel.append(imgHead, imgBody);

    layout.append(storyPanel, boardPanel, imgPanel);

    wrap.append(header, layout);
    stage.appendChild(wrap);
    vGame.appendChild(stage);

    // ---- Dynamic hex sizing to fill width (7 across) ----
    function clamp(n: number, lo: number, hi: number) {
      return Math.max(lo, Math.min(hi, n));
    }

    function setHexLayoutVars() {
      const w = boardScroll.clientWidth;
      if (!w || w < 50) return;

      const gap = 5;
      const cols = 7;
      const minW = 46;
      const maxW = 92;

      const raw = (w - gap * (cols - 1)) / cols;
      const hexW = clamp(raw, minW, maxW);
      const hexH = Math.round(hexW * 0.88);
      const offset = Math.round((hexW + gap) / 2);

      (boardPanel as HTMLElement).style.setProperty("--hexGap", `${gap}px`);
      (boardPanel as HTMLElement).style.setProperty("--hexW", `${Math.round(hexW)}px`);
      (boardPanel as HTMLElement).style.setProperty("--hexH", `${hexH}px`);
      (boardPanel as HTMLElement).style.setProperty("--hexOffset", `${offset}px`);
    }

    if (boardResizeObserver) boardResizeObserver.disconnect();
    boardResizeObserver = new ResizeObserver(() => setHexLayoutVars());
    boardResizeObserver.observe(boardScroll);
    window.addEventListener("resize", setHexLayoutVars, { passive: true });

    // ---- Panels rendering ----
    function renderPlayerImageBox() {
      const box = document.getElementById("playerImgBox");
      if (!box) return;

      let url: string | null = null;
      if (chosenPlayer?.kind === "custom") url = chosenPlayer.imageDataUrl ?? null;
      else if (chosenPlayer?.kind === "preset") url = toPublicUrl(presetPlayerImage(chosenPlayer.id));

      // Debug (safe): shows exactly what path is being requested
      // eslint-disable-next-line no-console
      console.log("PLAYER IMG URL:", url);

      if (url) {
        box.innerHTML = `<img src="${url}" alt="player"
          onerror="this.remove(); this.parentElement && (this.parentElement.textContent='Player image not found.')">`;
      } else {
        box.textContent = "No player image.";
      }
    }

    function renderCurrentHexImageBox() {
      const pill = document.getElementById("hexLabelPill");
      const box = document.getElementById("hexImgBox");
      if (!pill || !box) return;

      const pid = state?.playerHexId ?? "—";
      pill.textContent = pid;

      const h: any = getHex(state?.playerHexId ?? "");
      const url = state?.playerHexId ? tileUrlForHex(state.playerHexId, h) : null;

      if (url) {
        box.innerHTML = `<img src="${url}" alt="hex"
          onerror="this.remove(); this.parentElement && (this.parentElement.textContent='Hex image missing.')">`;
      } else {
        box.textContent = "—";
      }
    }

    function rotateCols(len: number, shiftLeft: number) {
      const cols = Array.from({ length: len }, (_, i) => i + 1);
      const s = ((shiftLeft % len) + len) % len;
      return cols.slice(s).concat(cols.slice(0, s));
    }

    function renderMiniGrid(opts: {
      layer: number;
      gridEl: HTMLElement;
      titleEl: HTMLElement;
      pillEl: HTMLElement;
      showNumbers: boolean;
      redTitle?: boolean;
      redPill?: boolean;
      titleText: string;
      pillText: string;
      // highlight uses CURRENT PLAYER col/row even when showing other layers (as you described)
      highlightPlayer: boolean;
    }) {
      const { layer, gridEl, titleEl, pillEl, showNumbers, redTitle, redPill, titleText, pillText, highlightPlayer } =
        opts;

      titleEl.textContent = titleText;
      titleEl.classList.toggle("red", !!redTitle);
      pillEl.textContent = pillText;
      pillEl.classList.toggle("red", !!redPill);

      const pc = idToCoord(state?.playerHexId ?? "");
      const playerRow = pc?.row ?? -1;
      const playerCol = pc?.col ?? -1;

      gridEl.innerHTML = "";

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
          if (!showNumbers) cell.classList.add("ghost");

          cell.textContent = showNumbers ? String(c) : "";

          if (highlightPlayer && r === playerRow && c === playerCol) cell.classList.add("on");

          rowEl.appendChild(cell);
        }

        gridEl.appendChild(rowEl);
      }
    }

    // Main 3-mini-board strip: below/current/above relative to player
    function renderBoardMiniStrip() {
      const s: any = scenario();
      const layers = Number(s?.layers ?? 1);

      const belowLayer = currentLayer - 1;
      const aboveLayer = currentLayer + 1;

      const belowGrid = document.getElementById("miniBelowGrid");
      const belowTitle = document.getElementById("miniBelowTitle");
      const belowPill = document.getElementById("miniBelowPill");

      const curGrid = document.getElementById("miniCurrentGrid");
      const curTitle = document.getElementById("miniCurrentTitle");
      const curPill = document.getElementById("miniCurrentPill");

      const aboveGrid = document.getElementById("miniAboveGrid");
      const aboveTitle = document.getElementById("miniAboveTitle");
      const abovePill = document.getElementById("miniAbovePill");

      if (!belowGrid || !belowTitle || !belowPill || !curGrid || !curTitle || !curPill || !aboveGrid || !aboveTitle || !abovePill)
        return;

      // LEFT (below)
      if (belowLayer < 1) {
        renderMiniGrid({
          layer: 1, // doesn't matter; used only for shift lookups
          gridEl: belowGrid,
          titleEl: belowTitle,
          pillEl: belowPill,
          showNumbers: false,
          redTitle: true,
          redPill: true,
          titleText: "NO LAYER BELOW",
          pillText: "—",
          highlightPlayer: false,
        });
      } else {
        renderMiniGrid({
          layer: belowLayer,
          gridEl: belowGrid,
          titleEl: belowTitle,
          pillEl: belowPill,
          showNumbers: true,
          titleText: `Layer ${belowLayer}`,
          pillText: `Layer ${belowLayer}`,
          highlightPlayer: true,
        });
      }

      // CENTER (current)
      renderMiniGrid({
        layer: currentLayer,
        gridEl: curGrid,
        titleEl: curTitle,
        pillEl: curPill,
        showNumbers: true,
        titleText: "Moving Map",
        pillText: `Layer ${currentLayer}`,
        highlightPlayer: true,
      });

      // RIGHT (above)
      if (aboveLayer > layers) {
        renderMiniGrid({
          layer: layers, // doesn't matter; used only for shift lookups
          gridEl: aboveGrid,
          titleEl: aboveTitle,
          pillEl: abovePill,
          showNumbers: false,
          redTitle: true,
          redPill: true,
          titleText: "NO LAYER ABOVE",
          pillText: "—",
          highlightPlayer: false,
        });
      } else {
        renderMiniGrid({
          layer: aboveLayer,
          gridEl: aboveGrid,
          titleEl: aboveTitle,
          pillEl: abovePill,
          showNumbers: true,
          titleText: `Layer ${aboveLayer}`,
          pillText: `Layer ${aboveLayer}`,
          highlightPlayer: true,
        });
      }
    }

    // Existing Images-panel minimap (current layer only) — kept
    function renderMiniMovingBoard() {
      const grid = document.getElementById("miniBoardGrid");
      const pill = document.getElementById("miniLayerPill");
      if (!grid || !pill) return;

      const layer = currentLayer;
      pill.textContent = `Layer ${layer}`;

      const pc = idToCoord(state?.playerHexId ?? "");
      const playerRow = pc?.row ?? -1;
      const playerCol = pc?.col ?? -1;

      grid.innerHTML = "";

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
          if (r === playerRow && c === playerCol) cell.classList.add("on");
          rowEl.appendChild(cell);
        }

        grid.appendChild(rowEl);
      }
    }

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

    function renderInfoTop() {
      const s: any = scenario();

      infoLeft.innerHTML = `
        <div><b>Scenario:</b> ${escapeHtml(String(s.name ?? s.title ?? s.id ?? ""))}</div>
        <div><b>Mode:</b> ${escapeHtml(String(mode ?? "—"))}</div>
        <div><b>Player:</b> ${escapeHtml(String(state?.playerHexId ?? "?"))}</div>
        <div><b>Goal:</b> ${escapeHtml(String(posId(s.goal)))}</div>
        <div><b>Layer:</b> ${escapeHtml(String(currentLayer))}</div>
        <div><b>Tileset:</b> ${escapeHtml(activeTileSet)}</div>
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
      const left = document.getElementById("msgLeft");
      if (!left) return;

      const layerReachable = Array.from(reachable).filter((id) => idToCoord(id)?.layer === currentLayer).length;
      const stuckHint =
        layerReachable === 0 ? " No legal moves on this layer. Try another layer (or reset / find stairs)." : "";

      left.textContent = (message || "Ready.") + stuckHint;
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

      setHexLayoutVars();
    }

    function renderAll() {
      rebuildTransitionIndexAndHighlights();
      renderInfoTop();
      renderBoardMiniStrip(); // ✅ new 3-mini-board logic
      renderMessage();
      renderBoard();
      renderPlayerImageBox();
      renderCurrentHexImageBox();
      renderStoryLog();
      renderMiniMovingBoard(); // kept
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
    setHexLayoutVars();
    renderAll();
  }

  // --------------------------
  // Start app
  // --------------------------
  applyModeTheme();
  renderStart();
  setScreen("start");
}
