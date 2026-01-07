import type { GameState, Scenario, Hex } from "../engine/types";
import { newGame, getReachability, tryMove, endTurn, type ReachMap } from "../engine/api";
import { ROW_LENS, posId, enterLayer, revealHex } from "../engine/board";

type Coord = { layer: number; row: number; col: number };

const BUILD_TAG = "TRANSITION_GLOW_V3";

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

export function mountApp(root: HTMLElement | null, scenarios: Scenario[], initialPath: string) {
  if (!root) throw new Error('Missing element with id="app"');

  // --------------------------
  // State
  // --------------------------
  let scenarioIndex = 0;
  let state: GameState = newGame(scenarios[scenarioIndex]);
  let selectedId: string | null = state.playerHexId ?? null;
  let currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;
  let message = "";

  let reachMap: ReachMap = getReachability(state);
  let reachable = new Set<string>();

  let transitions: any[] = [];
  let sourcesOnLayer = new Set<string>();
  let targetsSameLayer = new Map<string, string>();

  // --------------------------
  // Styles
  // --------------------------
  const style = document.createElement("style");
  style.textContent = `
    body{margin:0;background:#0e0f13}
    .wrap{max-width:1250px;margin:0 auto;padding:18px;font-family:system-ui;color:#e8e8e8}
    .top{display:flex;justify-content:space-between;align-items:center}
    .controls{display:flex;gap:10px}
    select,button{padding:8px 12px;border-radius:12px;background:#151821;color:#fff;border:1px solid #2a2f3d}
    .grid{display:grid;grid-template-columns:1.6fr .9fr;gap:14px;margin-top:14px}
    .card{background:#151821;border-radius:18px;padding:14px;border:1px solid #2a2f3d}
    .boardWrap{margin-top:12px;display:grid;gap:10px}

    .hexRow{display:flex;gap:10px}
    .hexRow.offset{padding-left:34px}

    .hex{
      width:70px;height:62px;
      clip-path: polygon(25% 6%,75% 6%,100% 50%,75% 94%,25% 94%,0% 50%);
      background:#1c2130;
      border:2px solid #2b3144;
      display:flex;align-items:center;justify-content:center;
      position:relative;
      cursor:pointer;
      transition:transform .12s ease, box-shadow .12s ease;
    }

    .hex:hover{transform:scale(1.04)}

    .hex.player{background:#203828}
    .hex.goal{background:#3b3216}
    .hex.blocked{background:#402020}
    .hex.fog{opacity:.45}

    /* ===== TRANSITION GLOWS ===== */
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
      position:absolute;top:6px;right:6px;
      width:10px;height:10px;border-radius:50%;
      background:#fff
    }
    .dot.player{background:#4caf50}
    .dot.goal{background:#ffc107}

    .trBadge{
      position:absolute;top:6px;left:6px;
      font-size:11px;
      background:#0009;
      padding:2px 6px;
      border-radius:999px;
      border:1px solid #fff3;
    }

    .msg{margin-top:10px;padding:10px;border-radius:12px;background:#11151f}
  `;
  document.head.appendChild(style);

  // --------------------------
  // Layout
  // --------------------------
  root.innerHTML = "";
  const wrap = el("div", "wrap");
  const top = el("div", "top");

  const title = document.createElement("h1");
  title.textContent = "Game";

  const controls = el("div", "controls");
  const layerSelect = document.createElement("select");
  const endTurnBtn = document.createElement("button");
  endTurnBtn.textContent = "End Turn";

  controls.append(layerSelect, endTurnBtn);
  top.append(title, controls);

  const grid = el("div", "grid");
  const left = el("div", "card");
  const right = el("div", "card");

  const boardWrap = el("div", "boardWrap");
  const msg = el("div", "msg");

  left.append(boardWrap, msg);
  right.innerHTML = `<b>Debug</b><div id="dbg"></div>`;

  grid.append(left, right);
  wrap.append(top, grid);
  root.appendChild(wrap);

  // --------------------------
  // Helpers
  // --------------------------
  function recompute() {
    reachMap = getReachability(state);
    reachable = new Set(Object.entries(reachMap).filter(([,v]) => v.reachable).map(([k]) => k));

    transitions = scenarios[scenarioIndex].transitions ?? [];
    sourcesOnLayer.clear();
    targetsSameLayer.clear();

    for (const t of transitions) {
      const fromId = posId(t.from);
      const toId = posId(t.to);
      const fromC = idToCoord(fromId);
      const toC = idToCoord(toId);

      if (fromC?.layer === currentLayer) sourcesOnLayer.add(fromId);
      if (selectedId === fromId && toC?.layer === currentLayer) {
        targetsSameLayer.set(toId, t.type === "DOWN" ? "▼" : "▲");
      }
    }
  }

  function revealLayer() {
    enterLayer(state, currentLayer);
    for (let r = 1; r <= ROW_LENS.length; r++) {
      for (let c = 1; c <= (ROW_LENS[r-1] ?? 7); c++) {
        revealHex(state, `L${currentLayer}-R${r}-C${c}`);
      }
    }
  }

  function render() {
    boardWrap.innerHTML = "";
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const row = el("div", "hexRow");
      if (r % 2 === 0) row.classList.add("offset");

      for (let c = 1; c <= (ROW_LENS[r-1] ?? 7); c++) {
        const id = `L${currentLayer}-R${r}-C${c}`;
        const hex = (state.hexesById as any).get(id) as Hex | undefined;
        const btn = el("div", "hex");

        if (hex?.blocked) btn.classList.add("blocked");
        if (!hex?.revealed) btn.classList.add("fog");
        if (state.playerHexId === id) btn.classList.add("player");
        if (hex?.kind === "GOAL") btn.classList.add("goal");

        if (sourcesOnLayer.has(id)) btn.classList.add("trSrc");
        if (targetsSameLayer.has(id)) {
          btn.classList.add("trTgt");
          const b = el("div", "trBadge");
          b.textContent = targetsSameLayer.get(id)!;
          btn.appendChild(b);
        }

        if (state.playerHexId === id) btn.appendChild(el("div", "dot player"));
        if (hex?.kind === "GOAL") btn.appendChild(el("div", "dot goal"));

        btn.onclick = () => {
          selectedId = id;
          const res = tryMove(state, id);
          message = res.ok ? "Moved" : `Rejected: ${res.reason}`;
          recompute();
          render();
        };

        row.appendChild(btn);
      }
      boardWrap.appendChild(row);
    }

    msg.textContent = `${message} | Build: ${BUILD_TAG}`;
    (document.getElementById("dbg") as HTMLElement).innerText =
      `Sources: ${sourcesOnLayer.size} | Targets: ${targetsSameLayer.size}`;
  }

  // --------------------------
  // Init
  // --------------------------
  for (let i = 1; i <= (scenarios[scenarioIndex].layers ?? 1); i++) {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = `Layer ${i}`;
    layerSelect.appendChild(o);
  }

  layerSelect.onchange = () => {
    currentLayer = Number(layerSelect.value);
    revealLayer();
    recompute();
    render();
  };

  endTurnBtn.onclick = () => {
    endTurn(state);
    recompute();
    render();
  };

  revealLayer();
  recompute();
  render();
}
