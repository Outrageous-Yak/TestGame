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
      --bg:#0b0f1a;
      --panel: rgba(0,0,0,.16);
      --border: rgba(255,255,255,.12);
      --text:#e8e8e8;
      --muted: rgba(232,232,232,.80);
      --accent: rgba(255,152,0,.95);
      --accent2: rgba(3,169,244,.95);
      --radius: 18px;

      --sideW: 360px;
      --imgW: 340px;
      --gap: 14px;

      --baseFont: 12px;
      --baseLine: 1.35;
    }

    *{ box-sizing:border-box; }

    .shell{
      max-width: 100%;
      margin: 0 auto;
      padding: 18px;
      font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial;
      color: var(--text);

      font-size: var(--baseFont);
      line-height: var(--baseLine);
    }
    .shell.kids{
      --bg:#0b1020;
      --panel: rgba(10, 20, 60, .22);
      --accent: rgba(0, 212, 255, .95);
      --accent2: rgba(255, 193, 7, .95);
    }

    .topBar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      margin-bottom: 14px;
    }
    .brand{display:flex; align-items:center; gap:10px;}
    .dotBrand{
      width:10px;height:10px;border-radius:999px;
      background: var(--accent);
      box-shadow: 0 0 18px rgba(255,152,0,.35);
    }
    .shell.kids .dotBrand{ box-shadow: 0 0 18px rgba(0, 212, 255, .35); }
    .brandTitle{font-weight:800; letter-spacing:.4px; font-size: 16px;}
    .crumb{opacity:.85; font-size: 12px;}

    .view{ display:none; }
    .view.active{ display:block; }

    .card{
      border:1px solid var(--border);
      background: var(--panel);
      border-radius: var(--radius);
      padding: 14px;
    }

    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    @media (max-width: 980px){ .grid{ grid-template-columns: 1fr; } }

    h1{margin:0;font-size:34px;letter-spacing:.3px;font-weight:900;line-height:1.05;}
    h2{margin:0 0 10px 0;font-size:16px;font-weight:850;line-height:1.15;}
    h3{margin:0 0 10px 0;font-size:13px;font-weight:800;line-height:1.2;}

    .hint{opacity:.85;font-size:12px;line-height:1.35}
    .muted{opacity:.82}

    .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .btn{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(0,0,0,.22);
      color: var(--text);
      cursor:pointer;
      user-select:none;
      font-size: 12px;
      line-height: 1.2;
      font-weight: 750;
    }
    .btn:hover{border-color:rgba(255,255,255,.32)}
    .btn.primary{
      border-color: rgba(255,152,0,.40);
      background: rgba(255,152,0,.18);
    }
    .btn.small{padding:6px 8px;border-radius:10px;font-size:11px}

    /* Start screen tiles */
    .modeGrid{
      display:grid;
      grid-template-columns: 1fr 96px 1fr;
      align-items: stretch;
      width: 100%;
    }
    @media (max-width: 980px){
      .modeGrid{ grid-template-columns: 1fr; gap: 16px; }
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
      font-size: 20px;
      line-height: 1.05;
    }
    .modeTextWrap .sub{
      margin-top: 8px;
      font-size: 12px;
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
      font-size: 12px;
      line-height: 1.35;
    }
    .tile:hover{border-color:rgba(255,255,255,.28)}
    .tile.selected{
      border-color: rgba(255,152,0,.55);
      box-shadow: 0 0 0 3px rgba(255,152,0,.10) inset;
      background: rgba(255,152,0,.08);
    }
    .tileMain{min-width:0}
    .tileTitle{font-weight:850; margin-bottom: 3px; font-size: 13px;}
    .tileDesc{font-size:12px; opacity:.82; line-height:1.25}

    .drop{
      border:1px dashed rgba(255,255,255,.18);
      background: rgba(255,255,255,.03);
      border-radius: 16px;
      padding: 12px;
      display:flex;
      gap: 12px;
      align-items:center;
      font-size: 12px;
      line-height: 1.35;
    }
    .drop input{display:none}
    .preview{
      width:64px; height:64px;
      border-radius:16px;
      border:1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.25);
      display:grid; place-items:center;
      overflow:hidden;
      font-size:11px;
      text-align:center;
      opacity:.85;
      flex:0 0 auto;
      white-space:pre-line;
      line-height: 1.15;
    }
    .preview img{width:100%;height:100%;object-fit:cover;display:block}
    .field{display:flex;flex-direction:column;gap:6px;margin-top:10px}
    label{font-size:11px;opacity:.8}
    input[type="text"]{
      padding:8px 10px;
      border-radius: 12px;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(0,0,0,.22);
      color: var(--text);
      outline:none;
      font-size: 12px;
      line-height: 1.2;
    }

    /* --- GAME LAYOUT --- */
    .gameWrap{ width:100%; max-width:100%; }

    .gameHeaderGrid{
      display:grid;
      grid-template-columns: var(--sideW) 1fr var(--imgW);
      gap: var(--gap);
      align-items: start;
      margin-bottom: 12px;
    }

    .gameTitleBox{ min-width:0; }
    .gameTitleBox h1{ margin:0; font-size:34px; letter-spacing:.3px; }
    .gameTitleBox .hint{ margin-top:6px; }

    .gameHeaderMid{
      min-width: 0;
      display:flex;
      flex-direction:column;
      gap: 10px;
    }

    .gameHeaderControls{
      display:flex;
      justify-content:flex-end;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
    }

    select,button{
      padding:8px 10px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(0,0,0,.22);
      color:#e8e8e8;
      font-size: 12px;
      line-height: 1.2;
      font-weight: 750;
    }
    button{cursor:pointer}

    .gridGame3{
      display:grid;
      grid-template-columns: var(--sideW) 1fr var(--imgW);
      gap: var(--gap);
      align-items: stretch;
    }

    .panelGame{
      border:1px solid rgba(255,255,255,.12);
      background:rgba(0,0,0,.16);
      border-radius:18px;
      overflow:hidden;
      min-width: 0;
      display:flex;
      flex-direction:column;
      box-shadow: 0 0 0 1px rgba(3,169,244,.08) inset, 0 18px 60px rgba(0,0,0,.35);
      font-size: 12px;
      line-height: 1.35;
    }

    .panelHead{
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,.10);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      flex-wrap:wrap;
      background: linear-gradient(180deg, rgba(10,16,34,.62), rgba(10,16,34,.30));
    }
    .panelHead .leftTag{ display:flex; align-items:center; gap:10px; }
    .panelDot{
      width:8px;height:8px;border-radius:999px;
      background: rgba(3,169,244,.95);
      box-shadow: 0 0 14px rgba(3,169,244,.35);
    }
    .panelTitle{ font-weight: 900; font-size: 12px; letter-spacing:.2px; }
    .pill{
      font-size: 11px;
      opacity:.85;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(0,0,0,.18);
      font-weight: 700;
    }

    .panelBody{
      padding: 12px;
      display:flex;
      flex-direction:column;
      gap: 10px;
      min-height: 0;
      flex: 1;
    }

    .softCard{
      border:1px solid rgba(255,255,255,.10);
      background: rgba(0,0,0,.14);
      border-radius: 16px;
      padding: 10px 12px;
      min-width:0;
      font-size: 12px;
      line-height: 1.35;
    }

    /* Make ALL text blocks consistent with your desired style */
    .infoText{
      font-size: 12px;
      line-height: 1.35;
    }
    .infoText b{
      font-weight: 700;
    }

    .infoGrid2{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      align-items: stretch;
    }

    .msgBar{
      padding:10px 12px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(0,0,0,.18);
      font-size: 12px;
      line-height: 1.35;
      font-weight: 700;
    }

    /* Board-wide sizing knobs */
