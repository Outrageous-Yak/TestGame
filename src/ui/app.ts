import type { GameState, Scenario, Hex } from "../engine/types";
import { newGame, getReachable, tryMove, endTurn } from "../engine/api";
import { ROW_LENS, posId, enterLayer } from "../engine/board";

type Coord = { layer: number; row: number; col: number };

function idToCoord(id: string): Coord | null {
  // expected format: L{layer}-R{row}-C{col}
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function text(n: HTMLElement, t: string) {
  n.textContent = t;
  return n;
}

export function mountApp(root: HTMLElement | null, scenarios: Scenario[], initialPath: string) {
  if (!root) throw new Error('Missing element with id="app"');

  // Pick an initial scenario index (best-effort)
  const initialBase = initialPath.split("/").pop()?.replace(".json", "") ?? "";
  const initialIndex = Math.max(
    0,
    scenarios.findIndex((s: any) => String((s as any).id ?? "") === initialBase || String((s as any).name ?? "") === initialBase)
  );

  // --------------------------
  // UI State
  // --------------------------
  let scenarioIndex = initialIndex;
  let state: GameState = newGame(scenarios[scenarioIndex]);
  let reachable: Set<string> = getReachable(state);
  let selectedId: string | null = state.playerHexId ?? null;
  let currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;
  let message = "";

  // --------------------------
  // Styles
  // --------------------------
  const style = document.createElement("style");
  style.textContent = `
    .wrap{max-width:1250px;margin:0 auto;padding:18px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#e8e8e8}
    .top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    h1{margin:0;font-size:46px;letter-spacing:.3px}
    .controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    select,button{padding:8px 10px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.22);color:#e8e8e8}
    button{cursor:pointer}
    button:disabled{opacity:.5;cursor:not-allowed}
    .grid{display:grid;grid-template-columns: 1.55fr .85fr; gap:14px; margin-top:14px}
    .card{border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.16); border-radius:18px; padding:14px}
    .meta{display:grid;gap:6px;margin-top:10px}
    .hint{opacity:.85;font-size:13px}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .tag{padding:4px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.18);font-size:12px;opacity:.9}
    pre{margin:0;white-space:pre-wrap;word-break:break-word;line-height:1.3}

    /* Board */
    .boardHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .boardWrap{display:grid;gap:10px;margin-top:10px}
    .hexRow{display:flex;gap:8px;align-items:center}
    .hexRow.offset{padding-left:28px}
    .hex{
      width:64px;height:56px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.04);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;
      position:relative;
      user-select:none;
      font-size:12px;
      opacity:.95;
    }
    .hex:hover{border-color:rgba(255,255,255,.32)}
    .hex.sel{outline:2px solid rgba(255,255,255,.55)}
    .hex.reach{outline:2px solid rgba(76,175,80,.65)}
    .hex.player{background:rgba(76,175,80,.18)}
    .hex.goal{background:rgba(255,193,7,.16)}
    .hex.blocked{background:rgba(244,67,54,.14);opacity:.7}
    .hex.missing{background:rgba(120,120,120,.10);opacity:.4}
    .hex.fog{background:rgba(0,0,0,.35);opacity:.55}
    .dot{
      position:absolute;right:8px;top:8px;
      width:10px;height:10px;border-radius:999px;
      border:1px solid rgba(255,255,255,.35);
      background:rgba(255,255,255,.12);
    }
    .dot.player{background:rgba(76,175,80,.9);border-color:rgba(76,175,80,.9)}
    .dot.goal{background:rgba(255,193,7,.9);border-color:rgba(255,193,7,.9)}
    .msg{margin-top:10px;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18)}
    @media (max-width: 980px){.grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  // --------------------------
  // DOM Structure
  // --------------------------
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

  const endTurnBtn = el("button") as HTMLButtonElement;
  endTurnBtn.textContent = "End turn";

  const resetBtn = el("button") as HTMLButtonElement;
  resetBtn.textContent = "Reset run";

  controls.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn);
  top.append(title, controls);

  const layout = el("div", "grid");

  const left = el("div", "card");
  const right = el("div", "card");

  // Left content
  const boardHeader = el("div", "boardHeader");
  const boardTitle = el("div");
  boardTitle.innerHTML = `<b>Board</b> <span class="hint">(click a reachable hex to move)</span>`;
  const boardHint = el("div", "hint");
  boardHint.textContent = "Green outline = reachable. Green dot = player. Yellow dot = goal.";
  boardHeader.append(boardTitle, boardHint);

  const meta = el("div", "meta");
  const msg = el("div", "msg");
  const boardWrap = el("div", "boardWrap");

  left.append(boardHeader, meta, msg, boardWrap);

  // Right content
  const selectionTitle = el("div");
  selectionTitle.innerHTML = `<b>Selection</b>`;
  const selectionBody = el("div", "meta");

  const scenarioTitle = el("div");
  scenarioTitle.style.marginTop = "14px";
  scenarioTitle.innerHTML = `<b>Scenario</b>`;
  const scenarioBody = el("div", "meta");

  right.append(selectionTitle, selectionBody, scenarioTitle, scenarioBody);

  layout.append(left, right);
  wrap.append(top, layout);
  root.appendChild(wrap);

  // --------------------------
  // Helpers
  // --------------------------
  function scenario(): Scenario {
    return scenarios[scenarioIndex];
  }

  function setLayerOptions() {
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

  function getHex(id: string): Hex | undefined {
    // GameState.hexesById is a Map<string, Hex>
    return (state.hexesById as any).get(id);
  }

  function isBlockedOrMissing(hex: any): { blocked: boolean; missing: boolean } {
    if (!hex) return { blocked: true, missing: true };
    // based on your engine usage:
    // - hex.missing (boolean)
    // - hex.blocked (boolean)
    const missing = !!hex.missing;
    const blocked = !!hex.blocked;
    return { missing, blocked };
  }

  function isRevealed(hex: any): boolean {
    // board.ts has revealHex(state, id)
    // typical: hex.revealed = true/false
    if (!hex) return false;
    return !!hex.revealed;
  }

  function renderMeta() {
    const s: any = scenario();
    meta.innerHTML = `
      <div><b>Loaded scenarios:</b> ${scenarios.length}</div>
      <div><b>Selected:</b> ${String(s.name ?? s.title ?? s.id ?? "")}</div>
      <div><b>Layers:</b> ${s.layers ?? "?"}</div>
      <div><b>Player:</b> ${state.playerHexId ?? "?"}</div>
      <div><b>Goal:</b> ${posId(s.goal)}</div>
      <div><b>Objective:</b> ${s.objective ?? "(none)"}</div>
    `;
    msg.textContent = message || "Ready.";
  }

  function renderSelection() {
    selectionBody.innerHTML = "";
    if (!selectedId) {
      selectionBody.innerHTML = `<div class="hint">No hex selected.</div>`;
      return;
    }
    const h: any = getHex(selectedId);
    const { blocked, missing } = isBlockedOrMissing(h);

    const lines: string[] = [];
    lines.push(`<div><b>Hex:</b> ${selectedId}</div>`);
    lines.push(`<div><b>Status:</b> ${missing ? "missing" : blocked ? "blocked" : "usable"}</div>`);
    lines.push(`<div><b>Revealed:</b> ${isRevealed(h) ? "yes" : "no"}</div>`);
    lines.push(`<div><b>Kind:</b> ${h?.kind ?? "?"}</div>`);
    selectionBody.innerHTML = lines.join("");

    const out = (scenario() as any).transitions?.filter((t: any) => posId(t.from) === selectedId) ?? [];
    if (out.length) {
      const pre = el("pre");
      pre.textContent = JSON.stringify(out, null, 2);
      selectionBody.append(el("div", "hint")).textContent = "Outgoing transitions:";
      selectionBody.append(pre);
    }
  }

  function renderScenarioDetails() {
    const s: any = scenario();
    scenarioBody.innerHTML = "";

    const tags = el("div", "row");
    const mkTag = (t: string) => {
      const d = el("div", "tag");
      d.textContent = t;
      return d;
    };

    tags.append(
      mkTag(`Layer: ${currentLayer}`),
      mkTag(`Reachable: ${reachable.size}`),
      mkTag(`Transitions: ${(s.transitions?.length ?? 0)}`)
    );

    scenarioBody.append(tags);

    scenarioBody.append(el("div", "hint")).textContent = "Movement:";
    const movement = el("pre");
    movement.textContent = JSON.stringify(s.movement ?? {}, null, 2);
    scenarioBody.append(movement);

    scenarioBody.append(el("div", "hint")).textContent = "Transitions:";
    const transitions = el("pre");
    transitions.textContent = JSON.stringify(s.transitions ?? [], null, 2);
    scenarioBody.append(transitions);
  }

  function renderBoard() {
    boardWrap.innerHTML = "";

    // draw 7 rows with varying lengths (ROW_LENS) - matches engine validation
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const len = ROW_LENS[r - 1] ?? 7;

      const row = el("div", "hexRow");
      // offset every other row to simulate hex stagger
      if (r % 2 === 0) row.classList.add("offset");

      for (let c = 1; c <= len; c++) {
        const id = `L${currentLayer}-R${r}-C${c}`;
        const h: any = getHex(id);

        const btn = el("div", "hex");
        text(btn, `R${r} C${c}`);

        const { blocked, missing } = isBlockedOrMissing(h);
        const revealed = isRevealed(h);
        const isGoal = h?.kind === "GOAL";
        const isPlayer = state.playerHexId === id;

        if (missing) btn.classList.add("missing");
        if (blocked) btn.classList.add("blocked");
        if (!revealed) btn.classList.add("fog");
        if (isGoal) btn.classList.add("goal");
        if (isPlayer) btn.classList.add("player");
        if (reachable.has(id)) btn.classList.add("reach");
        if (selectedId === id) btn.classList.add("sel");

        // dots
        if (isPlayer) {
          const d = el("div", "dot player");
          btn.appendChild(d);
        } else if (isGoal) {
          const d = el("div", "dot goal");
          btn.appendChild(d);
        }

        btn.addEventListener("click", () => {
          selectedId = id;

          // If reachable, try moving.
          if (reachable.has(id) && id !== state.playerHexId) {
            const res = tryMove(state, id);

            if (res.ok) {
              message = res.won
                ? "🎉 You reached the goal!"
                : res.triggeredTransition
                ? "Moved (transition triggered)."
                : "Moved.";

              // Update layer view to follow player
              const playerCoord = idToCoord(state.playerHexId);
              if (playerCoord) currentLayer = playerCoord.layer;

              setLayerOptions();
              reachable = getReachable(state);
              renderAll();
              return;
            } else {
              message = res.reason === "BLOCKED" ? "Blocked." : "Invalid move.";
            }
          } else {
            message = "";
          }

          renderAll();
        });

        row.appendChild(btn);
      }

      boardWrap.appendChild(row);
    }
  }

  function renderAll() {
    renderMeta();
    renderBoard();
    renderSelection();
    renderScenarioDetails();
    // buttons: end turn always enabled (engine handles shifts etc.)
    endTurnBtn.disabled = false;
  }

  function startScenario(idx: number) {
    scenarioIndex = idx;
    scenarioSelect.value = String(scenarioIndex);

    // validate scenario (your main.ts likely already calls assertScenario on load)
    state = newGame(scenario());
    reachable = getReachable(state);

    selectedId = state.playerHexId ?? null;
    currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;
    message = "";

    setLayerOptions();
    renderAll();
  }

  // --------------------------
  // Events
  // --------------------------
  scenarioSelect.addEventListener("change", () => {
    startScenario(Number(scenarioSelect.value));
  });

  layerSelect.addEventListener("change", () => {
    currentLayer = Number(layerSelect.value);
    // This reveals the layer / applies "enter layer" logic in your engine
    const err = enterLayer(state, currentLayer);
    message = err ? `Enter layer error: ${err}` : "";
    reachable = getReachable(state);
    renderAll();
  });

  endTurnBtn.addEventListener("click", () => {
    endTurn(state);
    reachable = getReachable(state);
    message = "Turn ended.";
    renderAll();
  });

  resetBtn.addEventListener("click", () => {
    startScenario(scenarioIndex);
  });

  // --------------------------
  // Init
  // --------------------------
  setLayerOptions();
  renderAll();
}
