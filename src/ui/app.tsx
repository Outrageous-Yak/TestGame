// src/ui/app.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, endTurn, type ReachMap } from "../engine/api";
import { ROW_LENS, enterLayer, revealHex } from "../engine/board";

/* =========================================================
   Types
========================================================= */
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

type LogEntry = { n: number; id: string; ok: boolean; reason?: string; t: string }; // HH:MM
type Coord = { layer: number; row: number; col: number };

/* =========================================================
   Config
========================================================= */
const BUILD_TAG = "BUILD_TAG_TILES_DEMO_V1";

/** Optional start-screen background (put file in public/images/ui/start-screen.jpg) */
const START_BG_URL = "images/ui/start-screen.jpg";

/**
 * Board BACKGROUND image (put file in public/images/ui/board-bg.png)
 * This is the tower-grid illusion background (NO labels).
 */
const BOARD_BG_URL = "images/ui/board-bg.png";

/* =========================================================
   Helpers
========================================================= */
function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
}

function timeHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** GitHub Pages-safe public URL helper (respects Vite BASE_URL). */
function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const clean = String(p).replace(/^\/+/, "");
  return base + clean;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(toPublicUrl(path));
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

function scenarioLabel(s: any, i: number) {
  return String(s?.name ?? s?.title ?? s?.id ?? `Scenario ${i + 1}`);
}

function getHexFromState(state: GameState | null, id: string): Hex | undefined {
  if (!state) return undefined;
  const m: any = (state as any).hexesById;
  if (m?.get) return m.get(id);
  return (state as any).hexesById?.[id];
}

function isBlockedOrMissing(hex: any): { blocked: boolean; missing: boolean } {
  if (!hex) return { blocked: true, missing: true };
  return { missing: !!hex.missing, blocked: !!hex.blocked };
}

/* =========================================================
   Presets
========================================================= */
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

