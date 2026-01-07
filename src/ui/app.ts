import type { Scenario } from "../engine/types";

type Coord = { layer: number; row: number; col: number };

function coordEq(a: Coord, b: Coord) {
  return a.layer === b.layer && a.row === b.row && a.col === b.col;
}

function key(c: Coord) {
  return `L${c.layer}-R${c.row}-C${c.col}`;
}

function asCoord(x: any): Coord | null {
  if (!x) return null;
  const layer = Number(x.layer);
  const row = Number(x.row);
  const col = Number(x.col);
  if (!Number.isFinite(layer) || !Number.isFinite(row) || !Number.isFinite(col)) return null;
  return { layer, row, col };
}

function toSet(list: any[] | undefined): Set<string> {
  const s = new Set<string>();
  (list ?? []).forEach((c) => {
    const cc = asCoord(c);
    if (cc) s.add(key(cc));
  });
  return s;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

export function mountApp(root: HTMLElement | null, scenarios: Scenario[], initialPath: string) {
  if (!root) throw new Error('Missing element with id="app"');

  // Heuristic: match initialPath (like "scenarios/demo_v01.json") to scenario.id/name
  const initialBase = initialPath.split("/").pop()?.replace(".json", "") ?? "";
  const initialIndex = Math.max(
    0,
    scenarios.findIndex((s: any) => String((s as any).id ?? "") === initialBase || String((s as any).name ?? "") === initialBase)
  );

  let scenarioIndex = initialIndex;
  let selectedLayer = 1;
  let selectedCell: Coord | null = null;

  const style = document.createElement("style");
  style.textContent = `
    .wrap{max-width:1200px;margin:0 auto;padding:18px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#e8e8e8}
    .top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    h1{margin:0;font-size:44px;letter-spacing:.3px}
    .controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    select,button{padding:8px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.22);color:#e8e8e8}
    button{cursor:pointer}
    .grid{display:grid;grid-template-columns: 1.4fr .9fr; gap:14px; margin-top:14px}
    .card{border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.16); border-radius:18px; padding:14px}
    .meta{display:grid;gap:6px;margin-top:10px}
    .board{display:flex;flex-direction:column;gap:10px}
    .boardHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .hint{opacity:.85;font-size:13px}
    .cells{display:grid; gap:6px; user-select:none}
    .cell{height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;
          background:rgba(255,255,255,.04); cursor:pointer; font-size:12px; opacity:.95}
    .cell:hover{border-color: rgba(255,255,255,.3)}
    .cell.sel{outline:2px solid rgba(255,255,255,.55)}
    .cell.start{background:rgba(76,175,80,.18)}
    .cell.goal{background:rgba(255,193,7,.16)}
    .cell.blocked{background:rgba(244,67,54,.14); opacity:.7}
    .cell.missing{background:rgba(120,120,120,.10); opacity:.45}
    pre{margin:0;white-space:pre-wrap;word-break:break-word;line-height:1.3}
    .split{display:grid;gap:10px}
    .row{display:flex;gap:10px;flex-wrap:wrap}
    .tag{padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.18);font-size:12px;opacity:.9}
    @media (max-width: 980px){.grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  root.innerHTML = "";
  const wrap = el("div", "wrap");
  const top = el("div", "top");
  const title = el("h1");
  title.textContent = "Game";

  const controls = el("div", "controls");

  const scenarioSelect = el("select") as HTMLSelectElement;
  scenarios.forEach((s: any, i: number) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String((s as any).name ?? (s as any).title ?? (s as any).id ?? `Scenario ${i + 1}`);
    scenarioSelect.appendChild(opt);
  });
  scenarioSelect.value = String(scenarioIndex);

  const layerSelect = el("select") as HTMLSelectElement;

  const resetBtn = el("button") as HTMLButtonElement;
  resetBtn.textContent = "Reset selection";

  controls.append(scenarioSelect, layerSelect, resetBtn);
  top.append(title, controls);

  const layout = el("div", "grid");
  const left = el("div", "card board");
  const right = el("div", "card split");

  const meta = el("div", "meta");

  const boardHeader = el("div", "boardHeader");
  const boardTitle = el("div");
  boardTitle.innerHTML = `<b>Board</b> <span class="hint">(click a cell)</span>`;
  const boardHint = el("div", "hint");
  boardHint.textContent = "This is a simple grid renderer. Next step: hex board + fog + movement.";

  boardHeader.append(boardTitle, boardHint);

  const cells = el("div", "cells");

  // Right panel: selection + scenario details
  const selectionCard = el("div", "card");
  selectionCard.style.padding = "12px";
  const selectionTitle = el("div");
  selectionTitle.innerHTML = `<b>Selection</b>`;
  const selectionBody = el("div", "meta");

  const scenarioCard = el("div", "card");
  scenarioCard.style.padding = "12px";
  const scenarioTitle = el("div");
  scenarioTitle.innerHTML = `<b>Scenario</b>`;
  const scenarioBody = el("div", "meta");

  right.append(selectionCard, scenarioCard);
  selectionCard.append(selectionTitle, selectionBody);
  scenarioCard.append(scenarioTitle, scenarioBody);

  left.append(boardHeader, meta, cells);
  layout.append(left, right);
  wrap.append(top, layout);
  root.appendChild(wrap);

  function current(): any {
    return scenarios[scenarioIndex] as any;
  }

  function setLayerOptions() {
    const s = current();
    const layers = Number(s.layers ?? 1);
    layerSelect.innerHTML = "";
    for (let i = 1; i <= layers; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Layer ${i}`;
      layerSelect.appendChild(opt);
    }
    if (selectedLayer > layers) selectedLayer = 1;
    layerSelect.value = String(selectedLayer);
  }

  function inferRowsCols(s: any) {
    // If your schema doesn’t include rows/cols, we infer from start/goal/blocked/missing/transitions.
    const coords: Coord[] = [];
    const push = (c: any) => {
      const cc = asCoord(c);
      if (cc) coords.push(cc);
    };
    push(s.start); push(s.goal);
    (s.blocked ?? []).forEach(push);
    (s.missing ?? []).forEach(push);
    (s.transitions ?? []).forEach((t: any) => { push(t.from); push(t.to); });

    // default fallback
    let maxRow = 5, maxCol = 5;
    coords.filter(c => c.layer === selectedLayer).forEach(c => {
      if (c.row > maxRow) maxRow = c.row;
      if (c.col > maxCol) maxCol = c.col;
    });

    // guard
    maxRow = Math.min(Math.max(maxRow, 3), 12);
    maxCol = Math.min(Math.max(maxCol, 3), 12);
    return { rows: maxRow, cols: maxCol };
  }

  function renderMeta() {
    const s = current();
    meta.innerHTML = `
      <div><b>Loaded scenarios:</b> ${scenarios.length}</div>
      <div><b>Selected:</b> ${String(s.name ?? s.title ?? s.id ?? "")}</div>
      <div><b>Layers:</b> ${s.layers ?? "?"}</div>
      <div><b>Start:</b> ${s.start ? key(s.start) : "?"}</div>
      <div><b>Goal:</b> ${s.goal ? key(s.goal) : "?"}</div>
      <div><b>Objective:</b> ${s.objective ?? "(none)"}</div>
    `;
  }

  function renderScenarioDetails() {
    const s = current();
    const tags = el("div", "row");
    const mkTag = (t: string) => {
      const d = el("div", "tag");
      d.textContent = t;
      return d;
    };
    tags.append(
      mkTag(`Layer: ${selectedLayer}`),
      mkTag(`Blocked: ${(s.blocked?.length ?? 0)}`),
      mkTag(`Missing: ${(s.missing?.length ?? 0)}`),
      mkTag(`Transitions: ${(s.transitions?.length ?? 0)}`)
    );

    const movement = el("pre");
    movement.textContent = JSON.stringify(s.movement ?? {}, null, 2);

    const transitions = el("pre");
    transitions.textContent = JSON.stringify(s.transitions ?? [], null, 2);

    scenarioBody.innerHTML = "";
    scenarioBody.append(tags, el("div", "hint"));
    scenarioBody.append(el("div", "hint")).textContent = "Movement:";
    scenarioBody.append(movement);
    scenarioBody.append(el("div", "hint")).textContent = "Transitions:";
    scenarioBody.append(transitions);
  }

  function renderSelection() {
    const s = current();
    selectionBody.innerHTML = "";
    if (!selectedCell) {
      selectionBody.innerHTML = `<div class="hint">No cell selected. Click a cell on the board.</div>`;
      return;
    }
    const k = key(selectedCell);
    const blocked = toSet(s.blocked).has(k);
    const missing = toSet(s.missing).has(k);

    const lines = [
      `<div><b>Cell:</b> ${k}</div>`,
      `<div><b>Status:</b> ${missing ? "missing" : blocked ? "blocked" : "usable"}</div>`
    ];

    // show outgoing transitions from this cell
    const outs = (s.transitions ?? []).filter((t: any) => {
      const from = asCoord(t.from);
      return from && coordEq(from, selectedCell);
    });

    selectionBody.innerHTML = lines.join("");
    if (outs.length) {
      const pre = el("pre");
      pre.textContent = JSON.stringify(outs, null, 2);
      selectionBody.append(el("div", "hint")).textContent = "Outgoing transitions:";
      selectionBody.append(pre);
    } else {
      selectionBody.append(el("div", "hint")).textContent = "No outgoing transitions from this cell.";
    }
  }

  function renderBoard() {
    const s = current();
    const { rows, cols } = inferRowsCols(s);

    cells.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    cells.innerHTML = "";

    const blocked = toSet(s.blocked);
    const missing = toSet(s.missing);
    const start = asCoord(s.start);
    const goal = asCoord(s.goal);

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const cell: Coord = { layer: selectedLayer, row: r, col: c };
        const k = key(cell);

        const d = el("div", "cell");
        d.textContent = `R${r} C${c}`;

        if (missing.has(k)) d.classList.add("missing");
        if (blocked.has(k)) d.classList.add("blocked");
        if (start && coordEq(start, cell)) d.classList.add("start");
        if (goal && coordEq(goal, cell)) d.classList.add("goal");
        if (selectedCell && coordEq(selectedCell, cell)) d.classList.add("sel");

        d.addEventListener("click", () => {
          selectedCell = cell;
          renderAll();
        });

        cells.appendChild(d);
      }
    }
  }

  function renderAll() {
    renderMeta();
    renderBoard();
    renderSelection();
    renderScenarioDetails();
  }

  scenarioSelect.addEventListener("change", () => {
    scenarioIndex = Number(scenarioSelect.value);
    selectedLayer = 1;
    selectedCell = null;
    setLayerOptions();
    renderAll();
  });

  layerSelect.addEventListener("change", () => {
    selectedLayer = Number(layerSelect.value);
    selectedCell = null;
    renderAll();
  });

  resetBtn.addEventListener("click", () => {
    selectedCell = null;
    renderAll();
  });

  // init
  setLayerOptions();
  renderAll();
}
