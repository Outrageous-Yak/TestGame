// apps.ts
import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, endTurn, type ReachMap } from "../engine/api";
import { ROW_LENS, posId, enterLayer, revealHex } from "../engine/board";

/* ============================
   Types & helpers (UNCHANGED)
============================ */
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
  t: string;
};

const BUILD_TAG = "BUILD_TAG_TILES_DEMO_V1";
const START_BG_URL = "images/ui/start-screen.jpg";
const BOARD_BG_URL = "images/ui/board-bg.png";

function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: +m[1], row: +m[2], col: +m[3] };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" } as any)[m]
  );
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

function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  return base + p.replace(/^\/+/, "");
}

/* ============================
   App mount
============================ */
export function mountApp(root: HTMLElement | null) {
  if (!root) throw new Error("Missing #app");

  /* ---------- STATE ---------- */
  let screen: Screen = "start";
  let mode: Mode | null = null;

  let scenarios: Scenario[] = [];
  let scenarioIndex = 0;
  let initialPath = "";

  let chosenPlayer: PlayerChoice | null = null;
  let chosenMonsters: MonsterChoice[] = [];

  let state: GameState | null = null;
  let currentLayer = 1;
  let selectedId: string | null = null;

  let reachMap: ReachMap = {};
  let reachable = new Set<string>();

  let miniShiftLeft: Record<number, Record<number, number>> = {};

  /* ---------- STYLE ---------- */
  const style = document.createElement("style");
  style.textContent = `
  body{
    margin:0;
    background: linear-gradient(180deg,#05070d,#070a14);
    color:#eaf2ff;
    font-family: system-ui, sans-serif;
  }
  .shell{
    width:min(1200px,100vw);
    margin:0 auto;
    padding:16px;
  }
  .view{display:none}
  .view.active{display:block}

  /* ===== GAME SCREEN NEW LAYOUT ===== */
  .gameStage{
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:18px;
  }

  .layerTitle{
    font-size:22px;
    font-weight:900;
    padding:8px 16px;
    border-radius:999px;
    background:rgba(255,255,255,.08);
  }

  .boardSquare{
    width:min(80vmin,600px);
    aspect-ratio:1/1;
    position:relative;
    border-radius:18px;
    overflow:hidden;
    background:#000;
  }
  .boardBg{
    position:absolute;
    inset:0;
    background:url("${toPublicUrl(BOARD_BG_URL)}") center/cover no-repeat;
  }
  .boardCenter{
    position:relative;
    z-index:1;
    display:flex;
    justify-content:center;
    align-items:center;
    width:100%;
    height:100%;
  }
  .boardWrap{
    display:grid;
    gap:6px;
  }

  .tileRow{display:flex;gap:6px}
  .tileRow.offset{padding-left:36px}

  .cloud{
    width:64px;
    height:64px;
    border-radius:999px;
    border:2px solid rgba(255,255,255,.8);
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
  }

  .miniRowWrap{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:16px;
    width:100%;
  }
  .miniPanel{
    padding:12px;
    border-radius:16px;
    background:rgba(255,255,255,.12);
  }
  .miniTitle{
    font-weight:900;
    text-align:center;
    margin-bottom:8px;
  }
  `;
  document.head.appendChild(style);

  /* ---------- ROOT ---------- */
  root.innerHTML = "";
  const shell = el("div", "shell");
  const vStart = el("section", "view active");
  const vGame = el("section", "view");
  shell.append(vStart, vGame);
  root.appendChild(shell);

  /* ---------- START ---------- */
  function renderStart() {
    vStart.innerHTML = `
      <h1>Hex Layers Puzzle</h1>
      <button id="startBtn">Start</button>
    `;
    vStart.querySelector("#startBtn")!.addEventListener("click", async () => {
      const manifest = await fetchJson<Manifest>("scenarios/manifest.json");
      scenarios = await Promise.all(manifest.files.map(loadScenario));
      scenarioIndex = 0;
      startScenario(0);
      renderGame();
      setScreen("game");
    });
  }

  function setScreen(s: Screen) {
    screen = s;
    [vStart, vGame].forEach(v => v.classList.remove("active"));
    if (s === "start") vStart.classList.add("active");
    if (s === "game") vGame.classList.add("active");
  }

  /* ---------- GAME ---------- */
  function startScenario(idx: number) {
    scenarioIndex = idx;
    state = newGame(scenarios[idx]);
    selectedId = state.playerHexId;
    currentLayer = idToCoord(selectedId!)?.layer ?? 1;
    enterLayer(state, currentLayer);
    recomputeReach();
  }

  function recomputeReach() {
    if (!state) return;
    reachMap = getReachability(state);
    reachable = new Set(Object.keys(reachMap).filter(k => reachMap[k].reachable));
  }

  function renderGame() {
    vGame.innerHTML = "";
    const stage = el("div", "gameStage");

    const title = el("div", "layerTitle");
    title.textContent = `Layer ${currentLayer}`;

    const square = el("div", "boardSquare");
    const bg = el("div", "boardBg");
    const center = el("div", "boardCenter");
    const wrap = el("div", "boardWrap");

    for (let r = 1; r <= ROW_LENS.length; r++) {
      const row = el("div", "tileRow");
      if (r % 2 === 0) row.classList.add("offset");
      for (let c = 1; c <= ROW_LENS[r - 1]; c++) {
        const id = `L${currentLayer}-R${r}-C${c}`;
        const cell = el("div", "cloud");
        cell.textContent = `r${r}c${c}`;
        cell.onclick = () => {
          if (!state) return;
          const res = tryMove(state, id);
          if (res.ok) {
            selectedId = state.playerHexId;
            currentLayer = idToCoord(selectedId!)!.layer;
            endTurn(state);
            enterLayer(state, currentLayer);
            recomputeReach();
            renderGame();
          }
        };
        row.appendChild(cell);
      }
      wrap.appendChild(row);
    }

    center.appendChild(wrap);
    square.append(bg, center);

    const minis = el("div", "miniRowWrap");
    ["Below", "Current", "Above"].forEach(t => {
      const p = el("div", "miniPanel");
      p.innerHTML = `<div class="miniTitle">${t}</div>`;
      minis.appendChild(p);
    });

    stage.append(title, square, minis);
    vGame.appendChild(stage);
  }

  /* ---------- BOOT ---------- */
  renderStart();
}
