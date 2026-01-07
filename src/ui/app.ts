import type { GameState, Scenario, Hex } from "../engine/types";
import { newGame, getReachability, tryMove, endTurn, type ReachMap } from "../engine/api";
import { ROW_LENS, posId, enterLayer, revealHex } from "../engine/board";

type Coord = { layer: number; row: number; col: number };

const BUILD_TAG = "BUILD_TAG_TRANSITIONS_V1";

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

export function mountApp(root: HTMLElement | null, scenarios: Scenario[], initialPath: string) {
  if (!root) throw new Error('Missing element with id="app"');

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

  let selectedId: string | null = state.playerHexId ?? null;
  let currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;
  let message = "";

  let reachMap: ReachMap = getReachability(state);
  let reachable: Set<string> = new Set(Object.entries(reachMap).filter(([, v]) => v.reachable).map(([k]) => k));

  // Transition highlight state (computed from selectedId)
  let transitionSources = new Set<string>();          // ids that have outgoing transitions
  let transitionTargetsSameLayer = new Map<string, string>(); // id -> badge text (▲/▼), only for current layer
  let outgoingFromSelected: any[] = [];               // transitions from selected hex

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

    .boardHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .boardWrap{display:grid;gap:10px;margin-top:10px}

    .banner{
      margin-top:10px;
      padding:10px 12px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(0,0,0,.18);
      display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap;
    }
    .banner b{font-weight:700}

    /* Hex rows */
    .hexRow{display:flex;gap:10px;align-items:center}
    .hexRow.offset{padding-left:34px}

    /* Real-ish hex */
    .hex{
      width:68px;
      height:60px;
      clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%);
      border:1px solid rgba(255,255,255,.18);
      background:rgba(255,255,255,.05);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer; position:relative;
      user-select:none; font-size:12px;
      opacity:.95;
    }
    .hex:hover{border-color:rgba(255,255,255,.35)}
    .hex.sel{outline:2px solid rgba(255,255,255,.6)}
    .hex.reach{outline:2px solid rgba(76,175,80,.75)}
    .hex.player{background:rgba(76,175,80,.18)}
    .hex.goal{background:rgba(255,193,7,.16)}
    .hex.blocked{background:rgba(244,67,54,.14);opacity:.75}
    .hex.missing{background:rgba(120,120,120,.10);opacity:.45}
    .hex.fog{background:rgba(0,0,0,.38);opacity:.6}

    /* NEW: transition visual cues */
    .hex.trSrc{outline:2px solid rgba(255,152,0,.85)}           /* orange */
    .hex.trTgt{outline:2px solid rgba(3,169,244,.85)}           /* cyan */
    .hex.trTgt{animation: pulse 1.4s ease-in-out infinite;}
    @keyframes pulse {
      0%   { filter: brightness(1); }
      50%  { filter: brightness(1.18); }
      100% { filter: brightness(1); }
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
      padding:2px 6px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(0,0,0,.30);
      font-size:11px; line-height:1;
      opacity:.95;
    }

    /* NEW: transition badge */
    .trBadge{
      position:absolute;left:8px;top:8px;
      padding:2px 6px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(0,0,0,.30);
      font-size:11px; line-height:1;
      opacity:.95;
    }

    .msg{margin-top:10px;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18)}
    .linkBtn{padding:6px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.18);color:#e8e8e8;cursor:pointer;font-size:12px}
    .linkBtn:hover{border-color:rgba(255,255,255,.32)}
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

  const forceRevealBtn = el("button") as HTMLButtonElement;
  forceRevealBtn.textContent = "Force reveal layer";

  controls.append(scenarioSelect, layerSelect, endTurnBtn, resetBtn, forceRevealBtn);
  top.append(title, controls);

  const layout = el("div", "grid");

  const left = el("div", "card");
  const right = el("div", "card");

  const boardHeader = el("div", "boardHeader");
  const boardTitle = el("div");
  boardTitle.innerHTML = `<b>Board</b> <span class="hint">(select a hex to see its transitions)</span>`;
  const boardHint = el("div", "hint");
  boardHint.textContent = `Orange = transition source. Cyan = transition target. Build: ${BUILD_TAG}`;
  boardHeader.append(boardTitle, boardHint);

  const meta = el("div", "meta");
  const banner = el("div", "banner");
  const msg = el("div", "msg");
  const boardWrap = el("div", "boardWrap");

  left.append(boardHeader, meta, banner, msg, boardWrap);

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

  function recomputeReachability() {
    reachMap = getReachability(state);
    reachable = new Set(Object.entries(reachMap).filter(([, v]) => v.reachable).map(([k]) => k));
  }

  function revealWholeLayer(layer: number) {
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const len = ROW_LENS[r - 1] ?? 7;
      for (let c = 1; c <= len; c++) {
        revealHex(state, `L${layer}-R${r}-C${c}`);
      }
    }
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

  function computeTransitionHighlights() {
    const s: any = scenario();
    const transitions: any[] = s.transitions ?? [];

    // All sources with outgoing transitions (for orange “source” highlight if you want later)
    transitionSources = new Set<string>();
    for (const t of transitions) {
      const fromId = posId(t.from);
      transitionSources.add(fromId);
    }

    outgoingFromSelected = [];
    transitionTargetsSameLayer = new Map<string, string>();

    if (!selectedId) return;

    outgoingFromSelected = transitions.filter((t) => posId(t.from) === selectedId);
    for (const t of outgoingFromSelected) {
      const toId = posId(t.to);
      const toC = idToCoord(toId);
      if (!toC) continue;

      // Only highlight targets on the currently viewed layer
      if (toC.layer === currentLayer) {
        const badge = t.type === "DOWN" ? "▼" : "▲"; // default UP
        transitionTargetsSameLayer.set(toId, badge);
      }
    }
  }

  function renderMeta() {
    const s: any = scenario();
    meta.innerHTML = `
      <div><b>Selected:</b> ${String(s.name ?? s.title ?? s.id ?? "")}</div>
      <div><b>Player:</b> ${state.playerHexId ?? "?"}</div>
      <div><b>Goal:</b> ${posId(s.goal)}</div>
    `;
    msg.textContent = message || "Ready.";
  }

  function renderBanner() {
    const layerReachable = Array.from(reachable).filter((id) => idToCoord(id)?.layer === currentLayer).length;
    const trCount = outgoingFromSelected.length;
    banner.innerHTML = `
      <div><b>Reachable total:</b> ${reachable.size} | <b>This layer:</b> ${layerReachable} | <b>Transitions from selection:</b> ${trCount}</div>
      <div class="hint">Click a hex to see its transitions. Cyan shows targets on this layer.</div>
    `;
  }

  function renderSelection() {
    selectionBody.innerHTML = "";
    if (!selectedId) {
      appendHint(selectionBody, "No hex selected.");
      return;
    }

    const h: any = getHex(selectedId);
    const { blocked, missing } = isBlockedOrMissing(h);
    const info = reachMap[selectedId];
    const s: any = scenario();

    selectionBody.innerHTML = `
      <div><b>Hex:</b> ${selectedId}</div>
      <div><b>Status:</b> ${missing ? "missing" : blocked ? "blocked" : "usable"}</div>
      <div><b>Revealed:</b> ${isRevealed(h) ? "yes" : "no"}</div>
      <div><b>Kind:</b> ${h?.kind ?? "?"}</div>
      <div><b>Reachable:</b> ${info?.reachable ? "yes" : "no"}</div>
      <div><b>Distance:</b> ${info?.distance ?? "—"}</div>
      <div><b>Explored:</b> ${info?.explored ?? "—"}</div>
    `;

    const transitions: any[] = s.transitions ?? [];
    const out = transitions.filter((t) => posId(t.from) === selectedId);

    if (out.length) {
      appendHint(selectionBody, "Outgoing transitions (click to jump):");

      for (const t of out) {
        const toId = posId(t.to);
        const toC = idToCoord(toId);
        const btn = el("button", "linkBtn");
        btn.textContent = `${t.type ?? "UP"} → ${toId}${toC && toC.layer !== currentLayer ? " (other layer)" : ""}`;

        btn.addEventListener("click", () => {
          selectedId = toId;
          if (toC) {
            currentLayer = toC.layer;
            setLayerOptions();
            // make sure layer is inited/revealed so you can see the target
            enterLayer(state, currentLayer);
            revealWholeLayer(currentLayer);
            recomputeReachability();
          }
          message = `Jumped to transition target: ${toId}`;
          computeTransitionHighlights();
          renderAll();
        });

        selectionBody.appendChild(btn);
      }
    }
  }

  function renderScenarioDetails() {
    const s: any = scenario();
    scenarioBody.innerHTML = "";
    appendHint(scenarioBody, "Movement:");
    const movement = el("pre");
    movement.textContent = JSON.stringify(s.movement ?? {}, null, 2);
    scenarioBody.appendChild(movement);

    appendHint(scenarioBody, "Transitions:");
    const transitions = el("pre");
    transitions.textContent = JSON.stringify(s.transitions ?? [], null, 2);
    scenarioBody.appendChild(transitions);
  }

  function renderBoard() {
    boardWrap.innerHTML = "";

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

        // NEW: transition highlighting
        if (selectedId && id === selectedId && outgoingFromSelected.length) {
          btn.classList.add("trSrc");
        }
        if (transitionTargetsSameLayer.has(id)) {
          btn.classList.add("trTgt");
          const badge = el("div", "trBadge");
          badge.textContent = transitionTargetsSameLayer.get(id)!;
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

          // Recompute transition highlights when selection changes
          computeTransitionHighlights();

          // Keep debug-friendly move attempt: lets you see a rejection reason
          const res = tryMove(state, id);

          if (res.ok) {
            message = res.won
              ? "🎉 You reached the goal!"
              : res.triggeredTransition
              ? "Moved (transition triggered)."
              : "Moved.";

            const playerCoord = idToCoord(state.playerHexId);
            if (playerCoord) currentLayer = playerCoord.layer;

            setLayerOptions();
            recomputeReachability();
            computeTransitionHighlights();
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
    computeTransitionHighlights();
    renderMeta();
    renderBanner();
    renderBoard();
    renderSelection();
    renderScenarioDetails();
  }

  function startScenario(idx: number) {
    scenarioIndex = idx;
    scenarioSelect.value = String(scenarioIndex);

    state = newGame(scenario());
    selectedId = state.playerHexId ?? null;
    currentLayer = idToCoord(state.playerHexId)?.layer ?? 1;

    enterLayer(state, currentLayer);
    revealWholeLayer(currentLayer);
    recomputeReachability();

    message = "";
    setLayerOptions();
    renderAll();
  }

  // --------------------------
  // Events
  // --------------------------
  scenarioSelect.addEventListener("change", () => startScenario(Number(scenarioSelect.value)));

  layerSelect.addEventListener("change", () => {
    currentLayer = Number(layerSelect.value);
    const err = enterLayer(state, currentLayer);
    message = err ? `Enter layer error: ${err}` : "";
    revealWholeLayer(currentLayer);
    recomputeReachability();
    renderAll();
  });

  endTurnBtn.addEventListener("click", () => {
    endTurn(state);
    enterLayer(state, currentLayer);
    revealWholeLayer(currentLayer);
    recomputeReachability();
    message = "Turn ended.";
    renderAll();
  });

  resetBtn.addEventListener("click", () => startScenario(scenarioIndex));

  forceRevealBtn.addEventListener("click", () => {
    revealWholeLayer(currentLayer);
    recomputeReachability();
    message = "Forced reveal layer + recomputed reachability.";
    renderAll();
  });

  // --------------------------
  // Init
  // --------------------------
  setLayerOptions();
  enterLayer(state, currentLayer);
  revealWholeLayer(currentLayer);
  recomputeReachability();
  renderAll();
}
