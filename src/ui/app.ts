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

const BUILD_TAG = "BUILD_TAG_TRANSITIONS_V2_THICK_GLOW";

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
  return String(str).replace(/[&<>"']/g, (m) => {
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

      --storyW: 320px;
      --imagesW: 300px;
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
    }
    @keyframes prism{
      0%{ transform: rotate(0deg) scale(1.05); }
      100%{ transform: rotate(360deg) scale(1.05); }
    }

    .shell{
      width: min(1500px, 100%);
      margin: 0 auto;
      padding: 18px 18px 22px;
      color: var(--ink);
    }

    .shell.kids{
      --card: rgba(8, 18, 44, .62);
      --card2: rgba(8, 18, 44, .42);
      --aqua:#00d4ff;
      --violet:#7a6cff;
    }

    .topBar{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:14px;
      flex-wrap:wrap;
      margin-bottom: 12px;
      position: relative;
      z-index: 2;
    }

    .brand{
      display:flex;
      align-items:center;
      gap:10px;
    }
    .dotBrand{
      width:10px;height:10px;border-radius:999px;
      background: rgba(255,152,0,.95);
      box-shadow: 0 0 18px rgba(255,152,0,.35);
    }
    .shell.kids .dotBrand{
      background: rgba(0,212,255,.95);
      box-shadow: 0 0 18px rgba(0, 212, 255, .35);
    }
    .brandTitle{font-weight:900; letter-spacing:.4px; font-size: 18px;}
    .crumb{opacity:.85; font-size: 13px; margin-top: 2px;}

    .view{ display:none; }
    .view.active{ display:block; }

    .card{
      border:1px solid var(--stroke2);
      background: rgba(10,16,34,.35);
      border-radius: calc(var(--radius) + 6px);
      padding: 14px;
      box-shadow:
        0 0 0 1px rgba(95,225,255,.08) inset,
        0 18px 60px rgba(0,0,0,.45);
      backdrop-filter: blur(10px);
      position:relative;
      z-index:1;
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
      opacity:.45;
      pointer-events:none;
    }

    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 980px){ .grid{ grid-template-columns: 1fr; } }

    h1{margin:0;font-size:42px;letter-spacing:.3px; position:relative; z-index:1}
    h2{margin:0 0 10px 0;font-size:18px; position:relative; z-index:1}
    h3{margin:0 0 10px 0;font-size:15px; position:relative; z-index:1}
    .hint{opacity:.85;font-size:13px; position:relative; z-index:1}
    .muted{opacity:.82}

    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap; position:relative; z-index:1}
    .btn{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(0,0,0,.22);
      color: var(--ink);
      cursor:pointer;
      user-select:none;
    }
    .btn:hover{border-color:rgba(255,255,255,.32)}
    .btn.primary{
      border-color: rgba(255,152,0,.40);
      background: rgba(255,152,0,.18);
    }
    .shell.kids .btn.primary{
      border-color: rgba(0, 212, 255, .40);
      background: rgba(0, 212, 255, .14);
    }
    .btn.small{padding:6px 8px;border-radius:10px;font-size:12px}

    /* ✅ Start screen: 3-column grid (tile | empty gap | tile) */
    .modeGrid{
      display:grid;
      grid-template-columns: 1fr 96px 1fr;
      align-items: stretch;
      width: 100%;
      position:relative;
      z-index:1;
    }
    @media (max-width: 980px){
      .modeGrid{
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }

    .modeTile{
      position: relative;
      height: 150px;
      width: 100%;
      border-radius: 22px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(0,0,0,.22);
      cursor: pointer;
      user-select: none;
      padding: 0;
    }
    .modeTile:hover{ border-color: rgba(255,255,255,.32); }
    .modeTile.primary{
      border-color: rgba(255,152,0,.55);
      box-shadow: 0 0 0 3px rgba(255,152,0,.10) inset;
    }
    .shell.kids .modeTile.primary{
      border-color: rgba(0, 212, 255, .55);
      box-shadow: 0 0 0 3px rgba(0, 212, 255, .10) inset;
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
    }
    .modeArrow{
      flex: 0 0 auto;
      width: 46px;
      height: 46px;
      border-radius: 14px;
      display:flex;
      align-items:center;
      justify-content:center;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(0,0,0,.22);
      font-size: 18px;
      opacity: .92;
    }

    .tile{
      padding: 12px;
      border-radius: 16px;
      border:1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 10px;
      position:relative;
      z-index:1;
    }
    .tile:hover{border-color:rgba(255,255,255,.28)}
    .tile.selected{
      border-color: rgba(255,152,0,.55);
      box-shadow: 0 0 0 3px rgba(255,152,0,.10) inset;
      background: rgba(255,152,0,.08);
    }
    .shell.kids .tile.selected{
      border-color: rgba(0, 212, 255, .55);
      box-shadow: 0 0 0 3px rgba(0, 212, 255, .10) inset;
      background: rgba(0, 212, 255, .08);
    }
    .tileMain{min-width:0}
    .tileTitle{font-weight:800; margin-bottom: 3px}
    .tileDesc{font-size:12px; opacity:.82; line-height:1.25}

    .drop{
      border:1px dashed rgba(255,255,255,.18);
      background: rgba(255,255,255,.03);
      border-radius: 16px;
      padding: 12px;
      display:flex;
      gap: 12px;
      align-items:center;
      position:relative;
      z-index:1;
    }
    .drop input{display:none}
    .preview{
      width:64px; height:64px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.12);
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
    .field{display:flex;flex-direction:column;gap:6px;margin-top:10px; position:relative; z-index:1}
    label{font-size:12px;opacity:.8}
    input[type="text"]{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(0,0,0,.22);
      color: var(--ink);
      outline:none;
    }

    /* -------------------------
       Screen 4: Game layout
    ------------------------- */
    .gameStage{
      border: 1px solid rgba(191,232,255,.20);
      background: linear-gradient(180deg, rgba(10,16,34,.58), rgba(10,16,34,.34));
      border-radius: calc(var(--radius) + 6px);
      box-shadow:
        0 0 0 1px rgba(95,225,255,.10) inset,
        0 18px 60px rgba(0,0,0,.55);
      padding: 12px;
      overflow:hidden;
      position:relative;
      z-index:1;
    }
    .gameStage::before{
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
        ),
        repeating-linear-gradient(
          45deg,
          rgba(95,225,255,.05) 0px,
          rgba(95,225,255,.05) 1px,
          transparent 1px,
          transparent 22px
        );
      opacity:.45;
      pointer-events:none;
    }

    .panel{
      border-radius: var(--radius);
      border: 1px solid rgba(160, 210, 255, .22);
      background: rgba(10,16,34,.45);
      overflow:hidden;
      box-shadow:
        0 0 0 1px rgba(95,225,255,.10) inset,
        0 18px 40px rgba(0,0,0,.35);
      display:flex;
      flex-direction:column;
      min-width: 0;
      min-height: 0;
    }
    .panelHead{
      padding:10px 12px;
      border-bottom: 1px solid rgba(191,232,255,.16);
      background: linear-gradient(180deg, rgba(10,16,34,.62), rgba(10,16,34,.30));
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
      max-width: 100%;
    }
    .pill strong{ color: var(--ink); }

    .infoText{
      font-size: 12px;
      line-height: 1.35;
    }
    .infoText b{
      font-weight: 700;
    }

    .gameHeaderGrid{
      display:grid;
      grid-template-columns: var(--storyW) 1fr var(--imagesW);
      gap: 12px;
      margin-top: 12px;
      margin-bottom: 12px;
      position:relative;
      z-index:1;
      min-width:0;
    }
    .gameHeaderLeft{ min-height: 1px; }
    .gameHeaderMid{
      display:flex;
      flex-direction:column;
      gap: 10px;
      min-width:0;
    }
    .gameHeaderRight{
      display:flex;
      align-items:flex-start;
      justify-content:flex-end;
      gap: 10px;
      flex-wrap:wrap;
      min-width:0;
    }

    .softCard{
      border:1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.22);
      border-radius: 14px;
      padding: 10px 12px;
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset;
      min-width:0;
    }

    .infoTopGrid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      min-width:0;
    }
    @media (max-width: 1100px){
      .infoTopGrid{ grid-template-columns: 1fr; }
    }

    .msgBar{
      border:1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.22);
      border-radius: 14px;
      padding: 10px 12px;
      min-height: 40px;
      display:flex;
      align-items:center;
      color: rgba(234,242,255,.92);
      font-weight: 650;
    }

    .controlsRow{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
      justify-content:flex-end;
    }
    select,button{
      padding:8px 10px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(0,0,0,.22);
      color: var(--ink);
    }
    button{cursor:pointer}
    button:hover{ border-color: rgba(255,255,255,.32); }

    .gameGrid{
      display:grid;
      grid-template-columns: var(--storyW) 1fr var(--imagesW);
      gap: 12px;
      min-height: 640px;
      height: calc(100vh - 210px);
      min-width:0;
      position:relative;
      z-index:1;
    }

    .storyBody{
      padding: 12px;
      display:flex;
      flex-direction:column;
      gap: 10px;
      overflow:auto;
      min-height:0;
    }

    .boardBody{
      padding: 12px;
      display:flex;
      flex-direction:column;
      gap: 12px;
      min-height:0;
      overflow:hidden;
    }

    .imagesBody{
      padding: 12px;
      display:flex;
      flex-direction:column;
      gap: 10px;
      min-height:0;
      overflow:hidden;
    }

    .imgFrame{
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.16);
      background: rgba(10,16,34,.28);
      overflow:hidden;
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset, 0 12px 28px rgba(0,0,0,.28);
      display:flex;
      flex-direction:column;
      min-height: 220px;
    }
    .imgFrameHead{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding: 10px 10px;
      border-bottom: 1px solid rgba(191,232,255,.12);
      background: linear-gradient(180deg, rgba(10,16,34,.55), rgba(10,16,34,.28));
      flex-wrap:wrap;
      flex: 0 0 auto;
    }
    .imgFrameBody{
      flex:1;
      min-height:0;
      display:flex;
      align-items:center;
      justify-content:center;
      padding: 10px;
      color: rgba(234,242,255,.72);
      font-size: 12px;
      text-align:center;
    }
    .imgFrameBody img{
      width: 100%;
      height: 100%;
      object-fit: cover;
      display:block;
    }

    .boardWrap{
      flex: 1;
      min-height: 0;
      display:flex;
      flex-direction:column;
      gap: 10px;
      overflow:auto;
      /* sizing knobs set by JS */
      --hexGap: 5px;
      --hexW: 64px;
      --hexH: calc(var(--hexW) * 0.88);
    }

    .hexRow{
      display:flex;
      gap: var(--hexGap);
      align-items:center;
    }
    .hexRow.offset{
      padding-left: calc((var(--hexW) / 2) + (var(--hexGap) / 2));
    }

    .hex{
      width: var(--hexW);
      height: var(--hexH);

      clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%);
      border:1px solid rgba(255,255,255,.18);
      background:rgba(255,255,255,.05);
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      position:relative;
      user-select:none;

      font-size: clamp(9px, calc(var(--hexW) * 0.18), 12px);
      line-height: 1.05;
      opacity:.95;
      font-weight: 700;
    }
    .hex:hover{border-color:rgba(255,255,255,.35)}
    .hex.sel{outline:2px solid rgba(255,255,255,.6)}
    .hex.reach{outline:2px solid rgba(76,175,80,.75)}
    .hex.player{background:rgba(76,175,80,.18)}
    .hex.goal{background:rgba(255,193,7,.16)}
    .hex.blocked{background:rgba(244,67,54,.14);opacity:.75}
    .hex.missing{background:rgba(120,120,120,.10);opacity:.45}
    .hex.fog{background:rgba(0,0,0,.38);opacity:.6}

    .hex.trSrc{
      outline:5px solid rgba(255,152,0,.95);
      box-shadow:
        0 0 0 3px rgba(255,152,0,.45),
        0 0 22px rgba(255,152,0,.75),
        0 0 44px rgba(255,152,0,.55);
    }
    .hex.trTgt{
      outline:5px solid rgba(3,169,244,.95);
      box-shadow:
        0 0 0 3px rgba(3,169,244,.45),
        0 0 22px rgba(3,169,244,.75),
        0 0 44px rgba(3,169,244,.55);
      animation:pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse{
      0%{filter:brightness(1)}
      50%{filter:brightness(1.35)}
      100%{filter:brightness(1)}
    }

    .dotHex{
      position:absolute;right:8px;top:8px;
      width:10px;height:10px;border-radius:999px;
      border:1px solid rgba(255,255,255,.35);
      background:rgba(255,255,255,.12);
    }
    .dotHex.player{background:rgba(76,175,80,.95);border-color:rgba(76,175,80,.95)}
    .dotHex.goal{background:rgba(255,193,7,.95);border-color:rgba(255,193,7,.95)}

    .dist{
      position:absolute;left:8px;bottom:8px;
      padding:2px 6px;border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(0,0,0,.30);
      font-size:11px;line-height:1;
    }
    .trBadge{
      position:absolute;left:8px;top:8px;
      padding:2px 6px;border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(0,0,0,.30);
      font-size:11px;line-height:1;
    }

    @media (max-width: 1100px){
      :root{
        --storyW: 1fr;
        --imagesW: 1fr;
      }
      .gameHeaderGrid{
        grid-template-columns: 1fr;
      }
      .gameHeaderRight{
        justify-content:flex-start;
      }
      .gameGrid{
        grid-template-columns: 1fr;
        height: auto;
        min-height: 0;
      }
      .boardWrap{ max-height: 560px; }
      .imagesBody{ overflow:auto; }
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

    const grid = el("div", "modeGrid");

    // GitHub Pages safe base
    const baseUrl = import.meta.env.BASE_URL; // "/<repo>/" on GH pages
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
      <div class="hint" style="margin-top:10px;">Mode: <b>${escapeHtml(String(mode ?? "—"))}</b></div>
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
    (customCard as HTMLElement).style.background = "rgba(0,0,0,.12)";
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

    // Monsters/Creatures
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

    // Custom monster/creature
    const customM = el("div", "card");
    (customM as HTMLElement).style.background = "rgba(0,0,0,.12)";
    (customM as HTMLElement).style.marginTop = "12px";

    const mh3 = el("h3");
    mh3.textContent = mode === "kids" ? "Add custom creature" : "Add custom monster";

    const mdrop = el("div", "drop");
    const mpreview = el("div", "preview");
    mpreview.textContent = "Drop\nImage";

    const mcontrols = el("div");
    mcontrols.style.flex = "1";
    mcontrols.style.minWidth = "220px";

    const mrow = el("div", "row");
    const mpick = el("button", "btn small");
    mpick.textContent = "Upload image";

    const minput = document.createElement("input");
    minput.type = "file";
    minput.accept = "image/*";
    mpick.addEventListener("click", () => minput.click());

    mrow.append(mpick, el("div", "hint"));
    (mrow.lastChild as HTMLElement).textContent = "PNG/JPG";

    const mNameField = el("div", "field");
    const mNameLabel = document.createElement("label");
    mNameLabel.textContent = "Name";
    const mNameInput = document.createElement("input");
    mNameInput.type = "text";
    mNameInput.placeholder = mode === "kids" ? "e.g. Sparkle Crab" : "e.g. Boneguard Variant";
    mNameField.append(mNameLabel, mNameInput);

    const mNotesField = el("div", "field");
    const mNotesLabel = document.createElement("label");
    mNotesLabel.textContent = "What is it / what does it do? (optional)";
    const mNotesInput = document.createElement("input");
    mNotesInput.type = "text";
    mNotesInput.placeholder = "Short description...";
    mNotesField.append(mNotesLabel, mNotesInput);

    mcontrols.append(mrow, mNameField, mNotesField);
    mdrop.append(mpreview, mcontrols, minput);

    let customMonsterImage: string | null = null;
    wireDropZone(mdrop, minput, mpreview, (url) => (customMonsterImage = url));

    const addMonsterBtn = el("button", "btn");
    addMonsterBtn.textContent = mode === "kids" ? "Add creature to roster" : "Add monster to roster";
    addMonsterBtn.addEventListener("click", () => {
      const nm = mNameInput.value.trim();
      if (!nm) {
        alert("Give it a name first.");
        return;
      }
      chosenMonsters.push({
        id: randId("custom"),
        name: nm,
        notes: mNotesInput.value.trim(),
        imageDataUrl: customMonsterImage,
        kind: "custom",
      });
      renderSetup();
    });

    customM.append(mh3, mdrop, addMonsterBtn);
    right.appendChild(customM);

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
  // Screen 4: Game
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

  function startScenario(idx: number) {
    scenarioIndex = idx;

    state = newGame(scenario());
    selectedId = state.playerHexId ?? null;
    currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;

    enterLayer(state, currentLayer);
    revealWholeLayer(currentLayer);
    recomputeReachability();

    message = "";
  }

  function getPlayerDisplayName() {
    if (!chosenPlayer) return "—";
    return chosenPlayer.kind === "preset" ? chosenPlayer.name : chosenPlayer.name;
  }

  function getPlayerImageUrl(): string | null {
    if (!chosenPlayer) return null;
    if (chosenPlayer.kind === "custom") return chosenPlayer.imageDataUrl ?? null;
    return null; // preset: no image yet
  }

  function renderGameScreen() {
    if (gameBuilt) return;
    gameBuilt = true;

    vGame.innerHTML = "";

    const titleWrap = el("div");
    const title = el("h1");
    title.textContent = "Game";
    const sub = el("div", "hint");
    const sc: any = scenarios[scenarioIndex];
    sub.textContent = `Mode: ${mode ?? "—"} | Scenario: ${String(sc?.name ?? sc?.title ?? sc?.id ?? "")}`;
    titleWrap.append(title, sub);

    const stage = el("div", "gameStage");

    // Header grid aligned to 3 columns
    const headerGrid = el("div", "gameHeaderGrid");
    const headerLeft = el("div", "gameHeaderLeft"); // empty (matches story column)
    const mid = el("div", "gameHeaderMid");
    const headerRight = el("div", "gameHeaderRight");

    // Middle: infoTop (two columns) + message bar
    const infoTop = el("div", "infoTopGrid");
    const infoLeft = el("div", "softCard infoText");
    const infoRight = el("div", "softCard infoText");
    infoTop.append(infoLeft, infoRight);

    const msgBar = el("div", "msgBar infoText");
    msgBar.textContent = "Ready.";

    mid.append(infoTop, msgBar);

    // Right: controls (scenario/layer/buttons/exit)
    const controlsRow = el("div", "controlsRow");
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
      renderSetup();
      setScreen("setup");
    });

    controlsRow.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn, forceRevealBtn, exitBtn);
    headerRight.append(controlsRow);

    headerGrid.append(headerLeft, mid, headerRight);

    // Main grid aligned to 3 columns
    const gameGrid = el("div", "gameGrid");

    // Column 1: Story Log
    const storyPanel = el("section", "panel");
    const storyHead = el("div", "panelHead");
    storyHead.append(
      (() => {
        const t = el("div", "tag");
        t.innerHTML = `<span class="dot"></span> Story Log`;
        return t;
      })(),
      (() => {
        const p = el("div", "pill");
        p.textContent = "Timeline";
        return p;
      })()
    );
    const storyBody = el("div", "storyBody");
    storyBody.append(
      (() => {
        const c = el("div", "softCard infoText");
        c.innerHTML = `<b>Story log will live here later.</b>`;
        return c;
      })(),
      (() => {
        const c = el("div", "softCard infoText");
        c.textContent = "Moves, discoveries, encounters, etc.";
        return c;
      })()
    );
    storyPanel.append(storyHead, storyBody);

    // Column 2: Board
    const boardPanel = el("section", "panel");
    const boardHead = el("div", "panelHead");
    boardHead.append(
      (() => {
        const t = el("div", "tag");
        t.innerHTML = `<span class="dot"></span> Board`;
        return t;
      })(),
      (() => {
        const p = el("div", "pill");
        p.innerHTML = `<strong>Build:</strong> ${escapeHtml(BUILD_TAG)}`;
        return p;
      })()
    );

    const boardBody = el("div", "boardBody");
    const boardWrap = el("div", "boardWrap");

    boardBody.append(boardWrap);
    boardPanel.append(boardHead, boardBody);

    // Column 3: Images
    const imagesPanel = el("section", "panel");
    const imagesHead = el("div", "panelHead");
    imagesHead.append(
      (() => {
        const t = el("div", "tag");
        t.innerHTML = `<span class="dot"></span> Images`;
        return t;
      })(),
      (() => {
        const p = el("div", "pill");
        p.textContent = "Now";
        return p;
      })()
    );

    const imagesBody = el("div", "imagesBody");

    const playerFrame = el("div", "imgFrame");
    const playerFrameHead = el("div", "imgFrameHead");
    playerFrameHead.innerHTML = `
      <div class="infoText"><b>Player</b></div>
      <div class="pill"><strong>${escapeHtml(getPlayerDisplayName())}</strong></div>
    `;
    const playerFrameBody = el("div", "imgFrameBody");
    playerFrame.append(playerFrameHead, playerFrameBody);

    const hexFrame = el("div", "imgFrame");
    const hexFrameHead = el("div", "imgFrameHead");
    hexFrameHead.innerHTML = `
      <div class="infoText"><b>Current Hex</b></div>
      <div class="pill"><strong>${escapeHtml(String(state?.playerHexId ?? "—"))}</strong></div>
    `;
    const hexFrameBody = el("div", "imgFrameBody");
    hexFrameBody.textContent = "NORMAL";
    hexFrame.append(hexFrameHead, hexFrameBody);

    imagesBody.append(playerFrame, hexFrame);
    imagesPanel.append(imagesHead, imagesBody);

    gameGrid.append(storyPanel, boardPanel, imagesPanel);

    // mount
    stage.append(headerGrid, gameGrid);
    vGame.append(titleWrap, stage);

    // Fit hexes to width: (100% - gaps) / 7, clamp, and offset rows via CSS
    function fitHexesToBoard() {
      const cols = 7;
      const gap = 5;
      const w = boardWrap.clientWidth;
      if (!w) return;

      const raw = (w - (cols - 1) * gap) / cols;
      const minW = 44;
      const maxW = 92;
      const hexW = Math.max(minW, Math.min(maxW, Math.floor(raw)));

      boardWrap.style.setProperty("--hexGap", `${gap}px`);
      boardWrap.style.setProperty("--hexW", `${hexW}px`);
    }

    const ro = new ResizeObserver(() => fitHexesToBoard());
    ro.observe(boardWrap);
    window.addEventListener("resize", fitHexesToBoard);

    function renderPlayerImagePanel() {
      const url = getPlayerImageUrl();
      if (url) {
        playerFrameBody.innerHTML = `<img src="${url}" alt="player">`;
      } else {
        playerFrameBody.textContent = "Preset player (no image yet).";
      }
    }

    function renderHexPanel() {
      const cur = state?.playerHexId ?? "—";
      hexFrameHead.innerHTML = `
        <div class="infoText"><b>Current Hex</b></div>
        <div class="pill"><strong>${escapeHtml(String(cur))}</strong></div>
      `;
      // placeholder until you attach per-hex images later
      hexFrameBody.textContent = String(getHex(cur as any)?.kind ?? "NORMAL");
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
          btn.textContent = `R${r} C${c}`;

          const { blocked, missing } = isBlockedOrMissing(h);
          const isGoal = h?.kind === "GOAL";
          const isPlayer = state.playerHexId === id;

          if (missing) btn.classList.add("missing");
          if (blocked) btn.classList.add("blocked");
          if (!isRevealed(h)) btn.classList.add("fog");
          if (isGoal) btn.classList.add("goal");
          if (isPlayer) btn.classList.add("player");
          if (info?.reachable) btn.classList.add("reach");
          if (selectedId === id) btn.classList.add("sel");

          if (sourcesOnLayer.has(id)) btn.classList.add("trSrc");

          if (targetsSameLayer.has(id)) {
            btn.classList.add("trTgt");
            const badge = el("div", "trBadge");
            badge.textContent = targetsSameLayer.get(id)!;
            btn.appendChild(badge);
          }

          if (isPlayer) {
            const d = el("div", "dotHex player");
            btn.appendChild(d);
          } else if (isGoal) {
            const d = el("div", "dotHex goal");
            btn.appendChild(d);
          }

          if (info?.reachable && info.distance != null) {
            const d = el("div", "dist");
            d.textContent = String(info.distance);
            btn.appendChild(d);
          }

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

              const playerCoord = idToCoord(state!.playerHexId);
              if (playerCoord) currentLayer = playerCoord.layer;

              setLayerOptions(layerSelect);
              recomputeReachability();
              rebuildTransitionIndexAndHighlights();

              renderAll();
              return;
            } else {
              message = res.reason ? `Move rejected: ${res.reason}` : "Move rejected.";
            }

            renderAll();
          });

          row.appendChild(btn);
        }

        boardWrap.appendChild(row);
      }

      // after DOM updates, fit again
      fitHexesToBoard();
    }

    function renderAll() {
      rebuildTransitionIndexAndHighlights();
      renderInfoTop();
      renderMessage();
      renderBoard();
      renderPlayerImagePanel();
      renderHexPanel();
    }

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
      enterLayer(state, currentLayer);
      revealWholeLayer(currentLayer);
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
      message = "";
      renderAll();
    });

    forceRevealBtn.addEventListener("click", () => {
      revealWholeLayer(currentLayer);
      recomputeReachability();
      message = "Forced reveal layer + recomputed reachability.";
      renderAll();
    });

    setLayerOptions(layerSelect);
    if (state) enterLayer(state, currentLayer);
    revealWholeLayer(currentLayer);
    recomputeReachability();
    fitHexesToBoard();
    renderAll();
  }

  // --------------------------
  // Start app
  // --------------------------
  applyModeTheme();
  renderStart();
  setScreen("start");
}
