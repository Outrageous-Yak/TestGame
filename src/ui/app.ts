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
      width: 100%;
      max-width: 1800px; /* uses more of screen width */
      margin: 0 auto;
      padding: 18px 18px 26px;
      position:relative;
      z-index:1;
    }

    .topBar{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom: 14px;
    }
    .brand{display:flex; align-items:center; gap:10px;}
    .dotBrand{
      width:8px;height:8px;border-radius:999px;
      background: radial-gradient(circle at 30% 30%, var(--ice), var(--aqua));
      box-shadow: 0 0 14px rgba(95,225,255,.35);
      border: 1px solid rgba(191,232,255,.22);
    }
    .brandTitle{font-weight:900; letter-spacing:.4px; font-size: 18px;}
    .crumb{opacity:.85; font-size: 13px;}
    .view{ display:none; }
    .view.active{ display:block; }

    .card{
      border:1px solid var(--stroke2);
      background: rgba(10,16,34,.40);
      border-radius: calc(var(--radius) + 6px);
      padding: 14px;
      box-shadow:
        0 0 0 1px rgba(95,225,255,.08) inset,
        0 18px 60px rgba(0,0,0,.35);
      backdrop-filter: blur(10px);
    }

    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 980px){ .grid{ grid-template-columns: 1fr; } }

    h1{margin:0;font-size:42px;letter-spacing:.3px}
    h2{margin:0 0 10px 0;font-size:18px}
    h3{margin:0 0 10px 0;font-size:15px}
    .hint{opacity:.86;font-size:13px; color: var(--muted)}
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
      box-shadow: 0 10px 24px rgba(0,0,0,.20);
    }
    .btn:hover{border-color:rgba(191,232,255,.32)}
    .btn.primary{
      border-color: rgba(95,225,255,.35);
      background: rgba(95,225,255,.10);
      box-shadow: 0 0 0 1px rgba(95,225,255,.10) inset, 0 12px 26px rgba(0,0,0,.28);
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
      .modeGrid{ grid-template-columns: 1fr; gap: 16px; }
    }

    /* ✅ Start tiles */
    .modeTile{
      position: relative;
      min-height: 0;
      width: 100%;
      border-radius: 22px;
      overflow: hidden;
      border: 1px solid rgba(191,232,255,.18);
      background: rgba(10,16,34,.22);
      cursor: pointer;
      user-select: none;
      padding: 0;
      box-shadow: 0 12px 30px rgba(0,0,0,.28);
    }
    .modeTile:hover{ border-color: rgba(191,232,255,.32); }
    .modeTile.primary{
      border-color: rgba(95,225,255,.38);
      box-shadow: 0 0 0 3px rgba(95,225,255,.10) inset, 0 12px 30px rgba(0,0,0,.28);
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
      border:1px solid rgba(191,232,255,.18);
      background: rgba(10,16,34,.22);
      font-size: 18px;
      opacity: .92;
    }

    .tile{
      padding: 12px;
      border-radius: 16px;
      border:1px solid rgba(191,232,255,.14);
      background: rgba(10,16,34,.22);
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 10px;
      box-shadow: 0 10px 24px rgba(0,0,0,.18);
    }
    .tile:hover{border-color:rgba(191,232,255,.28)}
    .tile.selected{
      border-color: rgba(95,225,255,.38);
      box-shadow: 0 0 0 3px rgba(95,225,255,.10) inset, 0 10px 24px rgba(0,0,0,.18);
      background: rgba(95,225,255,.06);
    }
    .tileMain{min-width:0}
    .tileTitle{font-weight:800; margin-bottom: 3px}
    .tileDesc{font-size:12px; opacity:.82; line-height:1.25}

    .drop{
      border:1px dashed rgba(191,232,255,.18);
      background: rgba(10,16,34,.18);
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
    label{font-size:12px;opacity:.8}
    input[type="text"]{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(191,232,255,.18);
      background: rgba(5,8,18,.45);
      color: var(--ink);
      outline:none;
    }

    /* --------------------------
       GAME SCREEN (3 columns)
    -------------------------- */
    .stageGame{
      width: 100%;
      border-radius: calc(var(--radius) + 6px);
      padding: 12px;
      background: linear-gradient(180deg, rgba(10,16,34,.58), rgba(10,16,34,.34));
      border: 1px solid rgba(191,232,255,.20);
      box-shadow:
        0 0 0 1px rgba(95,225,255,.10) inset,
        0 18px 60px rgba(0,0,0,.55);
      overflow:hidden;

      /* key: avoid forced empty space */
      min-height: 0;
    }
    .stageGame::before{
      content:"";
      position:absolute;
      inset:0;
      pointer-events:none;
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
      opacity:.55;
    }

    .gameGrid{
      position:relative;
      z-index:1;
      display:grid;
      grid-template-columns: 300px 1fr 300px;
      gap: var(--colGap);
      min-height: 0;
    }
    @media (max-width: 1100px){
      .gameGrid{ grid-template-columns: 1fr; }
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
    }
    .pill strong{ color: var(--ink); }

    .panelBody{
      padding: 12px;
      min-height: 0;
    }

    /* Board column internals */
    .boardBody{
      padding: 12px;
      display:flex;
      flex-direction:column;
      gap: 10px;
      min-height: 0;
    }

    .controlsRow{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
      justify-content:flex-end;
    }
    .ctrlSelect,.ctrlBtn{
      padding:8px 10px;
      border-radius:12px;
      border:1px solid rgba(191,232,255,.18);
      background: rgba(5,8,18,.45);
      color: var(--ink);
      box-shadow: 0 10px 22px rgba(0,0,0,.20);
    }
    .ctrlBtn{ cursor:pointer; }
    .ctrlBtn:hover,.ctrlSelect:hover{ border-color: rgba(191,232,255,.32); }

    /* the NEW "above-board" 2-column grid */
    .aboveGrid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    @media (max-width: 980px){
      .aboveGrid{ grid-template-columns: 1fr; }
    }

    .miniCard{
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.16);
      background: rgba(10,16,34,.30);
      box-shadow: 0 0 0 1px rgba(95,225,255,.06) inset, 0 12px 28px rgba(0,0,0,.24);
      padding: 10px 12px;
    }
    .miniCard b{ color: var(--ink); }

    .msgBar{
      padding:10px 12px;
      border-radius:14px;
      border:1px solid rgba(191,232,255,.12);
      background: rgba(10,16,34,.22);
      color: var(--ink);
    }

    .boardWrap{
      display:grid;
      gap: 10px;
      padding-top: 2px;
    }

    .hexRow{display:flex;gap:10px;align-items:center}
    .hexRow.offset{padding-left:34px}

    .hex{
      width:68px;height:60px;
      clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%);
      border:2px solid rgba(191,232,255,.16);
      background:rgba(255,255,255,.05);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer; position:relative;
      user-select:none; font-size:12px;
      opacity:.95;
    }
    .hex:hover{border-color:rgba(191,232,255,.30)}
    .hex.sel{outline:22px solid rgba(191,232,255,.55)}
    .hex.reach{outline:22px solid rgba(76,175,80,.75)}
    .hex.player{background:rgba(76,175,80,.18)}
    .hex.goal{background:rgba(255,193,7,.16)}
    .hex.blocked{background:rgba(244,67,54,.14);opacity:.78}
    .hex.missing{background:rgba(120,120,120,.10);opacity:.45}
    .hex.fog{background:rgba(0,0,0,.38);opacity:.6}

    .hex.trSrc{
      outline:25px solid rgba(255,152,0,.95);
      box-shadow:
        0 0 0 3px rgba(255,152,0,.45),
        0 0 22px rgba(255,152,0,.75),
        0 0 44px rgba(255,152,0,.55);
    }
    .hex.trTgt{
      outline:25px solid rgba(3,169,244,.95);
      box-shadow:
        0 0 0 3px rgba(3,169,244,.45),
        0 0 22px rgba(3,169,244,.75),
        0 0 44px rgba(3,169,244,.55);
      animation:pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse{
      0%{filter:brightness(1)}
      50%{filter:brightness(1.30)}
      100%{filter:brightness(1)}
    }

    .hexDot{
      position:absolute;right:8px;top:8px;
      width:10px;height:10px;border-radius:999px;
      border:1px solid rgba(191,232,255,.35);
      background:rgba(255,255,255,.12);
    }
    .hexDot.player{background:rgba(76,175,80,.95);border-color:rgba(76,175,80,.95)}
    .hexDot.goal{background:rgba(255,193,7,.95);border-color:rgba(255,193,7,.95)}

    .dist{
      position:absolute;left:8px;bottom:8px;
      padding:2px 6px;border-radius:999px;
      border:1px solid rgba(191,232,255,.18);
      background:rgba(0,0,0,.30);
      font-size:11px;line-height:1;
    }
    .trBadge{
      position:absolute;left:8px;top:8px;
      padding:2px 6px;border-radius:999px;
      border:1px solid rgba(191,232,255,.18);
      background:rgba(0,0,0,.30);
      font-size:11px;line-height:1;
    }

    /* Story and Images column placeholders */
    .storyList{
      display:grid;
      gap: 10px;
    }
    .storyItem{
      border-radius: 14px;
      border: 1px solid rgba(191,232,255,.12);
      background: rgba(10,16,34,.22);
      padding: 10px 12px;
      color: var(--ink);
    }

    .imgStack{
      display:grid;
      gap: 10px;
    }
    .imgCard{
      border-radius: 16px;
      border: 1px solid rgba(191,232,255,.16);
      background: rgba(10,16,34,.22);
      padding: 10px 12px;
      min-height: 220px;
      display:flex;
      flex-direction:column;
      gap: 8px;
    }
    .imgHead{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap: 10px;
      flex-wrap:wrap;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(191,232,255,.12);
      color: var(--muted);
      font-size: 12px;
    }
    .imgFrame{
      flex: 1;
      min-height: 0;
      border-radius: 14px;
      border: 1px solid rgba(191,232,255,.12);
      background: rgba(0,0,0,.18);
      display:grid;
      place-items:center;
      overflow:hidden;
      color: var(--muted);
      font-size: 12px;
      text-align:center;
      padding: 10px;
    }
    .imgFrame img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
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

  async function loadModeContent(nextMode: Mode) {
    mode = nextMode;

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
    const baseUrl = import.meta.env.BASE_URL;
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
      <div class="hint" style="margin-top:10px;">Mode: <b>${mode ?? "—"}</b></div>
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
    (customCard as HTMLElement).style.background = "rgba(10,16,34,.22)";
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
    (customM as HTMLElement).style.background = "rgba(10,16,34,.22)";
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

  function renderGameScreen() {
    if (gameBuilt) {
      // re-render existing
      (vGame as HTMLElement).innerHTML = "";
      gameBuilt = false;
    }
    gameBuilt = true;

    vGame.innerHTML = "";

    // Title area (top left)
    const titleRow = el("div");
    titleRow.style.marginBottom = "12px";

    const title = el("h1");
    title.textContent = "Game";
    const sub = el("div", "hint");
    const sc: any = scenarios[scenarioIndex];
    sub.textContent = `Mode: ${mode ?? "—"} | Scenario: ${String(sc?.name ?? sc?.title ?? sc?.id ?? "")}`;
    titleRow.append(title, sub);

    const stage = el("div", "stageGame");
    // stage has ::before, needs relative
    (stage as HTMLElement).style.position = "relative";

    const grid = el("div", "gameGrid");

    // LEFT: Story Log
    const storyPanel = el("section", "panel");
    const storyHead = el("div", "panelHead");
    storyHead.innerHTML = `<div class="tag"><span class="dot"></span> Story Log</div><div class="pill">Timeline</div>`;
    const storyBody = el("div", "panelBody");
    const storyList = el("div", "storyList");
    const si1 = el("div", "storyItem");
    si1.textContent = "Story log will live here later.";
    const si2 = el("div", "storyItem");
    si2.textContent = "Moves, discoveries, encounters, etc.";
    storyList.append(si1, si2);
    storyBody.appendChild(storyList);
    storyPanel.append(storyHead, storyBody);

    // MIDDLE: Board
    const boardPanel = el("section", "panel");

    const boardHead = el("div", "panelHead");
    const headLeft = el("div", "tag");
    headLeft.innerHTML = `<span class="dot"></span> Board`;
    const headRight = el("div", "controlsRow");

    const scenarioSelect = el("select", "ctrlSelect") as HTMLSelectElement;
    scenarios.forEach((s: any, i: number) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String((s as any).name ?? (s as any).title ?? (s as any).id ?? `Scenario ${i + 1}`);
      scenarioSelect.appendChild(opt);
    });
    scenarioSelect.value = String(scenarioIndex);

    const layerSelect = el("select", "ctrlSelect") as HTMLSelectElement;

    const endTurnBtn = el("button", "ctrlBtn") as HTMLButtonElement;
    endTurnBtn.textContent = "End turn";

    const resetBtn = el("button", "ctrlBtn") as HTMLButtonElement;
    resetBtn.textContent = "Reset run";

    const forceRevealBtn = el("button", "ctrlBtn") as HTMLButtonElement;
    forceRevealBtn.textContent = "Force reveal layer";

    const exitBtn = el("button", "ctrlBtn") as HTMLButtonElement;
    exitBtn.textContent = "Exit";
    exitBtn.addEventListener("click", () => {
      renderSetup();
      setScreen("setup");
    });

    headRight.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn, forceRevealBtn, exitBtn);
    boardHead.append(headLeft, headRight);

    const boardBody = el("div", "boardBody");

    const aboveGrid = el("div", "aboveGrid");
    const leftInfo = el("div", "miniCard");
    const rightInfo = el("div", "miniCard");
    aboveGrid.append(leftInfo, rightInfo);

    const msgBar = el("div", "msgBar");
    const boardWrap = el("div", "boardWrap");

    boardBody.append(aboveGrid, msgBar, boardWrap);
    boardPanel.append(boardHead, boardBody);

    // RIGHT: Images
    const imgPanel = el("section", "panel");
    const imgHead = el("div", "panelHead");
    imgHead.innerHTML = `<div class="tag"><span class="dot"></span> Images</div><div class="pill">Now</div>`;
    const imgBody = el("div", "panelBody");
    const imgStack = el("div", "imgStack");

    const playerCard = el("div", "imgCard");
    playerCard.innerHTML = `
      <div class="imgHead"><span>Player</span><span class="pill">${escapeHtml(chosenPlayer?.name ?? "—")}</span></div>
      <div class="imgFrame" id="playerImgFrame">Preset player (no image yet).</div>
    `;

    const hexCard = el("div", "imgCard");
    hexCard.innerHTML = `
      <div class="imgHead"><span>Current Hex</span><span class="pill" id="hexLabelPill">—</span></div>
      <div class="imgFrame" id="hexImgFrame">NORMAL</div>
    `;

    imgStack.append(playerCard, hexCard);
    imgBody.append(imgStack);
    imgPanel.append(imgHead, imgBody);

    grid.append(storyPanel, boardPanel, imgPanel);
    stage.appendChild(grid);

    vGame.append(titleRow, stage);

    function renderAbove() {
      const s: any = scenario();
      const goal = posId(s.goal);

      leftInfo.innerHTML = `
        <div><b>Scenario:</b> ${escapeHtml(String(s.name ?? s.title ?? s.id ?? ""))}</div>
        <div><b>Mode:</b> ${escapeHtml(String(mode ?? "—"))}</div>
        <div><b>Player:</b> ${escapeHtml(String(state?.playerHexId ?? "?"))}</div>
        <div><b>Goal:</b> ${escapeHtml(goal)}</div>
        <div><b>Layer:</b> ${escapeHtml(String(currentLayer))}</div>
      `;

      const sel = selectedId ?? "—";
      const h: any = selectedId ? getHex(selectedId) : null;
      const info = selectedId ? reachMap[selectedId] : null;

      rightInfo.innerHTML = `
        <div><b>Selected:</b> ${escapeHtml(sel)}</div>
        <div><b>Kind:</b> ${escapeHtml(String(h?.kind ?? "—"))}</div>
        <div><b>Reachable:</b> ${escapeHtml(String(info?.reachable ? "yes" : "no"))}</div>
        <div><b>Distance:</b> ${escapeHtml(String(info?.distance ?? "—"))}</div>
        <div style="margin-top:6px;color:rgba(234,242,255,.80)">
          <b>Reachable</b> (${escapeHtml(String(currentLayer))}): ${escapeHtml(
            String(Array.from(reachable).filter((id) => idToCoord(id)?.layer === currentLayer).length)
          )} &nbsp;•&nbsp;
          <b>Outgoing</b>: ${escapeHtml(String(outgoingFromSelected.length))}
          <div class="hint" style="margin-top:6px;">Build: ${escapeHtml(BUILD_TAG)}</div>
        </div>
      `;

      msgBar.textContent = message || "Ready.";

      const hexPill = document.getElementById("hexLabelPill");
      if (hexPill) hexPill.textContent = state?.playerHexId ?? "—";
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
            const d = el("div", "hexDot player");
            btn.appendChild(d);
          } else if (isGoal) {
            const d = el("div", "hexDot goal");
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
    }

    function renderAll() {
      rebuildTransitionIndexAndHighlights();
      renderAbove();
      renderBoard();
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
    renderAll();
  }

  // --------------------------
  // Start app
  // --------------------------
  renderStart();
  setScreen("start");
}
