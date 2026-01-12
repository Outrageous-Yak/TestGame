// src/ui/app.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";

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

type Coord = { layer: number; row: number; col: number };

/* =========================================================
   Config
========================================================= */
const BUILD_TAG = "BUILD_TAG_TILES_DEMO_V1";
const GAME_BG_URL = "images/ui/board-bg.png";

/* =========================================================
   Helpers
========================================================= */
function idToCoord(id: string): Coord | null {
  const m = /^L(\d+)-R(\d+)-C(\d+)$/.exec(id);
  if (!m) return null;
  return { layer: Number(m[1]), row: Number(m[2]), col: Number(m[3]) };
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
   Minimal presets
========================================================= */
const PLAYER_PRESETS_REGULAR = [
  { id: "p1", name: "Aeris" },
  { id: "p2", name: "Devlan" },
];

function scenarioLabel(s: any, i: number) {
  return String(s?.name ?? s?.title ?? s?.id ?? `Scenario ${i + 1}`);
}

/* =========================================================
   Dice mapping
========================================================= */
// We keep all 6 outcomes so it "is" a real dice.
// Only 3 faces contain mini boards right now (top/front/right).
function rotForRoll(n: number) {
  // Convention:
  // 1=top, 6=bottom, 2=front, 5=back, 3=right, 4=left
  // We set rotations so the "rolled" face becomes FRONT-facing.
  // (Top face is still visible due to the base camera tilt.)
  switch (n) {
    case 1:
      return { x: -90, y: 0 };
    case 2:
      return { x: 0, y: 0 };
    case 3:
      return { x: 0, y: -90 };
    case 4:
      return { x: 0, y: 90 };
    case 5:
      return { x: 0, y: 180 };
    case 6:
      return { x: 90, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

/* =========================================================
   App
========================================================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode | null>(null);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState<number>(0);

  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);

  const [state, setState] = useState<GameState | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [reachMap, setReachMap] = useState<ReachMap>({});
  const reachable = useMemo(() => {
    const set = new Set<string>();
    for (const [k, v] of Object.entries(reachMap)) if (v.reachable) set.add(k);
    return set;
  }, [reachMap]);

  const scenarioLayerCount = useMemo(() => {
    const s: any = scenarios[scenarioIndex];
    return Number(s?.layers ?? 1);
  }, [scenarios, scenarioIndex]);

  // 7..1 top-to-bottom
  const barSegments = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);

  // Horizontal scroll container (shows a bottom scrollbar)
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------
     Dice state
  -------------------------- */
  const [rollValue, setRollValue] = useState<number>(1);
  const [diceRot, setDiceRot] = useState<{ x: number; y: number }>({ x: -26, y: -38 }); // base tilt so TOP is visible
  const [diceSpinning, setDiceSpinning] = useState(false);

  const belowLayer = currentLayer - 1;
  const aboveLayer = currentLayer + 1;

  const rollDice = useCallback(() => {
    const n = 1 + Math.floor(Math.random() * 6);
    setRollValue(n);

    const targetFace = rotForRoll(n);

    // keep the "camera" tilt so you see TOP, FRONT, RIGHT at once
    const base = { x: -26, y: -38 };
    const final = { x: base.x + targetFace.x, y: base.y + targetFace.y };

    setDiceSpinning(true);

    // big spin then settle
    const extraX = 360 * (1 + Math.floor(Math.random() * 2)); // 360 or 720
    const extraY = 360 * (2 + Math.floor(Math.random() * 2)); // 720 or 1080

    setDiceRot({ x: final.x - extraX, y: final.y - extraY });
    window.setTimeout(() => {
      setDiceRot(final);
      window.setTimeout(() => setDiceSpinning(false), 650);
    }, 40);
  }, []);

  /* --------------------------
     Load mode content
  -------------------------- */
  const loadModeContent = useCallback(async (nextMode: Mode) => {
    setMode(nextMode);
    setChosenPlayer(null);

    const base = nextMode === "kids" ? "kids/" : "";
    const manifest = await fetchJson<Manifest>(`${base}scenarios/manifest.json`);
    const list = await Promise.all(manifest.files.map((f) => loadScenario(`${base}${f}`)));

    setScenarios(list);

    const initialBase = manifest.initial.split("/").pop()?.replace(".json", "") ?? "";
    const idx = Math.max(
      0,
      list.findIndex(
        (s: any) => String((s as any).id ?? "") === initialBase || String((s as any).name ?? "") === initialBase
      )
    );
    setScenarioIndex(idx);

    setScreen("select");
  }, []);

  /* --------------------------
     Game helpers
  -------------------------- */
  const recomputeReachability = useCallback((st: GameState) => {
    setReachMap(getReachability(st));
  }, []);

  const revealWholeLayer = useCallback((st: GameState, layer: number) => {
    for (let r = 1; r <= ROW_LENS.length; r++) {
      const len = ROW_LENS[r - 1] ?? 7;
      for (let c = 1; c <= len; c++) revealHex(st, `L${layer}-R${r}-C${c}`);
    }
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
      recomputeReachability(st);

      setState(st);
      setSelectedId(pid);
      setCurrentLayer(layer);

      // reset dice view
      setRollValue(1);
      setDiceRot({ x: -26, y: -38 });
      setDiceSpinning(false);

      // reset horizontal scroll to left
      window.setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = 0;
      }, 0);
    },
    [scenarios, revealWholeLayer, recomputeReachability]
  );

  /* --------------------------
     Board click
  -------------------------- */
  const tryMoveToId = useCallback(
    (id: string) => {
      if (!state) return;

      setSelectedId(id);

      const res = tryMove(state, id);
      if (res.ok) {
        const newPlayerId = state.playerHexId;
        const newLayer = newPlayerId ? idToCoord(newPlayerId)?.layer ?? currentLayer : currentLayer;

        if (!res.won) {
          endTurn(state);
          enterLayer(state, newLayer);
          revealWholeLayer(state, newLayer);
        }

        setCurrentLayer(newLayer);
        setSelectedId(newPlayerId ?? id);

        recomputeReachability(state);
        setState({ ...(state as any) });
      } else {
        recomputeReachability(state);
        setState({ ...(state as any) });
      }
    },
    [state, currentLayer, recomputeReachability, revealWholeLayer]
  );

  return (
    <div className="appRoot">
      <style>{CSS}</style>

      <div className="globalBg" aria-hidden="true" style={{ backgroundImage: `url("${toPublicUrl(GAME_BG_URL)}")` }} />
      <div className="globalBgOverlay" aria-hidden="true" />

      {/* START */}
      {screen === "start" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitleBig">Hex Layers</div>
            <div className="cardMeta">Build: {BUILD_TAG}</div>

            <div className="row">
              <button className="btn primary" onClick={() => loadModeContent("regular").catch((e) => alert(String(e?.message ?? e)))}>
                Regular
              </button>
              <button className="btn" onClick={() => loadModeContent("kids").catch((e) => alert(String(e?.message ?? e)))}>
                Kids / Friendly
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* SELECT */}
      {screen === "select" ? (
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitle">Select scenario</div>

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
                  >
                    <div className="selectTileTitle">{scenarioLabel(s, i)}</div>
                    <div className="selectTileDesc">{String(s?.desc ?? s?.description ?? "")}</div>
                  </div>
                );
              })}
            </div>

            <div className="row rowEnd">
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
        <div className="shell shellCard">
          <div className="card">
            <div className="cardTitle">Choose player</div>

            <div className="selectList">
              {PLAYER_PRESETS_REGULAR.map((p) => {
                const isSel = chosenPlayer?.kind === "preset" && chosenPlayer.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={"selectTile" + (isSel ? " selected" : "")}
                    onClick={() => setChosenPlayer({ kind: "preset", id: p.id, name: p.name })}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="selectTileTitle">{p.name}</div>
                    <div className="selectTileDesc">Preset</div>
                  </div>
                );
              })}
            </div>

            <div className="row rowBetween">
              <button className="btn" onClick={() => setScreen("select")}>
                Back
              </button>
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
      ) : null}

      {/* GAME */}
      {screen === "game" ? (
        <div className="shell shellGame">
          {/* ✅ This container provides the LEFT→RIGHT scrollbar at the very bottom */}
          <div className="scrollStage" ref={scrollRef}>
            <div className="scrollInner">
              <div className="gameLayout">
                <SideBar side="left" currentLayer={currentLayer} segments={barSegments} />

                <div className="mainBoardWrap">
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

                <SideBar side="right" currentLayer={currentLayer} segments={barSegments} />

                {/* ✅ Dice OUTER RIGHT of the 2nd bar */}
                <div className="diceArea">
                  <div className="diceCubeWrap" aria-label="Layer dice">
                    <div
                      className={"diceCube" + (diceSpinning ? " isSpinning" : "")}
                      style={{ transform: `rotateX(${diceRot.x}deg) rotateY(${diceRot.y}deg)` }}
                    >
                      {/* TOP (mini: ABOVE) */}
                      <div className="diceFace faceTop">
                        <div className="diceFaceInner">
                          <HexBoard
                            kind="mini"
                            activeLayer={Math.min(scenarioLayerCount, aboveLayer)}
                            state={state}
                            selectedId={null}
                            reachable={new Set()}
                            reachMap={{}}
                            showCoords={false}
                            onCellClick={undefined}
                            showPlayerOnMini={false}
                          />
                        </div>
                      </div>

                      {/* FRONT (mini: CURRENT) */}
                      <div className="diceFace faceFront">
                        <div className="diceFaceInner">
                          <HexBoard
                            kind="mini"
                            activeLayer={currentLayer}
                            state={state}
                            selectedId={null}
                            reachable={new Set()}
                            reachMap={{}}
                            showCoords={false}
                            onCellClick={undefined}
                            showPlayerOnMini={true}
                          />
                        </div>
                      </div>

                      {/* RIGHT (mini: BELOW or invalid) */}
                      <div className="diceFace faceRight">
                        <div className="diceFaceInner">
                          {belowLayer < 1 ? (
                            <div className="miniInvalid">NO LAYER BELOW</div>
                          ) : (
                            <HexBoard
                              kind="mini"
                              activeLayer={Math.max(1, belowLayer)}
                              state={state}
                              selectedId={null}
                              reachable={new Set()}
                              reachMap={{}}
                              showCoords={false}
                              onCellClick={undefined}
                              showPlayerOnMini={false}
                            />
                          )}
                        </div>
                      </div>

                      {/* other 3 faces are just glass */}
                      <div className="diceFace faceLeft" />
                      <div className="diceFace faceBack" />
                      <div className="diceFace faceBottom" />
                    </div>
                  </div>

                  <div className="diceControls">
                    <button className="btn primary" onClick={rollDice}>
                      🎲 Roll
                    </button>
                    <div className="diceReadout">= {rollValue}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* (optional) you can put other UI above the scrollbar here later */}
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================
   Side bar
========================================================= */
function SideBar(props: { side: "left" | "right"; currentLayer: number; segments: number[] }) {
  const { side, currentLayer, segments } = props;
  return (
    <div className={"barWrap " + (side === "left" ? "barLeft" : "barRight")} aria-label={`Layer bar ${side}`}>
      <div className="layerBar">
        {segments.map((layerVal) => {
          const active = layerVal === currentLayer;
          return (
            <div key={layerVal} className={"barSeg" + (active ? " isActive" : "")} data-layer={layerVal} title={`Layer ${layerVal}`} />
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   Hex Board
========================================================= */
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
        const isEvenRow = row % 2 === 0;

        return (
          <div key={row} className={"hexRow" + (isEvenRow ? " even" : "")} data-row={row}>
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

  /* bar colors bottom=1 red ... top=7 violet */
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

.appRoot{
  min-height: 100vh;
  position: relative;

  /* allow our inner scrollStage to own the horizontal scrollbar */
  overflow: hidden;

  color: var(--ink);
}

/* ONE global background image */
.globalBg{
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: saturate(1.08) contrast(1.02);
  z-index: 0;
}
.globalBgOverlay{
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 600px at 50% 50%, rgba(255,255,255,.18), transparent 55%),
    linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.24));
  z-index: 1;
}

.shell{
  position: relative;
  z-index: 2;
  padding: 22px;
}

.shellCard{
  display: grid;
  place-items: center;
  min-height: 100vh;
}

.card{
  width: min(980px, calc(100vw - 44px));
  border-radius: 22px;
  padding: 18px;
  background: rgba(255,255,255,.12);
  box-shadow: 0 0 0 1px rgba(255,255,255,.16) inset, 0 25px 70px rgba(0,0,0,.18);
  backdrop-filter: blur(10px);
}

.cardTitleBig{
  font-weight: 1000;
  font-size: 34px;
  letter-spacing: .2px;
}
.cardTitle{
  font-weight: 1000;
  font-size: 18px;
  letter-spacing: .2px;
  margin-bottom: 10px;
}
.cardMeta{
  margin-top: 6px;
  opacity: .82;
  font-weight: 900;
}

.row{ display:flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
.rowEnd{ justify-content: flex-end; }
.rowBetween{ justify-content: space-between; }

.btn{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.20);
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

.selectList{ display:grid; gap: 10px; margin-top: 12px; }
.selectTile{
  border-radius: 16px;
  padding: 12px;
  background: rgba(0,0,0,.16);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08) inset;
  cursor: pointer;
}
.selectTile.selected{
  border-color: rgba(255,255,255,.30);
  box-shadow: 0 0 0 3px rgba(255,255,255,.10) inset, 0 18px 40px rgba(0,0,0,.14);
}
.selectTileTitle{ font-weight: 1000; }
.selectTileDesc{ margin-top: 4px; opacity: .80; line-height: 1.25; }

/* ===========================
   GAME SCREEN
=========================== */
.shellGame{
  min-height: 100vh;
  display: grid;
  place-items: start center;
  padding-top: 18px;
}

/* ✅ Horizontal scrollbar at the bottom */
.scrollStage{
  width: calc(100vw - 44px);
  max-width: 100vw;
  overflow-x: auto;
  overflow-y: hidden;

  /* this keeps the scrollbar visible and "at the bottom of the page" for this view */
  padding-bottom: 16px;

  scrollbar-gutter: stable both-edges;
}
.scrollInner{
  /* make room for the whole layout (board + bars + dice column) */
  min-width: 1380px;
}

/* Shared vars so BOTH bars align to the hex rows */
.gameLayout{
  --rows: 7;
  --hexWMain: 82px;
  --hexHMain: calc(var(--hexWMain) * 0.8660254);

  display: grid;
  grid-template-columns: 62px auto 62px 420px; /* left bar + board + right bar + dice */
  gap: 18px;
  align-items: start;
  justify-content: center;
}

.mainBoardWrap{
  position: relative;
  display: grid;
  justify-items: center;
}

/* ===========================
   BARS (both sides, aligned)
=========================== */
.barWrap{
  display:flex;
  align-items: flex-start;
  justify-content: center;
}

.layerBar{
  width: 18px;
  height: calc(var(--hexHMain) * var(--rows));
  border-radius: 999px;
  overflow: hidden;
  background: rgba(0,0,0,.22);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 18px 40px rgba(0,0,0,.18);
  display: grid;
  grid-template-rows: repeat(7, 1fr);
}

.barSeg{ opacity: .95; position: relative; }
.barSeg[data-layer="1"]{ background: var(--L1); }
.barSeg[data-layer="2"]{ background: var(--L2); }
.barSeg[data-layer="3"]{ background: var(--L3); }
.barSeg[data-layer="4"]{ background: var(--L4); }
.barSeg[data-layer="5"]{ background: var(--L5); }
.barSeg[data-layer="6"]{ background: var(--L6); }
.barSeg[data-layer="7"]{ background: var(--L7); }

.barSeg.isActive{
  outline: 1px solid rgba(255,255,255,.25);
  z-index: 3;
}
.barSeg.isActive::after{
  content: "";
  position: absolute;
  inset: -10px;
  background: inherit;
  filter: blur(14px);
  opacity: .95;
  border-radius: 999px;
}

/* =========================================================
   HEX BOARD GEOMETRY
========================================================= */
.hexBoard{
  --hexW: 74px;
  --hexH: calc(var(--hexW) * 0.8660254);
  --hexGap: 10px;
  --hexOverlap: 0.08;

  --hexPitch: calc(var(--hexW) * (1 - var(--hexOverlap)) + var(--hexGap));

  --maxCols: 7;
  width: calc(var(--hexW) + (var(--maxCols) - 1) * var(--hexPitch));

  display: grid;
  justify-content: center;
  user-select: none;
}

/* Main board uses shared size vars so bars match perfectly */
.hexBoardMain{
  --hexW: var(--hexWMain);
  --hexH: var(--hexHMain);
}

.hexBoardMini{
  --hexW: 24px;
  --hexGap: 5px;
  --hexOverlap: 0.06;
}

.hexRow{
  display: flex;
  width: 100%;
  height: var(--hexH);
  align-items: center;
  justify-content: flex-start;
}

/* even rows step right by half a pitch */
.hexRow.even{
  padding-left: calc(var(--hexPitch) / 2);
}

.hex{
  width: var(--hexW);
  height: var(--hexH);
  margin-right: calc(var(--hexPitch) - var(--hexW));

  clip-path: polygon(
    25% 0%, 75% 0%,
    100% 50%,
    75% 100%, 25% 100%,
    0% 50%
  );

  position: relative;
  background: rgba(255,255,255,.14);

  border: 1px solid rgba(0,0,0,.75);
  box-shadow:
    0 0 0 1px rgba(0,0,0,.35) inset,
    0 6px 16px rgba(0,0,0,.10);

  cursor: default;
}

.hexBoardMain .hex{ cursor: pointer; }

.hexLabel{
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;

  font-weight: 1000;
  letter-spacing: .2px;
  line-height: 1.05;
  text-align: center;

  color: rgba(255,255,255,.98);
  opacity: 1;
  z-index: 3;
  pointer-events: none;

  -webkit-text-stroke: 1px rgba(0,0,0,.75);
  text-shadow:
    -1px -1px 0 rgba(0,0,0,.75),
     1px -1px 0 rgba(0,0,0,.75),
    -1px  1px 0 rgba(0,0,0,.75),
     1px  1px 0 rgba(0,0,0,.75),
     0 0 12px rgba(0,0,0,.45);
}

.hexBoardMain .hexLabel{ font-size: 13px; }
.hexBoardMini .hexLabel{
  font-size: 9px;
  -webkit-text-stroke: .8px rgba(0,0,0,.75);
}

.hex.reach{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.12) inset,
    0 0 18px rgba(0,200,255,.42),
    0 0 44px rgba(0,200,255,.22);
  filter: brightness(1.6);
}

.hex.player{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.18) inset,
    0 0 26px rgba(76,255,80,.70),
    0 0 80px rgba(76,255,80,.45);
  filter: brightness(1.6);
  z-index: 4;
}

.hex.sel{
  outline: 2px solid rgba(255,255,255,.55);
  outline-offset: 2px;
}

/* Never dim label: use overlays only */
.hex.notReach,
.hex.blocked,
.hex.missing{
  opacity: 1;
  filter: none;
}

.hex::before{
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
}

.hex.notReach{ cursor: not-allowed; }
.hex.notReach::before{ background: rgba(0,0,0,.28); opacity: 1; }
.hex.blocked::before{ background: rgba(0,0,0,.34); opacity: 1; }
.hex.missing::before{ background: rgba(0,0,0,.48); opacity: 1; }

/* ===========================
   DICE (3 faces visible + spin)
=========================== */
.diceArea{
  display: grid;
  justify-items: center;
  gap: 14px;
  padding-top: 4px;
}

.diceCubeWrap{
  width: 360px;
  height: 260px;
  display: grid;
  place-items: center;
  perspective: 1000px;
}

.diceCube{
  --s: 210px;
  width: var(--s);
  height: var(--s);
  position: relative;
  transform-style: preserve-3d;
  transition: transform 650ms cubic-bezier(.2,.9,.2,1);
}

.diceCube.isSpinning{
  transition: transform 900ms cubic-bezier(.12,.85,.18,1);
}

.diceFace{
  position: absolute;
  inset: 0;
  border-radius: 18px;
  background: rgba(255,255,255,.08);
  box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset, 0 22px 50px rgba(0,0,0,.16);
  backdrop-filter: blur(8px);
  overflow: hidden;
}

.diceFaceInner{
  position: absolute;
  inset: 10px;
  border-radius: 14px;
  background: rgba(0,0,0,.10);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10) inset;
  display: grid;
  place-items: center;
}

/* ✅ faces arranged so TOP exists */
.faceFront { transform: translateZ(calc(var(--s) / 2)); }
.faceBack  { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
.faceRight { transform: rotateY(90deg) translateZ(calc(var(--s) / 2)); }
.faceLeft  { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.faceTop   { transform: rotateX(90deg) translateZ(calc(var(--s) / 2)); }
.faceBottom{ transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }

.diceControls{
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 16px;
  background: rgba(255,255,255,.10);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14) inset, 0 18px 40px rgba(0,0,0,.14);
  backdrop-filter: blur(10px);
}

.diceReadout{
  font-weight: 1000;
  font-size: 18px;
  color: rgba(255,255,255,.92);
}

.miniInvalid{
  padding: 12px;
  border-radius: 14px;
  background: rgba(0,0,0,.16);
  color: rgba(255,255,255,.88);
  font-weight: 1000;
}

/* responsive */
@media (max-width: 980px){
  .scrollInner{ min-width: 1200px; }
}
`;
