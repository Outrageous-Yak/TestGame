import React, { useEffect, useMemo, useRef, useState } from "react";

import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, endTurn, type ReachMap } from "../engine/api";
import { ROW_LENS, posId, enterLayer, revealHex } from "../engine/board";

/* =========================
   Types
========================= */
type Screen = "start" | "select" | "setup" | "game";
type Mode = "regular" | "kids";
type Manifest = { initial: string; files: string[] };

type Coord = { layer: number; row: number; col: number };

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

/* =========================
   Helpers
========================= */
function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m] ?? m;
  });
}

function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const clean = String(p).replace(/^\/+/, "");
  return base + clean;
}

function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
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

function timeHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function rotateCols(len: number, shiftLeft: number) {
  const cols = Array.from({ length: len }, (_, i) => i + 1);
  const s = ((shiftLeft % len) + len) % len;
  return cols.slice(s).concat(cols.slice(0, s));
}

/* =========================
   Presets
========================= */
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

function getPlayerPresets(mode: Mode) {
  return mode === "kids" ? PLAYER_PRESETS_KIDS : PLAYER_PRESETS_REGULAR;
}
function getMonsterPresets(mode: Mode) {
  return mode === "kids" ? MONSTER_PRESETS_KIDS : MONSTER_PRESETS_REGULAR;
}
function monstersLabel(mode: Mode) {
  return mode === "kids" ? "Creatures / baddies" : "Monsters / bad guys";
}