/* =========================================================
   App
========================================================= */
export default function App() {
  // screens
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode | null>(null);

  // scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);

  // setup choices
  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);
  const [chosenMonsters, setChosenMonsters] = useState<MonsterChoice[]>([]);

  // game state
  const [state, setState] = useState<GameState | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [message, setMessage] = useState<string>("Ready.");
  const [moveCount, setMoveCount] = useState<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [reachMap, setReachMap] = useState<ReachMap>({});
  const reachable = useMemo(() => {
    const set = new Set<string>();
    for (const [k, v] of Object.entries(reachMap)) if (v.reachable) set.add(k);
    return set;
  }, [reachMap]);

  // board sizing: keep it “finished” (no giant empty right side)
  const boardFrameRef = useRef<HTMLDivElement | null>(null);

  // layers count in scenario
  const scenarioLayerCount = useMemo(() => {
    const s: any = scenarios[scenarioIndex];
    return Number(s?.layers ?? 1);
  }, [scenarios, scenarioIndex]);

  // active bar segments (top→bottom visual)
  const barSegments = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);

  /* --------------------------
     Load mode content
  -------------------------- */
  const loadModeContent = useCallback(async (nextMode: Mode) => {
    setMode(nextMode);
    setChosenPlayer(null);
    setChosenMonsters([]);

    const base = nextMode === "kids" ? "kids/" : "";
    const manifest = await fetchJson<Manifest>(`${base}scenarios/manifest.json`);

    const list = await Promise.all(manifest.files.map((f) => loadScenario(`${base}${f}`)));
    setScenarios(list);

    const initialPath = manifest.initial;
    const initialBase = initialPath.split("/").pop()?.replace(".json", "") ?? "";
    const idx = Math.max(
      0,
      list.findIndex((s: any) => String((s as any).id ?? "") === initialBase || String((s as any).name ?? "") === initialBase)
    );
    setScenarioIndex(idx);

    setScreen("select");
  }, []);

  /* --------------------------
     Game helpers
  -------------------------- */
  const recomputeReachability = useCallback((st: GameState) => {
    const rm = getReachability(st);
    setReachMap(rm);
  }, []);

  const revealWholeLayer = useCallback((st: GameState, layer: number) => {
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const len = ROW_LENS[r - 1] ?? 7;
      for (let c = 1; c <= len; c++) {
        revealHex(st, `L${layer}-R${r}-C${c}`);
      }
    }
  }, []);

  const resetRunLog = useCallback(() => {
    setMoveCount(0);
    setLogs([]);
  }, []);

  const logClick = useCallback((id: string, ok: boolean, reason?: string) => {
    setMoveCount((n) => n + 1);
    setLogs((prev) => {
      const entry: LogEntry = { n: prev.length ? prev[0].n + 1 : 1, id, ok, reason, t: timeHHMM() };
      const next = [entry, ...prev];
      return next.slice(0, 200);
    });
  }, []);

  const startScenario = useCallback(
    (idx: number) => {
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
      setMessage("Ready.");

      resetRunLog();
      recomputeReachability(st);
    },
    [scenarios, recomputeReachability, revealWholeLayer, resetRunLog]
  );

  /* --------------------------
     UI actions
  -------------------------- */
  const onExitToSetup = useCallback(() => {
    setScreen("setup");
  }, []);

  const onResetRun = useCallback(() => {
    startScenario(scenarioIndex);
    setMessage("Ready.");
  }, [startScenario, scenarioIndex]);

  const onEndTurn = useCallback(() => {
    if (!state) return;
    const st = state;
    endTurn(st);
    enterLayer(st, currentLayer);
    recomputeReachability(st);
    setState({ ...(st as any) });
    setMessage("Turn ended.");
  }, [state, currentLayer, recomputeReachability]);

  const onForceReveal = useCallback(() => {
    if (!state) return;
    const st = state;
    revealWholeLayer(st, currentLayer);
    recomputeReachability(st);
    setState({ ...(st as any) });
    setMessage("Forced reveal layer + recomputed reachability.");
  }, [state, currentLayer, recomputeReachability, revealWholeLayer]);

  const cycleLayer = useCallback(() => {
    setCurrentLayer((l) => {
      const next = l >= scenarioLayerCount ? 1 : l + 1;
      if (state) enterLayer(state, next);
      return next;
    });
  }, [scenarioLayerCount, state]);

  useEffect(() => {
    if (!state) return;
    enterLayer(state, currentLayer);
    revealWholeLayer(state, currentLayer);
    recomputeReachability(state);
    setState({ ...(state as any) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLayer]);

  /* --------------------------
     Board click (keep gameplay)
  -------------------------- */
  const tryMoveToId = useCallback(
    (id: string) => {
      if (!state) return;

      setSelectedId(id);

      const res = tryMove(state, id);
      if (res.ok) {
        logClick(id, true);

        const newPlayerId = state.playerHexId;
        const newLayer = newPlayerId ? idToCoord(newPlayerId)?.layer ?? currentLayer : currentLayer;

        if (!res.won) {
          endTurn(state);
          enterLayer(state, newLayer);
        }

        setCurrentLayer(newLayer);
        setSelectedId(newPlayerId ?? id);

        recomputeReachability(state);
        setState({ ...(state as any) });

        setMessage(
          res.won
            ? "🎉 You reached the goal!"
            : res.triggeredTransition
            ? "Moved (transition triggered) — turn ended."
            : "Moved — turn ended."
        );
        return;
      } else {
        const reason = res.reason ?? "INVALID";
        setMessage(`Move rejected: ${reason}`);
        logClick(id, false, reason);
        setState({ ...(state as any) });
      }
    },
    [state, currentLayer, recomputeReachability, logClick]
  );

  const playerName = useMemo(() => {
    if (!chosenPlayer) return "—";
    return chosenPlayer.name;
  }, [chosenPlayer]);

  /* =========================================================
     Render
  ========================================================= */
  return (
    <div className="screenRoot">
      <style>{CSS}</style>

      <div className="screenBg" aria-hidden="true" />
      <div className="cloudBg" aria-hidden="true" />

      {/* START */}
      {screen === "start" ? (
        <div className="shell">
          <div className="startCard">
            <div className="startHeader">
              <div className="startTitle">Hex Layers Puzzle</div>
              <div className="startTag">Build: {BUILD_TAG}</div>
            </div>

            <div className="startButtons">
              <button
                className="btn primary"
                onClick={() => loadModeContent("regular").catch((e) => alert(String(e?.message ?? e)))}
              >
                Regular
              </button>
              <button className="btn" onClick={() => loadModeContent("kids").catch((e) => alert(String(e?.message ?? e)))}>
                Kids / Friendly
              </button>
            </div>

            <div className="startHero">
              <img src={toPublicUrl(START_BG_URL)} alt="start" onError={(e) => (e.currentTarget.style.display = "none")} />
              <div className="startHeroOverlay">
                <div className="startHeroLine">Choose a mode → select scenario → choose player → play.</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* SELECT */}
      {screen === "select" ? (
        <div className="shell">
          <div className="cardWide">
            <div className="cardHead">
              <div className="cardTitle">Select scenario</div>
              <div className="pill">{mode ?? "—"}</div>
            </div>

            <div className="selectGrid">
              <div className="selectList">
                {scenarios.map((s: any, i: number) => {
                  const selected = i === scenarioIndex;
                  return (
                    <div
                      key={i}
                      className={"selectTile" + (selected ? " selected" : "")}
                      onClick={() => setScenarioIndex(i)}
                      role="button"
                      tabIndex={0}
                      title={scenarioLabel(s, i)}
                    >
                      <div className="selectTileMain">
                        <div className="selectTileTitle">{scenarioLabel(s, i)}</div>
                        <div className="selectTileDesc">{String(s?.desc ?? s?.description ?? "—")}</div>
                      </div>
                      <div className="selectTileBadge">#{i + 1}</div>
                    </div>
                  );
                })}
              </div>

              <div className="selectSide">
                <div className="selectSideTitle">Selected</div>
                <div className="selectSideBody">
                  <div className="selectSideName">{scenarioLabel(scenarios[scenarioIndex] as any, scenarioIndex)}</div>
                  <div className="selectSideDesc">
                    {String((scenarios[scenarioIndex] as any)?.desc ?? (scenarios[scenarioIndex] as any)?.description ?? "")}
                  </div>
                  <div className="selectSideMeta">
                    Mode: <b>{mode ?? "—"}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="rowActions">
              <button className="btn" onClick={() => setScreen("start")}>
                Back
              </button>
              <button className="btn primary" onClick={() => setScreen("setup")} disabled={!scenarios.length}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* SETUP */}
      {screen === "setup" ? (
        <div className="shell">
          <div className="cardWide">
            <div className="cardHead">
              <div className="cardTitle">Setup</div>
              <div className="pill">
                {mode ?? "—"} · {scenarioLabel(scenarios[scenarioIndex] as any, scenarioIndex)}
              </div>
            </div>

            <div className="setupGrid">
              <div className="setupCol">
                <div className="setupH">Choose your player</div>

                <div className="tileList">
                  {(mode ? getPlayerPresets(mode) : PLAYER_PRESETS_REGULAR).map((p) => {
                    const isSel = chosenPlayer?.kind === "preset" && chosenPlayer.id === p.id;
                    return (
                      <div
                        key={p.id}
                        className={"setupTile" + (isSel ? " selected" : "")}
                        onClick={() => setChosenPlayer({ kind: "preset", id: p.id, name: p.name })}
                        role="button"
                        tabIndex={0}
                      >
                        <div>
                          <div className="setupTileTitle">{p.name}</div>
                          <div className="setupTileDesc">{p.blurb}</div>
                        </div>
                        <div className="setupTileBadge">Preset</div>
                      </div>
                    );
                  })}
                </div>

                <div className="customCard">
                  <div className="setupH2">Custom player</div>
                  <CustomPlayer value={chosenPlayer?.kind === "custom" ? chosenPlayer : null} onUse={(v) => setChosenPlayer(v)} />
                </div>
              </div>

              <div className="setupCol">
                <div className="setupH">{monstersLabel(mode ?? "regular")}</div>

                <div className="tileList">
                  {(mode ? getMonsterPresets(mode) : MONSTER_PRESETS_REGULAR).map((m) => {
                    const isSel = chosenMonsters.some((x) => x.kind === "preset" && x.id === m.id);
                    return (
                      <div
                        key={m.id}
                        className={"setupTile" + (isSel ? " selected" : "")}
                        onClick={() => {
                          setChosenMonsters((prev) => {
                            if (isSel) return prev.filter((x) => !(x.kind === "preset" && x.id === m.id));
                            return [...prev, { id: m.id, name: m.name, notes: m.blurb, imageDataUrl: null, kind: "preset" }];
                          });
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div>
                          <div className="setupTileTitle">{m.name}</div>
                          <div className="setupTileDesc">{m.blurb}</div>
                        </div>
                        <div className="setupTileBadge">{isSel ? "Selected" : "Preset"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rowActions spaceBetween">
              <button className="btn" onClick={() => setScreen("select")}>
                Back
              </button>

              <div className="rowInline">
                <div className="hintText">{chosenPlayer ? "Ready." : "Pick a player to continue."}</div>
                <button
                  className="btn primary"
                  disabled={!chosenPlayer || !scenarios.length}
                  onClick={() => {
                    startScenario(scenarioIndex);
                    setScreen("game");
                  }}
                >
                  Start game
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* GAME */}
      {screen === "game" ? (
        <div className="shell shellGame">
          <div className="layout">
            <div className="centerColumn">
              <div className="layerTitleRow">
                <div className="layerTitle" data-layer={currentLayer} onClick={cycleLayer} role="button" tabIndex={0}>
                  Layer {currentLayer}
                  <span className="layerHint">click to change</span>
                </div>
              </div>

              <div className="boardAndBar">
                <div className="boardFrame" ref={boardFrameRef}>
                  <div className="boardBg" style={{ backgroundImage: `url("${toPublicUrl(BOARD_BG_URL)}")` }} />

                  <div className="boardTop">
                    <HexBoard
                      kind="main"
                      activeLayer={currentLayer}
                      state={state}
                      selectedId={selectedId}
                      reachable={reachable}
                      reachMap={reachMap}
                      onCellClick={tryMoveToId}
                      showCoords
                    />
                  </div>

                  <div className="boardBottom">
                    <div className="pill small">Mode: {mode ?? "—"}</div>
                    <div className="pill small">Player: {playerName}</div>

                    <div className="boardBtns">
                      <button className="btn small" onClick={onEndTurn} disabled={!state}>
                        End turn
                      </button>
                      <button className="btn small" onClick={onResetRun} disabled={!state}>
                        Reset
                      </button>
                      <button className="btn small" onClick={onForceReveal} disabled={!state}>
                        Force reveal
                      </button>
                      <button className="btn small" onClick={onExitToSetup}>
                        Exit
                      </button>
                    </div>
                  </div>

                  <div className="boardMessage" aria-live="polite">
                    {message}
                  </div>
                </div>

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

              <div className="miniRow">
                <MiniPanel title="Below" tone="below" layer={currentLayer - 1} maxLayer={scenarioLayerCount}>
                  <HexBoard
                    kind="mini"
                    activeLayer={Math.max(1, currentLayer - 1)}
                    state={state}
                    selectedId={null}
                    reachable={new Set()}
                    reachMap={{}}
                    onCellClick={undefined}
                    showCoords={false}
                  />
                </MiniPanel>

                <MiniPanel title="Current" tone="current" layer={currentLayer} maxLayer={scenarioLayerCount}>
                  <HexBoard
                    kind="mini"
                    activeLayer={currentLayer}
                    state={state}
                    selectedId={null}
                    reachable={new Set()}
                    reachMap={{}}
                    onCellClick={undefined}
                    showCoords={false}
                    showPlayerOnMini
                  />
                </MiniPanel>

                <MiniPanel title="Above" tone="above" layer={currentLayer + 1} maxLayer={scenarioLayerCount}>
                  <HexBoard
                    kind="mini"
                    activeLayer={Math.min(scenarioLayerCount, currentLayer + 1)}
                    state={state}
                    selectedId={null}
                    reachable={new Set()}
                    reachMap={{}}
                    onCellClick={undefined}
                    showCoords={false}
                  />
                </MiniPanel>
              </div>

              <div className="tinyMeta">
                Moves: <b>{moveCount}</b> · Selected: <b>{selectedId ?? "—"}</b>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   Components
========================================================= */

function CustomPlayer(props: {
  value: { kind: "custom"; name: string; imageDataUrl: string | null } | null;
  onUse: (v: { kind: "custom"; name: string; imageDataUrl: string | null }) => void;
}) {
  const [name, setName] = useState(props.value?.name ?? "");
  const [img, setImg] = useState<string | null>(props.value?.imageDataUrl ?? null);

  useEffect(() => {
    setName(props.value?.name ?? "");
    setImg(props.value?.imageDataUrl ?? null);
  }, [props.value?.name, props.value?.imageDataUrl]);

  return (
    <div className="customWrap">
      <div className="dropZone">
        <div className="previewBox">{img ? <img src={img} alt="custom" /> : <div className="previewText">Drop Image</div>}</div>
        <div className="dropRight">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name..." />

          <div className="rowInline">
            <label className="btn small" style={{ cursor: "pointer" }}>
              Upload
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await readFileAsDataURL(f);
                  setImg(url);
                }}
              />
            </label>

            <button className="btn small" onClick={() => props.onUse({ kind: "custom", name: name.trim() || "Custom Player", imageDataUrl: img })}>
              Use custom
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPanel(props: {
  title: string;
  tone: "below" | "current" | "above";
  layer: number;
  maxLayer: number;
  children: React.ReactNode;
}) {
  const { title, tone, layer, maxLayer, children } = props;

  const invalid = layer < 1 ? "NO LAYER BELOW" : layer > maxLayer ? "NO LAYER ABOVE" : null;

  return (
    <div className={"miniPanel " + `tone-${tone}`} title={invalid ?? `Layer ${layer}`}>
      <div className="miniHeader">
        <div className="miniHeaderTitle">{title}</div>
      </div>

      <div className="miniBody">{invalid ? <div className="miniInvalid">{invalid}</div> : children}</div>
    </div>
  );
}

function HexBoard(props: {
  kind: "main" | "mini";
  activeLayer: number;
  state: GameState | null;
  selectedId: string | null;
  reachable: Set<string>;
  reachMap: ReachMap;
  onCellClick?: (id: string) => void;
  showCoords: boolean;
  showPlayerOnMini?: boolean;
}) {
  const { kind, activeLayer, state, selectedId, reachable, reachMap, onCellClick, showCoords, showPlayerOnMini } = props;

  const playerId = state?.playerHexId ?? null;

  return (
    <div className={"hexBoard " + (kind === "main" ? "hexBoardMain" : "hexBoardMini")} data-layer={activeLayer}>
      {ROW_LENS.map((len, rIdx) => {
        const row = rIdx + 1;
        const odd = row % 2 === 1;
        return (
          <div key={row} className={"hexRow" + (odd ? " odd" : " even")} data-row={row}>
            {Array.from({ length: len }, (_, cIdx) => {
              const col = cIdx + 1;
              const id = `L${activeLayer}-R${row}-C${col}`;

              const hex = getHexFromState(state, id) as any;
              const { blocked, missing } = isBlockedOrMissing(hex);

              const isSel = selectedId === id;
              const isPlayer = playerId === id && (kind === "main" || showPlayerOnMini);
              const canMove = !!reachMap[id]?.reachable;
              const isReach = reachable.has(id);

              return (
                <div
                  key={id}
                  className={
                    "hex" +
                    (isSel ? " sel" : "") +
                    (isPlayer ? " player" : "") +
                    (isReach ? " reach" : "") +
                    (!canMove && kind === "main" && !isPlayer ? " notReach" : "") +
                    (blocked ? " blocked" : "") +
                    (missing ? " missing" : "")
                  }
                  data-row={row}
                  data-layer={activeLayer}
                  onClick={onCellClick ? () => onCellClick(id) : undefined}
                  role={onCellClick ? "button" : undefined}
                  tabIndex={onCellClick ? 0 : undefined}
                  title={showCoords ? `L${activeLayer} R${row} C${col}` : undefined}
                >
                  {showCoords ? (
                    <span className="hexLabel">
                      <div>R{row}</div>
                      <div>C{col}</div>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   CSS
========================================================= */
const CSS = `
:root{
  --ink: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.70);

  --radius: 18px;

  /* Active bar segment colors (bottom=1 red ... top=7 violet) */
  --L1: rgba(255, 92, 120, .95);
  --L2: rgba(255, 150, 90, .95);
  --L3: rgba(255, 220, 120, .95);
  --L4: rgba(120, 235, 170, .95);
  --L5: rgba(120, 220, 255, .95);
  --L6: rgba(135, 170, 255, .95);
  --L7: rgba(200, 140, 255, .95);
}

*{ box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }

.screenRoot{
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* overall sky */
.screenBg{
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1200px 900px at 30% 10%, rgba(255,190,240,.55), transparent 55%),
    radial-gradient(1000px 800px at 80% 25%, rgba(160,210,255,.45), transparent 55%),
    radial-gradient(1200px 900px at 55% 65%, rgba(200,170,255,.35), transparent 60%),
    linear-gradient(180deg, #b8a7ff 0%, #cbb6ff 35%, #f0b0cf 100%);
  z-index: 0;
}

/* cloud mass */
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
  z-index: 1;
}

/* shared shell */
.shell{
  position: relative;
  z-index: 2;
  height: 100%;
  padding: 24px 24px 18px;
  display: grid;
  place-items: start center;
}

/* --- Start card --- */
.startCard{
  width: min(980px, calc(100vw - 48px));
  border-radius: 22px;
  padding: 18px;
  background: rgba(255,255,255,.10);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 25px 70px rgba(0,0,0,.18);
  overflow: hidden;
}
.startHeader{
  display:flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.startTitle{
  font-weight: 1000;
  letter-spacing: .3px;
  color: rgba(255,255,255,.95);
  font-size: 34px;
}
.startTag{
  font-weight: 900;
  color: rgba(255,255,255,.75);
  background: rgba(0,0,0,.20);
  padding: 8px 12px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset;
}
.startButtons{
  margin-top: 14px;
  display:flex;
  gap: 10px;
  flex-wrap: wrap;
}
.startHero{
  margin-top: 14px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(0,0,0,.12);
  height: 240px;
  position: relative;
}
.startHero img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit: cover;
  display:block;
}
.startHeroOverlay{
  position:absolute;
  inset:0;
  display:flex;
  align-items:flex-end;
  padding: 14px;
  background: linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.45));
}
.startHeroLine{
  font-weight: 900;
  color: rgba(255,255,255,.92);
  text-shadow: 0 2px 12px rgba(0,0,0,.35);
}

/* generic card */
.cardWide{
  width: min(1080px, calc(100vw - 48px));
  border-radius: 22px;
  padding: 16px;
  background: rgba(255,255,255,.10);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 25px 70px rgba(0,0,0,.18);
}
.cardHead{
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.cardTitle{
  font-size: 18px;
  font-weight: 1000;
  color: rgba(255,255,255,.94);
}

/* buttons */
.btn{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.18);
  color: rgba(255,255,255,.92);
  font-weight: 950;
  cursor:pointer;
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset, 0 18px 40px rgba(0,0,0,.16);
}
.btn:hover{ filter: brightness(1.06); border-color: rgba(255,255,255,.28); }
.btn:disabled{ opacity: .55; cursor: not-allowed; }
.btn.primary{
  border-color: rgba(255,255,255,.30);
  background: linear-gradient(135deg, rgba(200,140,255,.45), rgba(120,220,255,.30));
}
.btn.small{
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12px;
}

/* pills */
.pill{
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(0,0,0,.18);
  box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset;
  color: rgba(255,255,255,.82);
  font-weight: 900;
}
.pill.small{
  padding: 6px 10px;
  font-size: 12px;
}

.hintText{
  color: rgba(255,255,255,.80);
  font-weight: 900;
}

/* select screen */
.selectGrid{
  display:grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 14px;
}
.selectList{
  display:grid;
  gap: 10px;
}
.selectTile{
  display:flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  cursor: pointer;
  background: rgba(0,0,0,.12);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset;
}
.selectTile.selected{
  border-color: rgba(255,255,255,.28);
  box-shadow: 0 0 0 3px rgba(255,255,255,.10) inset, 0 18px 40px rgba(0,0,0,.14);
}
.selectTileTitle{ font-weight: 1000; color: rgba(255,255,255,.94); }
.selectTileDesc{ color: rgba(255,255,255,.75); margin-top: 4px; line-height: 1.25; }
.selectTileBadge{ color: rgba(255,255,255,.70); font-weight: 1000; }
.selectSide{
  border-radius: 18px;
  padding: 14px;
  background: rgba(0,0,0,.14);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset;
}
.selectSideTitle{ font-weight: 1000; color: rgba(255,255,255,.90); margin-bottom: 10px; }
.selectSideName{ font-weight: 1000; color: rgba(255,255,255,.95); font-size: 16px; }
.selectSideDesc{ margin-top: 8px; color: rgba(255,255,255,.78); line-height: 1.35; }
.selectSideMeta{ margin-top: 12px; color: rgba(255,255,255,.75); }

/* setup */
.setupGrid{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.setupCol{
  border-radius: 18px;
  padding: 14px;
  background: rgba(0,0,0,.14);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset;
}
.setupH{
  font-weight: 1000;
  color: rgba(255,255,255,.92);
  margin-bottom: 10px;
}
.setupH2{
  font-weight: 1000;
  color: rgba(255,255,255,.88);
  margin-bottom: 10px;
}
.tileList{
  display:grid;
  gap: 10px;
}
.setupTile{
  display:flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  cursor: pointer;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset;
}
.setupTile.selected{
  border-color: rgba(255,255,255,.28);
  box-shadow: 0 0 0 3px rgba(255,255,255,.10) inset, 0 18px 40px rgba(0,0,0,.14);
}
.setupTileTitle{ font-weight: 1000; color: rgba(255,255,255,.94); }
.setupTileDesc{ color: rgba(255,255,255,.75); margin-top: 4px; line-height: 1.25; }
.setupTileBadge{ color: rgba(255,255,255,.70); font-weight: 1000; }

.customCard{
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,.12);
}
.dropZone{
  display:flex;
  gap: 12px;
  align-items: center;
  border-radius: 16px;
  background: rgba(255,255,255,.06);
  border: 1px dashed rgba(255,255,255,.18);
  padding: 12px;
}
.previewBox{
  width: 68px;
  height: 68px;
  border-radius: 16px;
  overflow:hidden;
  background: rgba(0,0,0,.20);
  border: 1px solid rgba(255,255,255,.14);
  display:grid;
  place-items: center;
  flex: 0 0 auto;
}
.previewBox img{ width:100%; height:100%; object-fit: cover; display:block; }
.previewText{ color: rgba(255,255,255,.75); font-weight: 900; font-size: 12px; text-align:center; white-space: pre-line; }
.dropRight{ flex: 1; min-width: 200px; display:flex; flex-direction: column; gap: 8px; }
.label{ color: rgba(255,255,255,.78); font-weight: 900; font-size: 12px; }
.input{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.18);
  color: rgba(255,255,255,.92);
  font-weight: 900;
  outline: none;
}
.input:focus{ border-color: rgba(255,255,255,.30); }

/* actions */
.rowActions{
  display:flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}
.rowActions.spaceBetween{
  justify-content: space-between;
}
.rowInline{
  display:flex;
  align-items:center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ===========================
   GAME LAYOUT (like screenshots)
=========================== */
.shellGame{
  width: 100%;
  padding: 24px 24px 18px;
  display:block;
}
.layout{
  position: relative;
  z-index: 1;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr minmax(760px, 1080px) 1fr;
  padding: 0;
}
.centerColumn{
  grid-column: 2;
  display: grid;
  grid-template-rows: auto auto auto auto;
  align-items: start;
  gap: 14px;
}

.layerTitleRow{
  display: flex;
  justify-content: center;
}
.layerTitle{
  user-select: none;
  cursor: pointer;
  padding: 10px 16px;
  border-radius: 999px;
  color: var(--ink);
  letter-spacing: .2px;
  font-weight: 1000;
  background: rgba(0,0,0,.22);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 18px 40px rgba(0,0,0,.22);
  display: inline-flex;
  gap: 10px;
  align-items: baseline;
}
.layerHint{
  font-size: 12px;
  font-weight: 900;
  color: rgba(255,255,255,.70);
}

.boardAndBar{
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  align-items: start;
  gap: 18px;
}

.boardFrame{
  position: relative;
  border-radius: 18px;
  background: rgba(255,255,255,.08);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.16) inset,
    0 25px 60px rgba(0,0,0,.18);
  overflow:hidden;

  width: max-content;
  padding: 14px 14px 52px;
  display: grid;
  place-items: center;
}

.boardBg{
  position:absolute;
  inset:0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: .92;
}
.boardBg::after{
  content:"";
  position:absolute;
  inset:0;
  background:
    radial-gradient(900px 520px at 20% 20%, rgba(255,255,255,.10), transparent 60%),
    radial-gradient(900px 520px at 80% 70%, rgba(255,255,255,.10), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.14));
}

.boardTop{
  position: relative;
  z-index: 1;
}

.boardBottom{
  position:absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  display:flex;
  justify-content: space-between;
  align-items:center;
  gap: 10px;
  flex-wrap: wrap;

  padding: 10px;
  border-radius: 16px;
  background: rgba(255,255,255,.16);
  box-shadow: 0 0 0 1px rgba(255,255,255,.18) inset;
  backdrop-filter: blur(8px);
}
.boardBtns{
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
}

.boardMessage{
  position:absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  padding: 8px 10px;
  border-radius: 999px;
  font-weight: 1000;
  color: rgba(255,255,255,.88);
  background: rgba(0,0,0,.18);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset;
  max-width: calc(100% - 20px);
  white-space: nowrap;
  overflow:hidden;
  text-overflow: ellipsis;
}

/* BAR */
.barWrap{
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 6px;
}
.layerBar{
  width: 18px;
  height: 360px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(0,0,0,.18);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 18px 40px rgba(0,0,0,.22);
  display: grid;
  grid-template-rows: repeat(7, 1fr);
}
.barSeg{ opacity: .95; }

.barSeg[data-layer="1"]{ background: var(--L1); }
.barSeg[data-layer="2"]{ background: var(--L2); }
.barSeg[data-layer="3"]{ background: var(--L3); }
.barSeg[data-layer="4"]{ background: var(--L4); }
.barSeg[data-layer="5"]{ background: var(--L5); }
.barSeg[data-layer="6"]{ background: var(--L6); }
.barSeg[data-layer="7"]{ background: var(--L7); }

.barSeg.isActive{
  position: relative;
  z-index: 2;
  outline: 1px solid rgba(255,255,255,.25);
}
.barSeg.isActive::after{
  content: "";
  position: absolute;
  inset: -8px;
  background: inherit;
  filter: blur(12px);
  opacity: .95;
  pointer-events: none;
  border-radius: 999px;
}

/* ===== HEX BOARD GEOMETRY (CONNECTED HONEYCOMB) ===== */
.hexBoard{
  --hexW: 74px;
  --hexH: calc(var(--hexW) * 0.8660254);
  display: grid;
  justify-content: center;
  gap: 0;
  user-select: none;
  width: max-content;
}

.hexBoardMain{
  --hexW: 82px;
}
.hexBoardMini{
  --hexW: 24px;
}

.hexRow{
  display: flex;
  height: var(--hexH);
  align-items: center;
  justify-content: center;
}
.hexRow.odd{
  margin-left: calc(var(--hexW) * 0.5);
}

.hex{
  width: var(--hexW);
  height: var(--hexH);
  margin-right: calc(var(--hexW) * -0.25);
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
  position: relative;

  background: rgba(255,255,255,.10);
  border: 1px solid rgba(255,255,255,.16);
  box-shadow: 0 6px 16px rgba(0,0,0,.10);
  cursor: default;
}
.hexBoardMain .hex{ cursor: pointer; }

.hex[data-row="1"]{ background: rgba(200, 140, 255, .28); }
.hex[data-row="2"]{ background: rgba(165, 175, 255, .28); }
.hex[data-row="3"]{ background: rgba(135, 205, 255, .28); }
.hex[data-row="4"]{ background: rgba(120, 235, 170, .24); }
.hex[data-row="5"]{ background: rgba(255, 220, 120, .22); }
.hex[data-row="6"]{ background: rgba(255, 155, 105, .22); }
.hex[data-row="7"]{ background: rgba(255, 92, 120, .24); }

.hexLabel{
  font-size: 12px;
  font-weight: 1000;
  color: rgba(255,255,255,.96);
  text-align:center;
  line-height: 1.05;
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-shadow:
    -1px -1px 0 rgba(0,0,0,.70),
     1px -1px 0 rgba(0,0,0,.70),
    -1px  1px 0 rgba(0,0,0,.70),
     1px  1px 0 rgba(0,0,0,.70),
     0 0 10px rgba(0,0,0,.30);
}

/* reachable = blue glow */
.hex.reach{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.12) inset,
    0 0 18px rgba(0,200,255,.42),
    0 0 44px rgba(0,200,255,.22);
  filter: brightness(1.03);
}

/* player = green glow */
.hex.player{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.18) inset,
    0 0 26px rgba(76,255,80,.70),
    0 0 80px rgba(76,255,80,.45);
  filter: brightness(1.12);
  z-index: 4;
}

.hex.sel{
  outline: 2px solid rgba(255,255,255,.55);
  outline-offset: 2px;
}

.hex.notReach{
  opacity: .58;
  filter: saturate(.86) brightness(.92);
  cursor: not-allowed;
}
.hex.notReach:hover{ filter: saturate(.86) brightness(.92); }

.hex.blocked{ opacity: .70; filter: grayscale(.35) brightness(.90); }
.hex.missing{ opacity: .45; filter: grayscale(.70) brightness(.82); }

/* ===== MINI BOARDS (TILTED LIKE YOUR REF IMAGE) ===== */
.miniRow{
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 18px;
  align-items: start;
  padding-bottom: 4px;
}

.miniPanel{
  border-radius: 18px;
  padding: 10px 10px 12px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 18px 40px rgba(0,0,0,.14);

  /* Tilt scaffold */
  perspective: 900px;
  transform-style: preserve-3d;
  position: relative;
  overflow: hidden;
}

/* shadow/base under panel (platform feel) */
.miniPanel::after{
  content:"";
  position:absolute;
  left: 10%;
  right: 10%;
  bottom: 10px;
  height: 18px;
  background: radial-gradient(closest-side, rgba(0,0,0,.28), transparent 70%);
  opacity: .55;
  pointer-events:none;
}

.miniHeader{
  text-align: center;
  font-weight: 1000;
  letter-spacing: .4px;
  color: rgba(255,255,255,.92);
  padding: 8px 10px;
  border-radius: 14px;
  margin-bottom: 10px;
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset;
  transform: translateZ(1px);
}

.miniBody{
  padding: 8px 8px 10px;
  border-radius: 14px;
  background: rgba(255,255,255,.10);
  box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset;
  display:flex;
  justify-content:center;

  /* actual tilt */
  transform: rotateX(16deg) rotateZ(-2deg);
  transform-origin: 50% 40%;
  filter: drop-shadow(0 18px 28px rgba(0,0,0,.22));
}

.miniInvalid{
  padding: 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.16);
  color: rgba(255,255,255,.88);
  font-weight: 1000;
}

/* below=yellow, current=green, above=blue */
.tone-below{
  background: linear-gradient(180deg, rgba(255, 220, 120, .55), rgba(255, 220, 120, .32));
}
.tone-below .miniHeader{
  background: rgba(120, 90, 20, .40);
}

.tone-current{
  background: linear-gradient(180deg, rgba(120,235,170,.55), rgba(120,235,170,.30));
}
.tone-current .miniHeader{
  background: rgba(20, 80, 55, .45);
}

.tone-above{
  background: linear-gradient(180deg, rgba(120, 220, 255, .55), rgba(120, 220, 255, .32));
}
.tone-above .miniHeader{
  background: rgba(20, 55, 90, .42);
}

/* Tiny meta */
.tinyMeta{
  text-align:center;
  color: rgba(255,255,255,.80);
  font-weight: 900;
  padding-top: 4px;
}

/* Responsive */
@media (max-height: 820px){
  .layerBar{ height: 300px; }
  .hexBoardMain{ --hexW: 74px; }
}
@media (max-width: 1080px){
  .layout{ grid-template-columns: 16px 1fr 16px; }
}
@media (max-width: 980px){
  .miniRow{ grid-template-columns: 1fr; }
  .selectGrid{ grid-template-columns: 1fr; }
  .setupGrid{ grid-template-columns: 1fr; }
}
`;