.boardWrap{
  --hexGap: 10px;
  --hexW: clamp(44px, 6.4vh, 92px); /* keep your current behaviour for now */
  --hexH: calc(var(--hexW) * 0.88);
}

/* rows */
.hexRow{
  display:flex;
  gap: var(--hexGap);
  align-items:center;
}

/* ✅ offset tied to hex size (fixes phone drift) */
.hexRow.offset{
  padding-left: calc((var(--hexW) / 2) + (var(--hexGap) / 2));
}

.hex{
  width: var(--hexW);
  height: var(--hexH);

  clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%);
  border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.05);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer; position:relative;
  user-select:none;

  /* ✅ label scales with size */
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

    .dot{
      position:absolute;right:8px;top:8px;
      width:10px;height:10px;border-radius:999px;
      border:1px solid rgba(255,255,255,.35);
      background:rgba(255,255,255,.12);
    }
    .dot.player{background:rgba(76,175,80,.95);border-color:rgba(76,175,80,.95)}
    .dot.goal{background:rgba(255,193,7,.95);border-color:rgba(255,193,7,.95)}

    .dist{
      position:absolute;left:8px;bottom:8px;
      padding:2px 6px;border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(0,0,0,.30);
      font-size: 10px;
      line-height: 1;
      font-weight: 800;
    }
    .trBadge{
      position:absolute;left:8px;top:8px;
      padding:2px 6px;border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(0,0,0,.30);
      font-size: 10px;
      line-height: 1;
      font-weight: 900;
    }

    .imgFrame{
      width:100%;
      height: 220px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(0,0,0,.20);
      overflow:hidden;
      display:flex;
      align-items:center;
      justify-content:center;
      color: rgba(232,232,232,.7);
      font-size: 11px;
      text-align:center;
      padding: 10px;
      line-height: 1.35;
    }
    .imgFrame img{
      width:100%;
      height:100%;
      object-fit: cover;
      display:block;
    }

    @media (max-width: 1200px){
      :root{ --sideW: 320px; --imgW: 320px; }
    }
    @media (max-width: 1040px){
      .gameHeaderGrid{ grid-template-columns: 1fr; }
      .gridGame3{ grid-template-columns: 1fr; }
      .gameHeaderControls{ justify-content:flex-start; }
      .infoGrid2{ grid-template-columns: 1fr; }
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
      renderAll();
      return;
    }
    gameBuilt = true;

    vGame.innerHTML = "";
    const wrap = el("div", "gameWrap");

    const headerGrid = el("div", "gameHeaderGrid");

    // (1) title column
    const titleBox = el("div", "gameTitleBox");
    const title = el("h1");
    title.textContent = "Game";
    const sub = el("div", "hint");
    const sc: any = scenarios[scenarioIndex];
    sub.textContent = `Mode: ${mode ?? "—"} | Scenario: ${String(sc?.name ?? sc?.title ?? sc?.id ?? "")}`;
    titleBox.append(title, sub);

    // (2) middle column (INFO + MESSAGE)
    const mid = el("div", "gameHeaderMid");

    const infoGrid = el("div", "infoGrid2");
    const infoLeft = el("div", "softCard infoText");
    const infoRight = el("div", "softCard infoText");
    infoGrid.append(infoLeft, infoRight);

    const msgBar = el("div", "msgBar");
    mid.append(infoGrid, msgBar);

    // (3) controls column
    const controls = el("div", "gameHeaderControls");

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

    controls.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn, forceRevealBtn, exitBtn);

    headerGrid.append(titleBox, mid, controls);

    // MAIN GRID
    const grid = el("div", "gridGame3");

    const storyPanel = el("section", "panelGame");
    const boardPanel = el("section", "panelGame");
    const imagesPanel = el("section", "panelGame");

    // Story panel
    const storyHead = el("div", "panelHead");
    const storyLeftTag = el("div", "leftTag");
    storyLeftTag.append(el("div", "panelDot"), (() => {
      const t = el("div", "panelTitle");
      t.textContent = "Story Log";
      return t;
    })());
    const storyPill = el("div", "pill");
    storyPill.textContent = "Timeline";
    storyHead.append(storyLeftTag, storyPill);

    const storyBody = el("div", "panelBody");
    storyBody.append(
      (() => {
        const a = el("div", "softCard");
        a.innerHTML = `<b>Story log will live here later.</b>`;
        return a;
      })(),
      (() => {
        const b = el("div", "softCard");
        b.textContent = "Moves, discoveries, encounters, etc.";
        return b;
      })()
    );
    storyPanel.append(storyHead, storyBody);

    // Board panel (ONLY the hex grid)
    const boardHead = el("div", "panelHead");
    const boardLeftTag = el("div", "leftTag");
    boardLeftTag.append(el("div", "panelDot"), (() => {
      const t = el("div", "panelTitle");
      t.textContent = "Board";
      return t;
    })());
    const boardPill = el("div", "pill");
    boardPill.textContent = `Build: ${BUILD_TAG}`;
    boardHead.append(boardLeftTag, boardPill);

    const boardBody = el("div", "panelBody");
    const boardWrap = el("div", "boardWrap");
    boardBody.append(boardWrap);
    boardPanel.append(boardHead, boardBody);

    // Images panel
    const imgHead = el("div", "panelHead");
    const imgLeftTag = el("div", "leftTag");
    imgLeftTag.append(el("div", "panelDot"), (() => {
      const t = el("div", "panelTitle");
      t.textContent = "Images";
      return t;
    })());
    const imgPill = el("div", "pill");
    imgPill.textContent = "Now";
    imgHead.append(imgLeftTag, imgPill);

    const imgBody = el("div", "panelBody");

    const playerCard = el("div", "softCard");
    const playerRow = el("div");
    playerRow.style.display = "flex";
    playerRow.style.alignItems = "center";
    playerRow.style.justifyContent = "space-between";
    playerRow.style.gap = "10px";
    playerRow.innerHTML = `<b>Player</b>`;
    const playerNamePill = el("div", "pill");
    playerNamePill.textContent = chosenPlayer?.name ?? "—";
    playerRow.appendChild(playerNamePill);

    const playerFrame = el("div", "imgFrame");
    playerCard.append(playerRow, playerFrame);

    const hexCard = el("div", "softCard");
    const hexRow = el("div");
    hexRow.style.display = "flex";
    hexRow.style.alignItems = "center";
    hexRow.style.justifyContent = "space-between";
    hexRow.style.gap = "10px";
    hexRow.innerHTML = `<b>Current Hex</b>`;
    const hexIdPill = el("div", "pill");
    hexIdPill.textContent = state?.playerHexId ?? "—";
    hexRow.appendChild(hexIdPill);

    const hexFrame = el("div", "imgFrame");
    hexCard.append(hexRow, hexFrame);

    imgBody.append(playerCard, hexCard);
    imagesPanel.append(imgHead, imgBody);

    grid.append(storyPanel, boardPanel, imagesPanel);
    wrap.append(headerGrid, grid);
    vGame.appendChild(wrap);

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

    function renderImages() {
      const playerImgUrl = chosenPlayer?.kind === "custom" ? chosenPlayer.imageDataUrl : null;
      if (playerImgUrl) playerFrame.innerHTML = `<img src="${playerImgUrl}" alt="player">`;
      else playerFrame.textContent = "Preset player (no image yet).";

      hexIdPill.textContent = state?.playerHexId ?? "—";
      const h: any = state?.playerHexId ? getHex(state.playerHexId) : null;
      hexFrame.textContent = (h?.kind ? String(h.kind) : "—").toUpperCase();
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

          if (isPlayer) btn.appendChild(el("div", "dot player"));
          else if (isGoal) btn.appendChild(el("div", "dot goal"));

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
      renderInfoTop();
      renderMessage();
      renderBoard();
      renderImages();
    }

    exitBtn.addEventListener("click", () => {
      renderSetup();
      setScreen("setup");
    });

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
    renderAll();
  }

  // --------------------------
  // Start app
  // --------------------------
  applyModeTheme();
  renderStart();
  setScreen("start");
}