/* =========================
   App (DEFAULT EXPORT)
========================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode | null>(null);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);

  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);
  const [chosenMonsters, setChosenMonsters] = useState<MonsterChoice[]>([]);

  // Engine state
  const [state, setState] = useState<GameState | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [reachMap, setReachMap] = useState<ReachMap>({});
  const reachable = useMemo(
    () => new Set(Object.entries(reachMap).filter(([, v]) => v.reachable).map(([k]) => k)),
    [reachMap]
  );

  // Move log
  const [moveCount, setMoveCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [message, setMessage] = useState<string>("Ready.");

  // Mini-board shifting (UI-only)
  const [miniShiftLeft, setMiniShiftLeft] = useState<Record<number, Record<number, number>>>({});

  // Board sizing refs
  const boardBodyRef = useRef<HTMLDivElement | null>(null);
  const boardSquareRef = useRef<HTMLDivElement | null>(null);
  const boardWrapRef = useRef<HTMLDivElement | null>(null);

  const barSegments = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);

  // Load manifest + scenarios after choosing mode
  useEffect(() => {
    if (!mode) return;

    (async () => {
      const base = mode === "kids" ? "kids/" : "";
      const manifest = await fetchJson<Manifest>(toPublicUrl(`${base}scenarios/manifest.json`));
      const loaded = await Promise.all(
        manifest.files.map((f) => loadScenario(toPublicUrl(`${base}${f}`)))
      );

      // try to align scenarioIndex to manifest.initial
      const initialBase = manifest.initial.split("/").pop()?.replace(".json", "") ?? "";
      let idx = loaded.findIndex((s: any) => String(s?.id ?? s?.name ?? "") === initialBase);
      if (idx < 0) idx = 0;

      setScenarios(loaded);
      setScenarioIndex(idx);
    })().catch((e: any) => {
      alert(String(e?.message ?? e));
    });
  }, [mode]);

  function recomputeReachability(nextState: GameState) {
    const rm = getReachability(nextState);
    setReachMap(rm);
  }

  function revealWholeLayer(nextState: GameState, layer: number) {
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const len = ROW_LENS[r - 1] ?? 7;
      for (let c = 1; c <= len; c++) {
        revealHex(nextState, `L${layer}-R${r}-C${c}`);
      }
    }
  }

  function startScenario(idx: number) {
    const s = scenarios[idx];
    if (!s) return;

    const st = newGame(s);
    const pid = st.playerHexId ?? null;
    const layer = pid ? idToCoord(pid)?.layer ?? 1 : 1;

    // Enter + reveal (logic)
    enterLayer(st, layer);
    revealWholeLayer(st, layer);

    setState(st);
    setSelectedId(pid);
    setCurrentLayer(layer);

    setMoveCount(0);
    setLogs([]);
    setMessage("Ready.");

    setMiniShiftLeft({});
    recomputeReachability(st);
  }

  // Square board sizing + fit (no scrollbars)
  useEffect(() => {
    const body = boardBodyRef.current;
    const square = boardSquareRef.current;
    const wrap = boardWrapRef.current;
    if (!body || !square || !wrap) return;

    function setBoardSquare() {
      const pad = 8;
      const availW = Math.max(0, body.clientWidth - pad * 2);
      const availH = Math.max(0, body.clientHeight - pad * 2);
      const size = Math.floor(Math.max(0, Math.min(availW, availH)));
      if (!size || size < 50) return;
      square.style.width = `${size}px`;
      square.style.height = `${size}px`;
    }

    function setTileLayoutVars() {
      const w = square.clientWidth;
      if (!w || w < 50) return;

      const innerPad = 18;
      const usable = Math.max(50, w - innerPad * 2);
      const gap = 6;
      const cols = 7;
      const minS = 46;
      const maxS = 94;

      const raw = (usable - gap * (cols - 1)) / cols;
      const tileSize = clamp(raw, minS, maxS);
      const offset = Math.round((tileSize + gap) / 2);

      square.style.setProperty("--tileGap", `${gap}px`);
      square.style.setProperty("--tileSize", `${Math.round(tileSize)}px`);
      square.style.setProperty("--tileOffset", `${offset}px`);
    }

    function fitBoardWrapToSquare() {
      const size = square.clientWidth;
      if (!size || size < 50) return;
      const margin = 18;
      const targetW = Math.max(1, size - margin * 2);
      const targetH = Math.max(1, size - margin * 2);

      const w = wrap.scrollWidth || 1;
      const h = wrap.scrollHeight || 1;
      const s = Math.min(targetW / w, targetH / h, 1);

      wrap.style.setProperty("--boardScale", String(s));
    }

    function relayout() {
      setBoardSquare();
      setTileLayoutVars();
      requestAnimationFrame(() => fitBoardWrapToSquare());
    }

    const ro = new ResizeObserver(() => relayout());
    ro.observe(body);
    window.addEventListener("resize", relayout, { passive: true });

    relayout();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", relayout);
    };
  }, [screen]);

  function applyMiniShiftsForEndTurn(nextState: GameState) {
    const s: any = scenarios[scenarioIndex];
    const layers = Number(s?.layers ?? 1);

    // Demo rule: odd rows shift left +1, even rows shift right -1
    setMiniShiftLeft((prev) => {
      const out: Record<number, Record<number, number>> = { ...prev };

      for (let L = 1; L <= layers; L++) {
        const perLayer = { ...(out[L] ?? {}) };
        for (let r = 1; r <= ROW_LENS.length; r++) {
          const len = ROW_LENS[r - 1] ?? 7;
          const delta = r % 2 === 1 ? +1 : -1;
          const next = (perLayer[r] ?? 0) + delta;
          perLayer[r] = ((next % len) + len) % len;
        }
        out[L] = perLayer;
      }

      return out;
    });
  }

  function logClick(id: string, ok: boolean, reason?: string) {
    setMoveCount((n) => n + 1);
    setLogs((prev) => {
      const n = prev.length ? prev[0].n + 1 : 1;
      const entry: LogEntry = { n: n, id, ok, reason, t: timeHHMM() };
      const next = [entry, ...prev];
      return next.length > 200 ? next.slice(0, 200) : next;
    });
  }

  function onCloudClick(id: string) {
    if (!state) return;

    setSelectedId(id);

    const res = tryMove(state, id);
    if (res.ok) {
      logClick(id, true);

      // move happened
      const newPlayerId = state.playerHexId;
      const playerCoord = newPlayerId ? idToCoord(newPlayerId) : null;
      const nextLayer = playerCoord?.layer ?? currentLayer;

      // auto end-turn unless won
      if (!res.won) {
        endTurn(state);
        applyMiniShiftsForEndTurn(state);
        enterLayer(state, nextLayer);
        revealWholeLayer(state, nextLayer);
      }

      setCurrentLayer(nextLayer);
      setSelectedId(state.playerHexId ?? null);

      recomputeReachability(state);
      setMessage(res.won ? "🎉 You reached the goal!" : res.triggeredTransition ? "Moved (transition) — turn ended." : "Moved — turn ended.");
    } else {
      const reason = res.reason ?? "INVALID";
      logClick(id, false, reason);
      setMessage(`Move rejected: ${reason}`);
    }

    // force rerender (state is mutable engine object)
    setState({ ...state });
  }

  function goToLayer(layer: number) {
    if (!state) return;
    const err = enterLayer(state, layer);
    revealWholeLayer(state, layer);
    recomputeReachability(state);
    setCurrentLayer(layer);
    setMessage(err ? `Enter layer error: ${err}` : "Layer changed.");
    setState({ ...state });
  }

  const bgStyle = useMemo(() => {
    // This is the pastel sky you had in the “phase” UI
    return {
      background:
        "radial-gradient(1200px 900px at 30% 10%, rgba(255,190,240,.55), transparent 55%)," +
        "radial-gradient(1000px 800px at 80% 25%, rgba(160,210,255,.45), transparent 55%)," +
        "radial-gradient(1200px 900px at 55% 65%, rgba(200,170,255,.35), transparent 60%)," +
        "linear-gradient(180deg, #b8a7ff 0%, #cbb6ff 35%, #f0b0cf 100%)",
    } as React.CSSProperties;
  }, []);

  /* =========================
     Render
  ========================= */
  return (
    <div className={`screen ${mode === "kids" ? "kids" : ""}`} style={bgStyle}>
      <style>{CSS}</style>

      <div className="cloudBg" aria-hidden="true" />

      <div className="shell">
        {screen === "start" && (
          <div className="card startCard">
            <div className="startHeader">
              <h1>Hex Layers Puzzle</h1>
              <div className="muted">Build: {BUILD_TAG}</div>
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button
                className="btn primary"
                onClick={() => {
                  setMode("regular");
                  setChosenPlayer(null);
                  setChosenMonsters([]);
                  setScreen("select");
                }}
              >
                Regular
              </button>
              <button
                className="btn"
                onClick={() => {
                  setMode("kids");
                  setChosenPlayer(null);
                  setChosenMonsters([]);
                  setScreen("select");
                }}
              >
                Kids / Friendly
              </button>
            </div>

            <div className="startHero">
              <img
                src={toPublicUrl(START_BG_URL)}
                alt="start background"
                onError={(e) => ((e.currentTarget.style.display = "none"))}
              />
              <div className="startHeroLabel">
                <div>
                  <b>Mode:</b> <span className="muted">{mode ?? "—"}</span>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Choose a mode to continue
                  </div>
                </div>
                <div className="pill">Play</div>
              </div>
            </div>
          </div>
        )}

        {screen === "select" && (
          <div className="grid2">
            <div className="card">
              <h2>Select scenario</h2>

              {!mode ? (
                <div className="hint">Pick a mode first.</div>
              ) : scenarios.length === 0 ? (
                <div className="hint">Loading scenarios…</div>
              ) : (
                <div className="listWrap">
                  {scenarios.map((s: any, i) => {
                    const label = String(s?.name ?? s?.title ?? s?.id ?? `Scenario ${i + 1}`);
                    const desc = String(s?.desc ?? s?.description ?? "—");
                    const active = i === scenarioIndex;
                    return (
                      <div
                        key={i}
                        className={`tile ${active ? "selected" : ""}`}
                        onClick={() => setScenarioIndex(i)}
                      >
                        <div className="tileMain">
                          <div className="tileTitle">{label}</div>
                          <div className="tileDesc">{desc}</div>
                        </div>
                        <div className="hint">#{i + 1}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => setScreen("start")}>
                  Back
                </button>
                <button
                  className="btn primary"
                  disabled={!mode || scenarios.length === 0}
                  onClick={() => setScreen("setup")}
                >
                  Continue
                </button>
              </div>
            </div>

            <div className="card">
              <h2>Selected</h2>
              <div className="hint">
                <div>
                  <b>
                    {scenarios[scenarioIndex]
                      ? escapeHtml(String((scenarios[scenarioIndex] as any).name ?? (scenarios[scenarioIndex] as any).id ?? ""))
                      : "—"}
                  </b>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {scenarios[scenarioIndex]
                    ? escapeHtml(
                        String(
                          (scenarios[scenarioIndex] as any).desc ??
                            (scenarios[scenarioIndex] as any).description ??
                            "No description."
                        )
                      )
                    : "—"}
                </div>
                <div className="hint" style={{ marginTop: 10 }}>
                  Mode: <b>{mode ?? "—"}</b>
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === "setup" && (
          <div>
            <div className="grid2">
              <div className="card">
                <h2>Choose your player</h2>

                {mode && (
                  <div className="listWrap">
                    {getPlayerPresets(mode).map((p) => {
                      const selected = chosenPlayer?.kind === "preset" && chosenPlayer.id === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`tile ${selected ? "selected" : ""}`}
                          onClick={() => setChosenPlayer({ kind: "preset", id: p.id, name: p.name })}
                        >
                          <div className="tileMain">
                            <div className="tileTitle">{p.name}</div>
                            <div className="tileDesc">{p.blurb}</div>
                          </div>
                          <div className="hint">Preset</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="card insetCard" style={{ marginTop: 12 }}>
                  <h3>Custom player</h3>

                  <CustomPlayerPicker
                    initialName={chosenPlayer?.kind === "custom" ? chosenPlayer.name : ""}
                    initialImage={chosenPlayer?.kind === "custom" ? chosenPlayer.imageDataUrl : null}
                    onUse={(nm, img) => setChosenPlayer({ kind: "custom", name: nm, imageDataUrl: img })}
                  />
                </div>
              </div>

              <div className="card">
                <h2>{mode ? monstersLabel(mode) : "Monsters"}</h2>

                {mode && (
                  <div className="listWrap">
                    {getMonsterPresets(mode).map((m) => {
                      const isSelected = chosenMonsters.some((x) => x.kind === "preset" && x.id === m.id);
                      return (
                        <div
                          key={m.id}
                          className={`tile ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setChosenMonsters((prev) => {
                              if (isSelected) return prev.filter((x) => !(x.kind === "preset" && x.id === m.id));
                              return [...prev, { id: m.id, name: m.name, notes: m.blurb, imageDataUrl: null, kind: "preset" }];
                            });
                          }}
                        >
                          <div className="tileMain">
                            <div className="tileTitle">{m.name}</div>
                            <div className="tileDesc">{m.blurb}</div>
                          </div>
                          <div className="hint">{isSelected ? "Selected" : "Preset"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="row" style={{ marginTop: 14, justifyContent: "space-between" }}>
              <button className="btn" onClick={() => setScreen("select")}>
                Back
              </button>

              <div className="row">
                <div className="hint">{chosenPlayer ? "Ready." : "Pick a player to continue."}</div>
                <button
                  className="btn primary"
                  disabled={!mode || scenarios.length === 0 || !chosenPlayer}
                  onClick={() => {
                    if (!mode || !chosenPlayer) return;
                    startScenario(scenarioIndex);
                    setScreen("game");
                  }}
                >
                  Start game
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "game" && (
          <div className="gameStage">
            <div className="gameGrid">
              {/* 1) Top-left: Message + Moves */}
              <section className="panel">
                <div className="panelHead">
                  <div className="tag">
                    <span className="dot" /> Message + Moves
                  </div>
                  <div className="pill">Moves: {moveCount}</div>
                </div>
                <div className="panelBody">
                  <div className="msgBox">
                    <div className="msgLeft">{message}</div>
                    <div className="msgRight">Moves: {moveCount}</div>
                  </div>

                  <div className="logList">
                    {logs.slice(0, 40).map((e) => (
                      <div key={`${e.n}-${e.id}`} className={`logItem ${e.ok ? "" : "bad"}`}>
                        <div>
                          {e.ok
                            ? `Move ${e.n} ${e.id}`
                            : `Move ${e.n} ${e.id} (rejected: ${e.reason ?? "INVALID"})`}
                        </div>
                        <div className="t">{e.t}</div>
                      </div>
                    ))}
                  </div>

                  <div className="logSmall">(Logs every cloud click. Rejected moves are marked.)</div>
                </div>
              </section>

              {/* 2) Top-center: Mini current */}
              <MiniBoardPanel
                title="Layers: Current"
                pill={`Layer ${currentLayer}`}
                note="Green = your current column (this layer only)."
                layer={currentLayer}
                showPlayer={true}
                currentLayer={currentLayer}
                state={state}
                miniShiftLeft={miniShiftLeft}
              />

              {/* 3) Top-right: HUD */}
              <section className="panel">
                <div className="panelHead">
                  <div className="tag">
                    <span className="dot" /> HUD
                  </div>
                  <div className="pill">Build: {BUILD_TAG}</div>
                </div>
                <div className="panelBody">
                  <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                    <select
                      className="selectPill"
                      value={String(scenarioIndex)}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        setScenarioIndex(idx);
                        // restart immediately
                        startScenario(idx);
                      }}
                    >
                      {scenarios.map((s: any, i) => (
                        <option key={i} value={String(i)}>
                          {String(s?.name ?? s?.title ?? s?.id ?? `Scenario ${i + 1}`)}
                        </option>
                      ))}
                    </select>

                    <select
                      className="selectPill"
                      value={String(currentLayer)}
                      onChange={(e) => goToLayer(Number(e.target.value))}
                    >
                      {Array.from({ length: Number((scenarios[scenarioIndex] as any)?.layers ?? 1) }, (_, i) => i + 1).map(
                        (L) => (
                          <option key={L} value={String(L)}>
                            Layer {L}
                          </option>
                        )
                      )}
                    </select>

                    <button
                      className="btn"
                      onClick={() => {
                        if (!state) return;
                        endTurn(state);
                        applyMiniShiftsForEndTurn(state);
                        enterLayer(state, currentLayer);
                        revealWholeLayer(state, currentLayer);
                        recomputeReachability(state);
                        setMessage("Turn ended.");
                        setState({ ...state });
                      }}
                    >
                      End turn
                    </button>

                    <button
                      className="btn"
                      onClick={() => {
                        startScenario(scenarioIndex);
                        setMessage("Ready.");
                      }}
                    >
                      Reset run
                    </button>

                    <button
                      className="btn"
                      onClick={() => {
                        if (!state) return;
                        revealWholeLayer(state, currentLayer);
                        recomputeReachability(state);
                        setMessage("Forced reveal layer + recomputed reachability.");
                        setState({ ...state });
                      }}
                    >
                      Force reveal layer
                    </button>

                    <button className="btn" onClick={() => setScreen("setup")}>
                      Exit
                    </button>
                  </div>

                  <HudBlock
                    mode={mode}
                    scenarios={scenarios}
                    scenarioIndex={scenarioIndex}
                    state={state}
                    currentLayer={currentLayer}
                    selectedId={selectedId}
                    reachMap={reachMap}
                    reachable={reachable}
                  />
                </div>
              </section>

              {/* 4) Bottom-left: Mini below */}
              <MiniBoardPanel
                title="Layers: Below"
                pill={currentLayer - 1 >= 1 ? `Layer ${currentLayer - 1}` : "NO LAYER BELOW"}
                note={currentLayer - 1 >= 1 ? "Structure only (no player)." : "No tiles below this layer."}
                layer={currentLayer - 1}
                showPlayer={false}
                currentLayer={currentLayer}
                state={state}
                miniShiftLeft={miniShiftLeft}
              />

              {/* 5) Bottom-center: Board */}
              <section className="panel">
                <div className="panelHead">
                  <div className="tag">
                    <span className="dot" /> Board
                  </div>
                  <div className="pill">Layer {currentLayer}</div>
                </div>

                <div className="panelBody boardBody" ref={boardBodyRef}>
                  <div className="boardSquare" ref={boardSquareRef}>
                    <div
                      className="boardBg"
                      style={{ backgroundImage: `url("${toPublicUrl(BOARD_BG_URL)}")` }}
                    />
                    <div className="boardCenter">
                      <div className="boardWrap" ref={boardWrapRef}>
                        {/* Rows */}
                        {Array.from({ length: ROW_LENS.length }, (_, rIdx) => {
                          const r = rIdx + 1;
                          const len = ROW_LENS[rIdx] ?? 7;
                          const offset = r % 2 === 0;
                          return (
                            <div key={r} className={`tileRow ${offset ? "offset" : ""}`}>
                              {Array.from({ length: len }, (_, cIdx) => {
                                const c = cIdx + 1;
                                const id = `L${currentLayer}-R${r}-C${c}`;
                                const h: Hex | undefined = state ? (state.hexesById as any).get(id) : undefined;
                                const info = reachMap[id];
                                const isPlayer = state?.playerHexId === id;

                                const missing = !!(h as any)?.missing;
                                const blocked = !!(h as any)?.blocked;
                                const revealed = !!(h as any)?.revealed;

                                // IMPORTANT: visuals should be consistent even before/after reveal
                                // -> we still keep fog class when not revealed, but no extra shapes appear.
                                const cls =
                                  "cloud" +
                                  (info?.reachable ? " reach" : "") +
                                  (isPlayer ? " player" : "") +
                                  (selectedId === id ? " sel" : "") +
                                  (!info?.reachable && !isPlayer ? " notReach" : "") +
                                  (missing ? " missing" : "") +
                                  (blocked ? " blocked" : "") +
                                  (!revealed ? " fog" : "");

                                return (
                                  <div
                                    key={id}
                                    className={cls}
                                    data-row={String(r)}
                                    onClick={() => onCloudClick(id)}
                                    title={id}
                                  >
                                    <div className="cloudLabel">
                                      <div>R{r}</div>
                                      <div>C{c}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Rainbow layer bar OUTSIDE board, but inside panel cell */}
                    <div className="barWrap" aria-label="Layer bar">
                      <div className="layerBar" data-active={currentLayer}>
                        {barSegments.map((layerVal) => {
                          const active = layerVal === currentLayer;
                          return (
                            <div
                              key={layerVal}
                              className={"barSeg" + (active ? " isActive" : "")}
                              data-layer={layerVal}
                              title={`Layer ${layerVal}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 6) Bottom-right: Mini above */}
              <MiniBoardPanel
                title="Layers: Above"
                pill={
                  state && scenarios[scenarioIndex]
                    ? currentLayer + 1 <= Number((scenarios[scenarioIndex] as any)?.layers ?? 1)
                      ? `Layer ${currentLayer + 1}`
                      : "NO LAYER ABOVE"
                    : "—"
                }
                note={
                  state && scenarios[scenarioIndex]
                    ? currentLayer + 1 <= Number((scenarios[scenarioIndex] as any)?.layers ?? 1)
                      ? "Structure only (no player)."
                      : "No tiles above this layer."
                    : "—"
                }
                layer={currentLayer + 1}
                showPlayer={false}
                currentLayer={currentLayer}
                state={state}
                miniShiftLeft={miniShiftLeft}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Components
========================= */

function CustomPlayerPicker(props: {
  initialName: string;
  initialImage: string | null;
  onUse: (name: string, image: string | null) => void;
}) {
  const [name, setName] = useState(props.initialName || "");
  const [img, setImg] = useState<string | null>(props.initialImage);

  useEffect(() => {
    setName(props.initialName || "");
    setImg(props.initialImage);
  }, [props.initialName, props.initialImage]);

  return (
    <>
      <div className="drop">
        <div className="preview">{img ? <img src={img} alt="uploaded" /> : "Drop\nImage"}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="row" style={{ gap: 10 }}>
            <label className="btn small" style={{ cursor: "pointer" }}>
              Upload image
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await readFileAsDataURL(file);
                  setImg(url);
                }}
              />
            </label>
            <div className="hint">PNG/JPG</div>
          </div>

          <div className="field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              placeholder="Enter name..."
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
      </div>

      <button
        className="btn"
        style={{ marginTop: 10 }}
        onClick={() => props.onUse(name.trim() || "Custom Player", img)}
      >
        Use custom player
      </button>
    </>
  );
}

function MiniBoardPanel(props: {
  title: string;
  pill: string;
  note: string;
  layer: number;
  showPlayer: boolean;
  currentLayer: number;
  state: GameState | null;
  miniShiftLeft: Record<number, Record<number, number>>;
}) {
  const maxLayer = props.state ? Number((props.state as any).layers ?? 999) : 999;

  const pc = props.state?.playerHexId ? idToCoord(props.state.playerHexId) : null;
  const playerRow = pc?.row ?? -1;
  const playerCol = pc?.col ?? -1;

  const valid = props.layer >= 1 && props.layer <= maxLayer && props.layer <= 999;

  return (
    <section className="panel">
      <div className="panelHead">
        <div className="tag">
          <span className="dot" /> {props.title}
        </div>
        <div className="pill">{props.pill}</div>
      </div>
      <div className="panelBody">
        <div className="miniBoardGrid">
          {Array.from({ length: ROW_LENS.length }, (_, rIdx) => {
            const r = rIdx + 1;
            const len = ROW_LENS[rIdx] ?? 7;

            const shiftLeft = props.miniShiftLeft?.[props.layer]?.[r] ?? 0;
            const orderedCols = rotateCols(len, shiftLeft);

            return (
              <div key={r} className={`miniRow ${r % 2 === 0 ? "offset" : ""}`}>
                <b>R{r}:</b>

                {Array.from({ length: len }, (_, i) => {
                  if (!valid) {
                    return <span key={i} className="miniCell empty" />;
                  }
                  const c = orderedCols[i];
                  const on =
                    props.showPlayer &&
                    props.layer === props.currentLayer &&
                    r === playerRow &&
                    c === playerCol;

                  return (
                    <span key={c} className={`miniCell ${on ? "on" : ""}`}>
                      {c}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="miniNote">{props.note}</div>
      </div>
    </section>
  );
}

function HudBlock(props: {
  mode: Mode | null;
  scenarios: Scenario[];
  scenarioIndex: number;
  state: GameState | null;
  currentLayer: number;
  selectedId: string | null;
  reachMap: ReachMap;
  reachable: Set<string>;
}) {
  const s: any = props.scenarios[props.scenarioIndex];
  const goal = s ? posId((s as any).goal) : "—";
  const sel = props.selectedId ?? "—";
  const info = props.selectedId ? props.reachMap[props.selectedId] : undefined;

  const layerReachable = Array.from(props.reachable).filter((id) => idToCoord(id)?.layer === props.currentLayer).length;

  // status
  let status = "—";
  if (props.state && props.selectedId) {
    const h: any = (props.state.hexesById as any).get(props.selectedId);
    status = h?.missing ? "missing" : h?.blocked ? "blocked" : "usable";
  }

  return (
    <div className="infoText">
      <div>
        <b>Scenario:</b> {escapeHtml(String(s?.name ?? s?.title ?? s?.id ?? ""))}
        <br />
        <b>Mode:</b> {escapeHtml(String(props.mode ?? "—"))}
        <br />
        <b>Player:</b> {escapeHtml(String(props.state?.playerHexId ?? "?"))}
        <br />
        <b>Goal:</b> {escapeHtml(String(goal))}
        <br />
        <b>Layer:</b> {escapeHtml(String(props.currentLayer))}
        <br />
        <b>Selected:</b> {escapeHtml(sel)}
        <br />
        <b>Status:</b> {escapeHtml(status)} · <b>Reachable:</b> {escapeHtml(info?.reachable ? "yes" : "no")} ·{" "}
        <b>Distance:</b> {escapeHtml(String(info?.distance ?? "—"))}
        <br />
        <b>Reachable:</b> {props.reachable.size} (layer {props.currentLayer}: {layerReachable})
      </div>
    </div>
  );
}

/* =========================
   CSS (keeps your look)
========================= */
const CSS = `
:root{
  --ink: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.70);
  --radius: 18px;
  --gap: 12px;

  /* Pastel rainbow reversed (R1 violet -> R7 red) */
  --r1: rgba(190, 170, 255, .42);
  --r2: rgba(155, 170, 255, .40);
  --r3: rgba(150, 210, 255, .40);
  --r4: rgba(165, 245, 205, .40);
  --r5: rgba(255, 245, 170, .38);
  --r6: rgba(255, 215, 170, .38);
  --r7: rgba(255, 170, 190, .38);
}

*{ box-sizing:border-box; }
html, body { height: 100%; margin: 0; }
body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }

.screen{
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  color: var(--ink);
}

.kids{
  /* optional slight tweak */
  filter: saturate(1.05);
}

.cloudBg{
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 450px at 50% 85%, rgba(255,255,255,.85), transparent 60%),
    radial-gradient(1100px 520px at 20% 92%, rgba(255,255,255,.80), transparent 62%),
    radial-gradient(1100px 520px at 80% 92%, rgba(255,255,255,.80), transparent 62%),
    radial-gradient(1200px 650px at 50% 105%, rgba(255,255,255,.90), transparent 65%);
  opacity: .95;
  pointer-events: none;
}

.shell{
  position: relative;
  z-index: 1;
  width: min(1480px, calc(100vw - 36px));
  margin: 0 auto;
  padding: 18px 0 26px;
}

/* ===== Cards / tiles ===== */
.card{
  border-radius: var(--radius);
  background: rgba(0,0,0,.16);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 18px 50px rgba(0,0,0,.25);
  padding: 14px;
  backdrop-filter: blur(10px);
}

.insetCard{
  background: rgba(0,0,0,.12);
}

h1{ margin: 0; font-size: 44px; line-height: 1.05; }
h2{ margin: 0 0 10px 0; font-size: 14px; letter-spacing: .2px; }
h3{ margin: 0 0 10px 0; font-size: 13px; letter-spacing: .2px; }

.hint{ opacity: .82; font-size: 12px; }
.muted{ opacity: .82; }

.row{ display:flex; align-items:center; gap:10px; flex-wrap: wrap; }
.pill{
  font-size:11px;
  color: var(--muted);
  padding:6px 10px;
  border-radius:999px;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(0,0,0,.12);
  font-weight: 800;
  white-space: nowrap;
}

.btn{
  padding:8px 10px;
  border-radius: 12px;
  border:1px solid rgba(255,255,255,.22);
  background: rgba(0,0,0,.12);
  color: var(--ink);
  cursor:pointer;
  user-select:none;
  font-size: 12px;
  font-weight: 900;
}
.btn:hover{ filter: brightness(1.06); }
.btn.primary{
  border-color: rgba(255,255,255,.30);
  background: rgba(255,255,255,.14);
}
.btn.small{
  padding:6px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.grid2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 980px){
  .grid2{ grid-template-columns: 1fr; }
}

.listWrap{
  display:grid;
  gap: 10px;
}

.tile{
  padding: 12px;
  border-radius: 16px;
  border:1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.10);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
}
.tile:hover{ filter: brightness(1.04); }
.tile.selected{
  border-color: rgba(255,255,255,.32);
  box-shadow: 0 0 0 3px rgba(255,255,255,.10) inset;
}
.tileMain{ min-width:0; }
.tileTitle{ font-weight: 900; margin-bottom: 3px; font-size: 12px; }
.tileDesc{ font-size:11px; opacity:.82; line-height:1.25; }

.drop{
  border:1px dashed rgba(255,255,255,.22);
  background: rgba(255,255,255,.06);
  border-radius: 16px;
  padding: 12px;
  display:flex;
  gap: 12px;
  align-items:center;
}
.preview{
  width:64px;
  height:64px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.18);
  display:grid;
  place-items:center;
  overflow:hidden;
  font-size:11px;
  text-align:center;
  opacity:.85;
  white-space:pre-line;
  flex:0 0 auto;
}
.preview img{ width:100%; height:100%; object-fit:cover; display:block; }

.field{ display:flex; flex-direction:column; gap:6px; margin-top:10px; }
label{ font-size:11px; opacity:.85; }
input[type="text"]{
  padding:8px 10px;
  border-radius: 12px;
  border:1px solid rgba(255,255,255,.20);
  background: rgba(0,0,0,.20);
  color: var(--ink);
  outline:none;
  font-size: 12px;
  font-weight: 800;
}

/* ===== Start hero ===== */
.startHeader{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.startHero{
  margin-top: 14px;
  border-radius: 18px;
  overflow:hidden;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.10);
  min-height: 220px;
  position: relative;
  box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 18px 40px rgba(0,0,0,.20);
}
.startHero img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit: cover;
  display:block;
}
.startHero::after{
  content:"";
  position:absolute;
  inset:0;
  background:
    radial-gradient(700px 340px at 20% 25%, rgba(255,255,255,.18), transparent 55%),
    radial-gradient(700px 340px at 80% 60%, rgba(255,255,255,.18), transparent 60%),
    linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.35));
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
.startHeroLabel b{ font-size: 13px; }

/* ===== Game grid (2 rows x 3 cols) ===== */
.gameStage{
  border-radius: calc(var(--radius) + 6px);
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.12);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset, 0 18px 60px rgba(0,0,0,.25);
  overflow:hidden;
  padding: 12px;
}
.gameGrid{
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: var(--gap);
  height: calc(100vh - 160px);
  min-height: 560px;
}
@media (max-width: 1180px){
  .gameGrid{ grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: auto; height: auto; min-height: 0; }
}
@media (max-width: 760px){
  .gameGrid{ grid-template-columns: 1fr; }
}

.panel{
  border-radius: var(--radius);
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.14);
  overflow:hidden;
  box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset, 0 18px 40px rgba(0,0,0,.20);
  display:flex;
  flex-direction:column;
  min-width:0;
  min-height:0;
}

.panelHead{
  padding:10px 12px;
  border-bottom: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.14);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
  min-height: 48px;
}
.panelBody{
  padding: 12px;
  overflow:auto;
  min-height: 0;
  min-width: 0;
}

.tag{
  font-size:11px;
  color: var(--muted);
  display:flex;
  align-items:center;
  gap:8px;
  font-weight: 900;
  letter-spacing:.2px;
}
.dot{
  width:8px;
  height:8px;
  border-radius:99px;
  background: rgba(255,255,255,.55);
  box-shadow: 0 0 12px rgba(255,255,255,.25);
}

.selectPill{
  font-size: 12px;
  font-weight: 900;
  border-radius: 999px;
  padding: 8px 12px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.12);
  color: rgba(255,255,255,.92);
  outline: none;
}

/* ===== Msg + logs ===== */
.msgBox{
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.10);
  padding: 10px 12px;
  font-weight: 900;
  font-size: 12px;
  display:flex;
  justify-content:space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.msgLeft{ min-width:0; overflow:hidden; text-overflow:ellipsis; }
.msgRight{ flex:0 0 auto; opacity:.92; }
.logList{ display:flex; flex-direction:column; gap:10px; }
.logItem{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.10);
  padding: 10px 12px;
  font-weight: 900;
}
.logItem .t{ opacity:.78; font-weight:800; }
.logItem.bad{ border-color: rgba(255,120,120,.22); }
.logSmall{ margin-top: 10px; opacity:.82; font-weight:800; }

/* ===== Mini boards ===== */
.miniBoardGrid{
  display:flex;
  flex-direction:column;
  gap:8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  line-height: 1.25;
}
.miniRow{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
}
.miniRow b{ opacity:.9; font-weight: 900; min-width: 34px; }
.miniRow.offset{ padding-left: calc((24px + 8px) / 2); }

.miniCell{
  width: 24px;
  height: 24px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.12);
  font-weight: 900;
  color: rgba(255,255,255,.92);
}
.miniCell.on{
  border-color: rgba(76,255,80,.75);
  background: rgba(76,255,80,.18);
  box-shadow: 0 0 0 2px rgba(76,255,80,.18) inset, 0 0 16px rgba(76,255,80,.22);
}
.miniCell.empty{ opacity:.45; color: rgba(255,255,255,.25); }
.miniNote{ margin-top: 10px; opacity:.75; font-weight: 800; font-size: 11px; }

/* ===== Board cell ===== */
.boardBody{
  overflow: hidden;
  padding: 12px;
  display:flex;
  flex-direction:column;
  min-height: 0;
}
.boardSquare{
  position:relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 16px;
  margin: 0 auto;

  /* vars */
  --tileGap: 6px;
  --tileSize: 72px;
  --tileOffset: 39px;
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
}
.boardBg::after{
  content:"";
  position:absolute;
  inset:0;
  background:
    radial-gradient(900px 500px at 20% 20%, rgba(255,255,255,.10), transparent 60%),
    radial-gradient(900px 500px at 80% 65%, rgba(255,255,255,.10), transparent 60%),
    linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.22));
}

.boardCenter{
  position:relative;
  z-index: 1;
  width:100%;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
}

.boardWrap{
  display:grid;
  gap: 10px;
  width: max-content;
  transform: scale(var(--boardScale, 1));
  transform-origin: center center;
}

.tileRow{
  display:flex;
  gap: var(--tileGap);
  align-items:center;
  justify-content:flex-start;
}
.tileRow.offset{ padding-left: var(--tileOffset); }

/* Single-shape cloud (circle) + glow */
.cloud{
  width: var(--tileSize);
  height: var(--tileSize);
  border-radius: 999px;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  position:relative;
  user-select:none;
  overflow:hidden;

  /* bright white border */
  border: 2px solid rgba(255,255,255,.92);

  /* soft pastel fill */
  background:
    radial-gradient(circle at 30% 28%, rgba(255,255,255,.35), transparent 45%),
    radial-gradient(circle at 70% 75%, rgba(0,0,0,.10), transparent 55%),
    var(--fill, rgba(255,255,255,.18));

  box-shadow:
    0 0 0 2px rgba(255,255,255,.10) inset,
    0 0 18px rgba(255,255,255,.22);

  transition: transform .12s ease, filter .12s ease, box-shadow .18s ease;
}

.cloud:hover{
  transform: translateY(-1px) scale(1.02);
  filter: brightness(1.06);
}

.cloud[data-row="1"]{ --fill: var(--r1); }
.cloud[data-row="2"]{ --fill: var(--r2); }
.cloud[data-row="3"]{ --fill: var(--r3); }
.cloud[data-row="4"]{ --fill: var(--r4); }
.cloud[data-row="5"]{ --fill: var(--r5); }
.cloud[data-row="6"]{ --fill: var(--r6); }
.cloud[data-row="7"]{ --fill: var(--r7); }

/* Labels: 2 lines, white with black outline */
.cloudLabel{
  position:relative;
  z-index: 2;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  text-align:center;
  line-height: 1.05;
  font-weight: 1000;
  letter-spacing: .2px;
  color: rgba(255,255,255,.95);
  text-shadow:
    -1px -1px 0 rgba(0,0,0,.65),
     1px -1px 0 rgba(0,0,0,.65),
    -1px  1px 0 rgba(0,0,0,.65),
     1px  1px 0 rgba(0,0,0,.65),
     0 0 10px rgba(0,0,0,.35);
}

/* Reachable: blue glow */
.cloud.reach{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.12) inset,
    0 0 18px rgba(0,200,255,.35),
    0 0 44px rgba(0,200,255,.20);
}

/* Player: green glow (keep) */
.cloud.player{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.18) inset,
    0 0 24px rgba(76,255,80,.60),
    0 0 70px rgba(76,255,80,.40);
  filter: brightness(1.12);
  z-index: 4;
}

/* Not reachable: dim only */
.cloud.notReach{
  opacity: .58;
  filter: saturate(.86) brightness(.92);
  cursor: not-allowed;
}
.cloud.notReach:hover{
  transform:none;
  filter: saturate(.86) brightness(.92);
}

/* Selected: thin outline */
.cloud.sel{
  outline: 2px solid rgba(255,255,255,.55);
  outline-offset: 2px;
}

/* blocked/missing/fog (subtle) */
.cloud.blocked{ opacity: .70; filter: grayscale(.35) brightness(.90); }
.cloud.missing{ opacity: .45; filter: grayscale(.70) brightness(.82); }
.cloud.fog{ opacity: .80; filter: saturate(.80) brightness(.92); }

/* Rainbow bar */
.barWrap{
  position:absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  display:flex;
  align-items:center;
  justify-content:center;
}
.layerBar{
  width: 18px;
  height: 72%;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(0,0,0,.10);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 18px 40px rgba(0,0,0,.18);
  display: grid;
  grid-template-rows: repeat(7, 1fr);
}
.barSeg{ opacity: .95; }
.barSeg[data-layer="1"]{ background: rgba(255, 92, 120, .95); }
.barSeg[data-layer="2"]{ background: rgba(255, 150, 90, .95); }
.barSeg[data-layer="3"]{ background: rgba(255, 220, 120, .95); }
.barSeg[data-layer="4"]{ background: rgba(120, 235, 170, .95); }
.barSeg[data-layer="5"]{ background: rgba(120, 220, 255, .95); }
.barSeg[data-layer="6"]{ background: rgba(135, 170, 255, .95); }
.barSeg[data-layer="7"]{ background: rgba(200, 140, 255, .95); }
.barSeg.isActive{
  outline: 1px solid rgba(255,255,255,.25);
  box-shadow: 0 0 16px rgba(255,255,255,.35), 0 0 30px rgba(255,255,255,.18);
}
`;;
