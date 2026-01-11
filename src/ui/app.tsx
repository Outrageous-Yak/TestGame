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
  t: string;
};

const BUILD_TAG = "BUILD_TAG_TILES_DEMO_V1";
const START_BG_URL = "images/ui/start-screen.jpg";
const BOARD_BG_URL = "images/ui/board-bg.png";

/* =========================
   Helpers
========================= */
function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  return base + String(p).replace(/^\/+/, "");
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
   Presets (kept)
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

/* =========================
   App
========================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode | null>(null);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);

  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);
  const [chosenMonsters, setChosenMonsters] = useState<MonsterChoice[]>([]);

  const [state, setState] = useState<GameState | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [reachMap, setReachMap] = useState<ReachMap>({});
  const reachable = useMemo(
    () => new Set(Object.entries(reachMap).filter(([, v]) => v.reachable).map(([k]) => k)),
    [reachMap]
  );

  const [message, setMessage] = useState("Ready.");
  const [moveCount, setMoveCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [miniShiftLeft, setMiniShiftLeft] = useState<Record<number, Record<number, number>>>({});

  // Board sizing
  const boardBoxRef = useRef<HTMLDivElement | null>(null);
  const boardSquareRef = useRef<HTMLDivElement | null>(null);
  const boardWrapRef = useRef<HTMLDivElement | null>(null);

  // Load scenarios when mode set (same as before)
  useEffect(() => {
    if (!mode) return;
    (async () => {
      const base = mode === "kids" ? "kids/" : "";
      const manifest = await fetchJson<Manifest>(toPublicUrl(`${base}scenarios/manifest.json`));
      const loaded = await Promise.all(manifest.files.map((f) => loadScenario(toPublicUrl(`${base}${f}`))));

      const initialBase = manifest.initial.split("/").pop()?.replace(".json", "") ?? "";
      let idx = loaded.findIndex((s: any) => String(s?.id ?? s?.name ?? "") === initialBase);
      if (idx < 0) idx = 0;

      setScenarios(loaded);
      setScenarioIndex(idx);
    })().catch((e: any) => alert(String(e?.message ?? e)));
  }, [mode]);

  function recompute(next: GameState) {
    setReachMap(getReachability(next));
  }

  function revealWholeLayer(next: GameState, layer: number) {
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const len = ROW_LENS[r - 1] ?? 7;
      for (let c = 1; c <= len; c++) revealHex(next, `L${layer}-R${r}-C${c}`);
    }
  }

  function startScenario(idx: number) {
    const s = scenarios[idx];
    if (!s) return;

    const st = newGame(s);
    const pid = st.playerHexId ?? null;
    const layer = pid ? idToCoord(pid)?.layer ?? 1 : 1;

    enterLayer(st, layer);
    revealWholeLayer(st, layer);

    setState(st);
    setSelectedId(pid);
    setCurrentLayer(layer);

    setMoveCount(0);
    setLogs([]);
    setMessage("Ready.");
    setMiniShiftLeft({});
    recompute(st);
  }

  function logClick(id: string, ok: boolean, reason?: string) {
    setMoveCount((n) => n + 1);
    setLogs((prev) => {
      const n = prev.length ? prev[0].n + 1 : 1;
      const entry: LogEntry = { n, id, ok, reason, t: timeHHMM() };
      const next = [entry, ...prev];
      return next.length > 200 ? next.slice(0, 200) : next;
    });
  }

  function applyMiniShiftAfterEndTurn(layerCount: number) {
    setMiniShiftLeft((prev) => {
      const out: Record<number, Record<number, number>> = { ...prev };
      for (let L = 1; L <= layerCount; L++) {
        const per = { ...(out[L] ?? {}) };
        for (let r = 1; r <= ROW_LENS.length; r++) {
          const len = ROW_LENS[r - 1] ?? 7;
          const delta = r % 2 === 1 ? +1 : -1;
          const next = (per[r] ?? 0) + delta;
          per[r] = ((next % len) + len) % len;
        }
        out[L] = per;
      }
      return out;
    });
  }

  function onHexClick(id: string) {
    if (!state) return;

    setSelectedId(id);

    const res = tryMove(state, id);
    if (res.ok) {
      logClick(id, true);

      const nextPlayer = state.playerHexId ?? null;
      const nextLayer = nextPlayer ? idToCoord(nextPlayer)?.layer ?? currentLayer : currentLayer;

      if (!res.won) {
        endTurn(state);
        const layerCount = Number((scenarios[scenarioIndex] as any)?.layers ?? 1);
        applyMiniShiftAfterEndTurn(layerCount);
        enterLayer(state, nextLayer);
        revealWholeLayer(state, nextLayer);
      }

      setCurrentLayer(nextLayer);
      setSelectedId(state.playerHexId ?? null);
      recompute(state);

      setMessage(
        res.won
          ? "🎉 You reached the goal!"
          : res.triggeredTransition
          ? "Moved (transition) — turn ended."
          : "Moved — turn ended."
      );
    } else {
      const reason = res.reason ?? "INVALID";
      logClick(id, false, reason);
      setMessage(`Move rejected: ${reason}`);
    }

    setState({ ...state }); // mutable engine object -> force render
  }

  // ===== Board fitting (square-in-square like your phase UI) =====
  useEffect(() => {
    if (screen !== "game") return;

    const box = boardBoxRef.current;
    const square = boardSquareRef.current;
    const wrap = boardWrapRef.current;
    if (!box || !square || !wrap) return;

    function relayout() {
      const pad = 12;
      const size = Math.floor(Math.min(box.clientWidth - pad * 2, box.clientHeight - pad * 2));
      if (!size || size < 50) return;

      square.style.width = `${size}px`;
      square.style.height = `${size}px`;

      // compute hex size for 7 cols
      const innerPad = 22;
      const usable = Math.max(50, size - innerPad * 2);
      const gap = 8;
      const cols = 7;

      // Hex width is tileSize, but due to pointy hex, horizontal spacing looks best with slightly tighter gap
      const raw = (usable - gap * (cols - 1)) / cols;
      const tile = clamp(raw, 46, 96);

      const offset = Math.round((tile + gap) / 2);

      square.style.setProperty("--tileGap", `${gap}px`);
      square.style.setProperty("--tileSize", `${Math.round(tile)}px`);
      square.style.setProperty("--tileOffset", `${offset}px`);

      // fit wrap
      const margin = 18;
      const targetW = Math.max(1, size - margin * 2);
      const targetH = Math.max(1, size - margin * 2);
      const w = wrap.scrollWidth || 1;
      const h = wrap.scrollHeight || 1;
      const s = Math.min(targetW / w, targetH / h, 1);
      wrap.style.setProperty("--boardScale", String(s));
    }

    const ro = new ResizeObserver(() => relayout());
    ro.observe(box);
    window.addEventListener("resize", relayout, { passive: true });
    relayout();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", relayout);
    };
  }, [screen]);

  /* =========================
     UI Flow Screens
  ========================= */
  return (
    <div className={`root ${mode === "kids" ? "kids" : ""}`}>
      <style>{CSS}</style>

      {screen === "start" && (
        <div className="shell">
          <div className="card startCard">
            <div className="topRow">
              <div>
                <div className="brand">Hex Layers</div>
                <div className="muted">Build: {BUILD_TAG}</div>
              </div>
              <div className="pill">Start</div>
            </div>

            <div className="startHero">
              <img src={toPublicUrl(START_BG_URL)} alt="start" onError={(e) => (e.currentTarget.style.display = "none")} />
              <div className="startHeroLabel">
                <div>
                  <b>Choose mode</b>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Regular or Kids
                  </div>
                </div>
              </div>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
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
          </div>
        </div>
      )}

      {screen === "select" && (
        <div className="shell">
          <div className="grid2">
            <div className="card">
              <div className="topRow">
                <div>
                  <div className="h2">Select scenario</div>
                  <div className="muted">Mode: {mode ?? "—"}</div>
                </div>
                <div className="pill">Select</div>
              </div>

              {!mode ? (
                <div className="hint">Pick a mode first.</div>
              ) : scenarios.length === 0 ? (
                <div className="hint">Loading scenarios…</div>
              ) : (
                <div className="list">
                  {scenarios.map((s: any, i) => {
                    const label = String(s?.name ?? s?.title ?? s?.id ?? `Scenario ${i + 1}`);
                    const desc = String(s?.desc ?? s?.description ?? "—");
                    return (
                      <div
                        key={i}
                        className={`tile ${i === scenarioIndex ? "selected" : ""}`}
                        onClick={() => setScenarioIndex(i)}
                      >
                        <div>
                          <div className="tileTitle">{label}</div>
                          <div className="tileDesc">{desc}</div>
                        </div>
                        <div className="pillSmall">#{i + 1}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => setScreen("start")}>
                  Back
                </button>
                <button className="btn primary" disabled={!mode || scenarios.length === 0} onClick={() => setScreen("setup")}>
                  Continue
                </button>
              </div>
            </div>

            <div className="card">
              <div className="h2">Selected</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {scenarios[scenarioIndex]
                  ? String((scenarios[scenarioIndex] as any)?.name ?? (scenarios[scenarioIndex] as any)?.id ?? "")
                  : "—"}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                {scenarios[scenarioIndex]
                  ? String((scenarios[scenarioIndex] as any)?.desc ?? (scenarios[scenarioIndex] as any)?.description ?? "—")
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === "setup" && (
        <div className="shell">
          <div className="grid2">
            <div className="card">
              <div className="h2">Select player</div>

              {mode && (
                <div className="list" style={{ marginTop: 10 }}>
                  {getPlayerPresets(mode).map((p) => {
                    const on = chosenPlayer?.kind === "preset" && chosenPlayer.id === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`tile ${on ? "selected" : ""}`}
                        onClick={() => setChosenPlayer({ kind: "preset", id: p.id, name: p.name })}
                      >
                        <div>
                          <div className="tileTitle">{p.name}</div>
                          <div className="tileDesc">{p.blurb}</div>
                        </div>
                        <div className="pillSmall">Preset</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="card inset" style={{ marginTop: 12 }}>
                <div className="h3">Custom player</div>
                <CustomPlayerPicker
                  initialName={chosenPlayer?.kind === "custom" ? chosenPlayer.name : ""}
                  initialImage={chosenPlayer?.kind === "custom" ? chosenPlayer.imageDataUrl : null}
                  onUse={(nm, img) => setChosenPlayer({ kind: "custom", name: nm, imageDataUrl: img })}
                />
              </div>
            </div>

            <div className="card">
              <div className="h2">Select game mode</div>
              <div className="muted">You already chose: {mode ?? "—"}</div>

              {mode && (
                <div className="list" style={{ marginTop: 10 }}>
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
                        <div>
                          <div className="tileTitle">{m.name}</div>
                          <div className="tileDesc">{m.blurb}</div>
                        </div>
                        <div className="pillSmall">{isSelected ? "Selected" : "Preset"}</div>
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
              <div className="muted">{chosenPlayer ? "Ready." : "Pick a player to continue."}</div>
              <button
                className="btn primary"
                disabled={!mode || scenarios.length === 0 || !chosenPlayer}
                onClick={() => {
                  startScenario(scenarioIndex);
                  setScreen("game");
                }}
              >
                Play
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "game" && (
        <div className="gamePage">
          {/* Top pill */}
          <div className="layerPill" onClick={() => {}} title="Layer (click to change via dropdown on right)">
            <span className="layerPillBig">Layer {currentLayer}</span>
            <span className="layerPillSmall">click to change</span>
          </div>

          {/* Board + bar */}
          <div className="boardOuter">
            <div className="boardSquare" ref={boardSquareRef}>
              <div className="boardBg" style={{ backgroundImage: `url("${toPublicUrl(BOARD_BG_URL)}")` }} />
              <div className="boardCenter">
                <div className="boardWrap" ref={boardWrapRef}>
                  {Array.from({ length: ROW_LENS.length }, (_, rIdx) => {
                    const r = rIdx + 1;
                    const len = ROW_LENS[rIdx] ?? 7;
                    return (
                      <div key={r} className={`hexRow ${r % 2 === 0 ? "offset" : ""}`}>
                        {Array.from({ length: len }, (_, cIdx) => {
                          const c = cIdx + 1;
                          const id = `L${currentLayer}-R${r}-C${c}`;

                          const h: Hex | undefined = state ? (state.hexesById as any).get(id) : undefined;
                          const info = reachMap[id];
                          const isPlayer = state?.playerHexId === id;

                          const missing = !!(h as any)?.missing;
                          const blocked = !!(h as any)?.blocked;
                          const revealed = !!(h as any)?.revealed;

                          const cls =
                            "hexTile" +
                            (info?.reachable ? " reach" : "") +
                            (isPlayer ? " player" : "") +
                            (selectedId === id ? " sel" : "") +
                            (!info?.reachable && !isPlayer ? " notReach" : "") +
                            (missing ? " missing" : "") +
                            (blocked ? " blocked" : "") +
                            (!revealed ? " fog" : "");

                          return (
                            <div key={id} className={cls} data-row={String(r)} onClick={() => onHexClick(id)} title={id}>
                              <div className="hexLabel">
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

              {/* Right rainbow bar */}
              <div className="barWrap">
                <div className="layerBar">
                  {[7, 6, 5, 4, 3, 2, 1].map((L) => (
                    <div key={L} className={`barSeg seg${L} ${L === currentLayer ? "active" : ""}`} />
                  ))}
                </div>

                {/* Quick controls next to bar (scenario/layer + actions) */}
                <div className="barControls">
                  <select
                    className="selectPill"
                    value={String(scenarioIndex)}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setScenarioIndex(idx);
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
                    onChange={(e) => {
                      if (!state) return;
                      const L = Number(e.target.value);
                      enterLayer(state, L);
                      revealWholeLayer(state, L);
                      recompute(state);
                      setCurrentLayer(L);
                      setMessage("Layer changed.");
                      setState({ ...state });
                    }}
                  >
                    {Array.from({ length: Number((scenarios[scenarioIndex] as any)?.layers ?? 1) }, (_, i) => i + 1).map((L) => (
                      <option key={L} value={String(L)}>
                        Layer {L}
                      </option>
                    ))}
                  </select>

                  <button
                    className="btn"
                    onClick={() => {
                      if (!state) return;
                      endTurn(state);
                      const layerCount = Number((scenarios[scenarioIndex] as any)?.layers ?? 1);
                      applyMiniShiftAfterEndTurn(layerCount);
                      enterLayer(state, currentLayer);
                      revealWholeLayer(state, currentLayer);
                      recompute(state);
                      setMessage("Turn ended.");
                      setState({ ...state });
                    }}
                  >
                    End turn
                  </button>

                  <button
                    className="btn"
                    onClick={() => {
                      if (!state) return;
                      revealWholeLayer(state, currentLayer);
                      recompute(state);
                      setMessage("Forced reveal layer + recomputed reachability.");
                      setState({ ...state });
                    }}
                  >
                    Force reveal
                  </button>

                  <button className="btn" onClick={() => setScreen("setup")}>
                    Exit
                  </button>
                </div>
              </div>
            </div>

            {/* invisible sizing box to enforce square fit */}
            <div className="boardBoxSizer" ref={boardBoxRef} aria-hidden="true" />
          </div>

          {/* Bottom minis */}
          <div className="miniRow">
            <MiniBoardCard
              title="Below"
              layer={currentLayer - 1}
              validLayer={currentLayer - 1 >= 1}
              state={state}
              currentLayer={currentLayer}
              showPlayer={false}
              miniShiftLeft={miniShiftLeft}
            />
            <MiniBoardCard
              title="Current"
              layer={currentLayer}
              validLayer={true}
              state={state}
              currentLayer={currentLayer}
              showPlayer={true}
              miniShiftLeft={miniShiftLeft}
            />
            <MiniBoardCard
              title="Above"
              layer={currentLayer + 1}
              validLayer={
                currentLayer + 1 <= Number((scenarios[scenarioIndex] as any)?.layers ?? 1)
              }
              state={state}
              currentLayer={currentLayer}
              showPlayer={false}
              miniShiftLeft={miniShiftLeft}
            />
          </div>

          {/* Small status (optional) */}
          <div className="bottomHint">
            <div className="muted">{message}</div>
            <div className="muted">Moves: {moveCount}</div>
            <div className="muted">
              Goal: {String(posId((scenarios[scenarioIndex] as any)?.goal ?? { layer: 1, row: 1, col: 1 }))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   Custom Player
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

      <button className="btn" style={{ marginTop: 10 }} onClick={() => props.onUse(name.trim() || "Custom Player", img)}>
        Use custom player
      </button>
    </>
  );
}

/* =========================
   Mini board
========================= */
function MiniBoardCard(props: {
  title: string;
  layer: number;
  validLayer: boolean;
  state: GameState | null;
  currentLayer: number;
  showPlayer: boolean;
  miniShiftLeft: Record<number, Record<number, number>>;
}) {
  const pc = props.state?.playerHexId ? idToCoord(props.state.playerHexId) : null;
  const playerRow = pc?.row ?? -1;
  const playerCol = pc?.col ?? -1;

  return (
    <div className="miniCard">
      <div className="miniTitle">{props.title}</div>
      <div className="miniGrid">
        {Array.from({ length: ROW_LENS.length }, (_, rIdx) => {
          const r = rIdx + 1;
          const len = ROW_LENS[rIdx] ?? 7;
          const shiftLeft = props.miniShiftLeft?.[props.layer]?.[r] ?? 0;
          const ordered = rotateCols(len, shiftLeft);

          return (
            <div key={r} className={`miniRowLine ${r % 2 === 0 ? "offset" : ""}`}>
              {Array.from({ length: len }, (_, i) => {
                if (!props.validLayer) return <span key={i} className="miniCell empty" />;
                const c = ordered[i];
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
    </div>
  );
}

/* =========================
   CSS
========================= */
const CSS = `
:root{
  --tileGap: 8px;
  --tileSize: 72px;
  --tileOffset: 40px;

  --r1: rgba(190, 170, 255, .48);
  --r2: rgba(155, 170, 255, .46);
  --r3: rgba(150, 210, 255, .46);
  --r4: rgba(165, 245, 205, .46);
  --r5: rgba(255, 245, 170, .44);
  --r6: rgba(255, 215, 170, .44);
  --r7: rgba(255, 170, 190, .44);
}

*{ box-sizing: border-box; }
html,body{ height:100%; margin:0; }
body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }

.root{
  min-height:100vh;
  background:
    radial-gradient(1200px 900px at 30% 10%, rgba(255,190,240,.55), transparent 55%),
    radial-gradient(1000px 800px at 80% 25%, rgba(160,210,255,.45), transparent 55%),
    radial-gradient(1200px 900px at 55% 65%, rgba(200,170,255,.35), transparent 60%),
    linear-gradient(180deg, #b8a7ff 0%, #cbb6ff 35%, #f0b0cf 100%);
  color: rgba(255,255,255,.92);
}

.shell{
  width: min(1200px, calc(100vw - 28px));
  margin: 0 auto;
  padding: 18px 0 30px;
}

.card{
  border-radius: 18px;
  background: rgba(0,0,0,.16);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 18px 50px rgba(0,0,0,.25);
  padding: 14px;
  backdrop-filter: blur(10px);
}

.inset{ background: rgba(0,0,0,.10); }

.row{ display:flex; align-items:center; gap:10px; flex-wrap: wrap; }

.btn{
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.22);
  background: rgba(0,0,0,.12);
  color: rgba(255,255,255,.92);
  cursor:pointer;
  font-weight: 900;
}
.btn.primary{ background: rgba(255,255,255,.16); border-color: rgba(255,255,255,.30); }
.btn.small{ padding: 6px 8px; border-radius: 10px; font-size: 12px; }

.pill{
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(0,0,0,.10);
  font-weight: 900;
  font-size: 12px;
}
.pillSmall{
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(0,0,0,.10);
  font-weight: 900;
  font-size: 11px;
  opacity: .9;
}

.muted{ opacity: .8; }
.hint{ opacity: .8; font-size: 12px; }

.topRow{ display:flex; justify-content:space-between; align-items:flex-end; gap:12px; flex-wrap:wrap; }
.brand{ font-size: 42px; font-weight: 950; letter-spacing: .2px; }
.h2{ font-size: 14px; font-weight: 900; }
.h3{ font-size: 13px; font-weight: 900; margin-bottom: 10px; }

.grid2{ display:grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 980px){ .grid2{ grid-template-columns: 1fr; } }

.list{ display:grid; gap: 10px; margin-top: 12px; }
.tile{
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.10);
  cursor:pointer;
  display:flex;
  justify-content:space-between;
  gap: 10px;
}
.tile.selected{
  border-color: rgba(255,255,255,.36);
  box-shadow: 0 0 0 3px rgba(255,255,255,.10) inset;
}
.tileTitle{ font-weight: 950; font-size: 12px; margin-bottom: 4px; }
.tileDesc{ font-size: 11px; opacity: .82; line-height: 1.25; }

.startHero{
  margin-top: 14px;
  border-radius: 18px;
  overflow:hidden;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.10);
  min-height: 220px;
  position: relative;
}
.startHero img{
  position:absolute; inset:0;
  width:100%; height:100%;
  object-fit: cover;
}
.startHero::after{
  content:"";
  position:absolute; inset:0;
  background: linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.30));
}
.startHeroLabel{
  position: relative;
  z-index: 1;
  padding: 14px;
  min-height: 220px;
  display:flex;
  align-items:flex-end;
}
.startHeroLabel b{ font-size: 13px; }

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
  width:64px; height:64px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.14);
  display:grid;
  place-items:center;
  overflow:hidden;
  white-space:pre-line;
  font-size: 11px;
  opacity: .9;
}
.preview img{ width:100%; height:100%; object-fit:cover; display:block; }
.field{ display:flex; flex-direction:column; gap:6px; margin-top:10px; }
.field label{ font-size: 11px; opacity:.85; }
.field input{
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.20);
  background: rgba(0,0,0,.18);
  color: rgba(255,255,255,.92);
  outline: none;
  font-weight: 900;
}

/* =========================
   GAME PAGE (the phase UI)
========================= */
.gamePage{
  min-height: 100vh;
  padding: 18px 18px 26px;
  display:flex;
  flex-direction:column;
  gap: 14px;
}

.layerPill{
  align-self: center;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(0,0,0,.20);
  border: 1px solid rgba(255,255,255,.18);
  display:flex;
  gap: 10px;
  align-items: baseline;
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset;
}
.layerPillBig{ font-weight: 950; font-size: 18px; }
.layerPillSmall{ opacity:.8; font-weight: 800; font-size: 12px; }

.boardOuter{
  position: relative;
  width: min(1200px, calc(100vw - 36px));
  margin: 0 auto;
  flex: 1;
  min-height: 0;
  display:flex;
  align-items:center;
  justify-content:center;
}

.boardBoxSizer{
  position:absolute;
  inset: 0;
  pointer-events:none;
}

.boardSquare{
  position: relative;
  border-radius: 20px;
  overflow:hidden;
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 18px 60px rgba(0,0,0,.25);
}

.boardBg{
  position:absolute;
  inset:0;
  background-size: cover;
  background-position:center;
  opacity: .85;
}
.boardBg::after{
  content:"";
  position:absolute; inset:0;
  background:
    radial-gradient(900px 500px at 30% 25%, rgba(255,255,255,.10), transparent 60%),
    radial-gradient(900px 500px at 70% 65%, rgba(255,255,255,.10), transparent 60%),
    linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.20));
}

.boardCenter{
  position: relative;
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

.hexRow{
  display:flex;
  gap: var(--tileGap);
}
.hexRow.offset{
  padding-left: var(--tileOffset);
}

/* HEX TILE */
.hexTile{
  width: var(--tileSize);
  height: calc(var(--tileSize) * 0.92);
  clip-path: polygon(
    25% 6.7%,
    75% 6.7%,
    100% 50%,
    75% 93.3%,
    25% 93.3%,
    0% 50%
  );
  cursor:pointer;
  position:relative;
  user-select:none;

  border: 2px solid rgba(255,255,255,.70);
  background:
    radial-gradient(circle at 30% 28%, rgba(255,255,255,.26), transparent 45%),
    radial-gradient(circle at 70% 75%, rgba(0,0,0,.10), transparent 55%),
    var(--fill, rgba(255,255,255,.18));
  box-shadow:
    0 0 0 2px rgba(255,255,255,.08) inset,
    0 0 18px rgba(255,255,255,.14);
  transition: transform .12s ease, filter .12s ease, box-shadow .18s ease;
  display:flex;
  align-items:center;
  justify-content:center;
}

.hexTile:hover{ transform: translateY(-1px) scale(1.02); filter: brightness(1.05); }

.hexTile[data-row="1"]{ --fill: var(--r1); }
.hexTile[data-row="2"]{ --fill: var(--r2); }
.hexTile[data-row="3"]{ --fill: var(--r3); }
.hexTile[data-row="4"]{ --fill: var(--r4); }
.hexTile[data-row="5"]{ --fill: var(--r5); }
.hexTile[data-row="6"]{ --fill: var(--r6); }
.hexTile[data-row="7"]{ --fill: var(--r7); }

/* Label: two rows, white with black outline */
.hexLabel{
  font-weight: 950;
  font-size: 12px;
  line-height: 1.05;
  color: rgba(255,255,255,.95);
  text-align:center;
  text-shadow:
    -1px -1px 0 rgba(0,0,0,.70),
     1px -1px 0 rgba(0,0,0,.70),
    -1px  1px 0 rgba(0,0,0,.70),
     1px  1px 0 rgba(0,0,0,.70),
     0 0 10px rgba(0,0,0,.35);
}

/* Reachable glow */
.hexTile.reach{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.10) inset,
    0 0 18px rgba(0,200,255,.35),
    0 0 44px rgba(0,200,255,.20);
}

/* Player glow */
.hexTile.player{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.14) inset,
    0 0 24px rgba(76,255,80,.60),
    0 0 70px rgba(76,255,80,.40);
  filter: brightness(1.10);
  z-index: 4;
}

/* Selected outline */
.hexTile.sel{
  outline: 2px solid rgba(255,255,255,.55);
  outline-offset: 2px;
}

/* Not reachable */
.hexTile.notReach{ opacity:.60; filter: saturate(.86) brightness(.92); cursor:not-allowed; }
.hexTile.notReach:hover{ transform:none; }

/* Fog/missing/blocked */
.hexTile.fog{ opacity:.80; filter: saturate(.84) brightness(.94); }
.hexTile.missing{ opacity:.45; filter: grayscale(.70) brightness(.82); }
.hexTile.blocked{ opacity:.70; filter: grayscale(.35) brightness(.90); }

/* Right bar */
.barWrap{
  position:absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  display:flex;
  gap: 10px;
  align-items:center;
}
.layerBar{
  width: 16px;
  height: 340px;
  border-radius: 999px;
  overflow:hidden;
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset;
  display:grid;
  grid-template-rows: repeat(7, 1fr);
}
.barSeg{ opacity: .95; }
.seg1{ background: rgba(255, 92, 120, .95); }
.seg2{ background: rgba(255, 150, 90, .95); }
.seg3{ background: rgba(255, 220, 120, .95); }
.seg4{ background: rgba(120, 235, 170, .95); }
.seg5{ background: rgba(120, 220, 255, .95); }
.seg6{ background: rgba(135, 170, 255, .95); }
.seg7{ background: rgba(200, 140, 255, .95); }
.barSeg.active{
  outline: 1px solid rgba(255,255,255,.25);
  box-shadow: 0 0 16px rgba(255,255,255,.35), 0 0 30px rgba(255,255,255,.18);
}

.barControls{
  display:flex;
  flex-direction:column;
  gap: 8px;
  min-width: 160px;
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

/* Bottom minis */
.miniRow{
  width: min(1200px, calc(100vw - 36px));
  margin: 0 auto;
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.miniCard{
  border-radius: 18px;
  background: rgba(255,255,255,.12);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 18px 50px rgba(0,0,0,.12);
  padding: 12px;
  overflow:hidden;
}
.miniTitle{
  font-weight: 950;
  text-align:center;
  margin-bottom: 10px;
}

.miniGrid{
  display:flex;
  flex-direction:column;
  gap: 8px;
}

.miniRowLine{
  display:flex;
  gap: 8px;
  justify-content:center;
}
.miniRowLine.offset{
  padding-left: 16px;
}

.miniCell{
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.10);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size: 11px;
  font-weight: 950;
  color: rgba(255,255,255,.90);
}
.miniCell.empty{ opacity: .25; }
.miniCell.on{
  border-color: rgba(76,255,80,.75);
  background: rgba(76,255,80,.18);
  box-shadow: 0 0 0 2px rgba(76,255,80,.18) inset, 0 0 16px rgba(76,255,80,.22);
}

/* Bottom hint */
.bottomHint{
  width: min(1200px, calc(100vw - 36px));
  margin: 0 auto;
  display:flex;
  gap: 14px;
  justify-content:space-between;
  opacity: .85;
  font-weight: 900;
}

@media (max-width: 980px){
  .miniRow{ grid-template-columns: 1fr; }
  .barControls{ display:none; } /* optional: keep clean on small screens */
}
`;
