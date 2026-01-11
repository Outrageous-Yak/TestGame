// ui/app.tsx
import React, { useMemo, useCallback, useState } from "react";

/* =========================
   Types
========================= */
type Screen = "start" | "select" | "setup" | "game";
type Mode = "regular" | "kids";

type Coord = { row: number; col: number };

type PlayerChoice =
  | { kind: "preset"; id: string; name: string; blurb: string }
  | { kind: "custom"; name: string; imageDataUrl: string | null };

type ManifestLike = {
  // placeholder for later (engine-backed scenarios)
  files?: string[];
  initial?: string;
};

/* =========================
   Constants
========================= */

// 7-6-7-6-7-6-7
const ROW_LENS = [7, 6, 7, 6, 7, 6, 7] as const;
const ROWS = ROW_LENS.length;

// Optional images (safe if missing in public/)
const START_BG_URL = "images/ui/start-screen.jpg";
const BOARD_BG_URL = "images/ui/board-bg.png";

/* =========================
   Helpers
========================= */
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function isValidCell(row: number, col: number) {
  if (row < 1 || row > ROWS) return false;
  const len = ROW_LENS[row - 1];
  return col >= 1 && col <= len;
}

function coordKey(r: number, c: number) {
  return `r${r}c${c}`;
}

/**
 * Flat-top hex neighbor model for this row-offset layout:
 * - Odd rows are offset by +0.5 hex width visually.
 * - Neighbor rules depend on row parity.
 */
function neighborsOf(row: number, col: number): Coord[] {
  const isOdd = row % 2 === 1; // 1-indexed
  const candidates: Coord[] = [
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row - 1, col: isOdd ? col : col - 1 },
    { row: row - 1, col: isOdd ? col + 1 : col },
    { row: row + 1, col: isOdd ? col : col - 1 },
    { row: row + 1, col: isOdd ? col + 1 : col },
  ];
  return candidates.filter((p) => isValidCell(p.row, p.col));
}

function isNeighbor(a: Coord, b: Coord) {
  return neighborsOf(a.row, a.col).some((p) => p.row === b.row && p.col === b.col);
}

function defaultPosForLayer(_layer: number): Coord {
  // “center-ish” for 7-6-7 layout
  return { row: 4, col: 3 };
}

function layerName(layer: number) {
  return `Layer ${layer}`;
}

function toPublicUrl(p: string) {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  return base + String(p).replace(/^\/+/, "");
}

function rotateCols(len: number, shiftLeft: number) {
  const cols = Array.from({ length: len }, (_, i) => i + 1);
  const s = ((shiftLeft % len) + len) % len;
  return cols.slice(s).concat(cols.slice(0, s));
}

/* =========================
   App
========================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");

  const [mode, setMode] = useState<Mode | null>(null);

  const PLAYER_PRESETS: Array<{ id: string; name: string; blurb: string }> = useMemo(
    () => [
      { id: "p1", name: "Aeris", blurb: "A calm force. Moves with intent." },
      { id: "p2", name: "Devlan", blurb: "A wary hunter. Reads the board." },
    ],
    []
  );

  const PLAYER_PRESETS_KIDS: Array<{ id: string; name: string; blurb: string }> = useMemo(
    () => [
      { id: "p1", name: "Sunny", blurb: "Brave, bright, and curious." },
      { id: "p2", name: "Pip", blurb: "Small steps, big wins." },
    ],
    []
  );

  const players = mode === "kids" ? PLAYER_PRESETS_KIDS : PLAYER_PRESETS;

  const [chosenPlayer, setChosenPlayer] = useState<PlayerChoice | null>(null);

  // Gameplay state (UI demo version)
  const [currentLayer, setCurrentLayer] = useState<number>(4);
  const [posByLayer, setPosByLayer] = useState<Record<number, Coord>>(() => {
    const init: Record<number, Coord> = {};
    for (let l = 1; l <= 7; l++) init[l] = defaultPosForLayer(l);
    return init;
  });

  // Mini-board shifting (UI-only demo): shiftLeft[layer][row]
  const [miniShiftLeft, setMiniShiftLeft] = useState<Record<number, Record<number, number>>>(() => ({}));

  const currentPos = posByLayer[currentLayer];

  const belowLayer = clamp(currentLayer - 1, 1, 7);
  const aboveLayer = clamp(currentLayer + 1, 1, 7);

  const barSegments = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);

  const goToLayer = useCallback((layer: number) => setCurrentLayer(layer), []);

  const cycleLayer = useCallback(() => {
    setCurrentLayer((l) => (l >= 7 ? 1 : l + 1));
  }, []);

  const bumpMiniShift = useCallback((layer: number, row: number, deltaLeft: number) => {
    setMiniShiftLeft((prev) => {
      const next = { ...prev };
      const rowMap = { ...(next[layer] ?? {}) };
      rowMap[row] = (rowMap[row] ?? 0) + deltaLeft;
      // keep within row length
      const len = ROW_LENS[row - 1] ?? 7;
      rowMap[row] = ((rowMap[row] % len) + len) % len;
      next[layer] = rowMap;
      return next;
    });
  }, []);

  const endTurn = useCallback(() => {
    // demo drift rule: odd rows shift left, even rows shift right (per layer)
    for (let L = 1; L <= 7; L++) {
      for (let r = 1; r <= ROWS; r++) {
        const delta = r % 2 === 1 ? +1 : -1;
        bumpMiniShift(L, r, delta);
      }
    }
  }, [bumpMiniShift]);

  const reachableSet = useMemo(() => {
    const s = new Set<string>();
    if (!currentPos) return s;
    for (const n of neighborsOf(currentPos.row, currentPos.col)) {
      s.add(coordKey(n.row, n.col));
    }
    return s;
  }, [currentPos]);

  const tryMoveTo = useCallback(
    (target: Coord) => {
      // layer 1 static rule (as in earlier phase)
      if (currentLayer === 1) return;

      const from = posByLayer[currentLayer];
      if (!from) return;
      if (!isNeighbor(from, target)) return;

      setPosByLayer((prev) => ({
        ...prev,
        [currentLayer]: { row: target.row, col: target.col },
      }));

      // auto end turn like before
      endTurn();
    },
    [currentLayer, posByLayer, endTurn]
  );

  const resetRun = useCallback(() => {
    setPosByLayer(() => {
      const init: Record<number, Coord> = {};
      for (let l = 1; l <= 7; l++) init[l] = defaultPosForLayer(l);
      return init;
    });
    setMiniShiftLeft({});
    setCurrentLayer(4);
  }, []);

  /* =========================
     Screen routing
  ========================= */
  const startNext = useCallback(() => setScreen("select"), []);
  const selectBack = useCallback(() => setScreen("start"), []);
  const selectNext = useCallback(() => setScreen("setup"), []);
  const setupBack = useCallback(() => setScreen("select"), []);
  const setupNext = useCallback(() => setScreen("game"), []);
  const exitToStart = useCallback(() => setScreen("start"), []);

  return (
    <div className="screen">
      <style>{css}</style>

      <div className="cloudBg" aria-hidden="true" />

      {screen === "start" && (
        <Start
          onPickMode={(m) => {
            setMode(m);
            setChosenPlayer(null);
            startNext();
          }}
        />
      )}

      {screen === "select" && (
        <SelectPlayer
          mode={mode ?? "regular"}
          players={players}
          chosenPlayer={chosenPlayer}
          onPickPreset={(p) => setChosenPlayer({ kind: "preset", ...p })}
          onPickCustom={(p) => setChosenPlayer(p)}
          onBack={selectBack}
          onNext={selectNext}
        />
      )}

      {screen === "setup" && (
        <Setup
          mode={mode ?? "regular"}
          chosenPlayer={chosenPlayer}
          onBack={setupBack}
          onPlay={setupNext}
          onSetMode={(m) => setMode(m)}
        />
      )}

      {screen === "game" && (
        <Game
          mode={mode ?? "regular"}
          chosenPlayer={chosenPlayer}
          currentLayer={currentLayer}
          onCycleLayer={cycleLayer}
          onPickLayer={goToLayer}
          onExit={exitToStart}
          onReset={resetRun}
          onEndTurn={endTurn}
          barSegments={barSegments}
          posByLayer={posByLayer}
          miniShiftLeft={miniShiftLeft}
          onCellClick={tryMoveTo}
          reachableSet={reachableSet}
        />
      )}
    </div>
  );
}

/* =========================
   Screens
========================= */

function Start({ onPickMode }: { onPickMode: (m: Mode) => void }) {
  return (
    <div className="layout layoutStart">
      <div className="card startCard">
        <div className="startHeader">
          <h1 className="h1">Hex Layers</h1>
          <div className="hint">Choose a mode to begin.</div>
        </div>

        <div className="row">
          <button className="btn primary" onClick={() => onPickMode("regular")}>
            Regular
          </button>
          <button className="btn" onClick={() => onPickMode("kids")}>
            Kids / Friendly
          </button>
        </div>

        <div className="startHero">
          <img
            src={toPublicUrl(START_BG_URL)}
            alt="start background"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="startHeroOverlay">
            <div className="pill">Start</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectPlayer(props: {
  mode: Mode;
  players: Array<{ id: string; name: string; blurb: string }>;
  chosenPlayer: PlayerChoice | null;
  onPickPreset: (p: { id: string; name: string; blurb: string }) => void;
  onPickCustom: (p: PlayerChoice) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { players, chosenPlayer } = props;

  const [customName, setCustomName] = useState<string>(
    chosenPlayer?.kind === "custom" ? chosenPlayer.name : ""
  );
  const [customImage, setCustomImage] = useState<string | null>(
    chosenPlayer?.kind === "custom" ? chosenPlayer.imageDataUrl : null
  );

  const pickCustomFile = async (file: File) => {
    const url = await readFileAsDataURL(file);
    setCustomImage(url);
  };

  const useCustom = () => {
    const nm = customName.trim() || "Custom Player";
    props.onPickCustom({ kind: "custom", name: nm, imageDataUrl: customImage });
  };

  const canContinue = !!chosenPlayer;

  return (
    <div className="layout">
      <div className="centerColumn">
        <div className="card">
          <div className="topRow">
            <div>
              <h2 className="h2">Select player</h2>
              <div className="hint">Pick a preset or upload a custom.</div>
            </div>
            <div className="row">
              <button className="btn" onClick={props.onBack}>
                Back
              </button>
              <button className="btn primary" onClick={props.onNext} disabled={!canContinue}>
                Continue
              </button>
            </div>
          </div>

          <div className="grid2">
            <div>
              <div className="subHead">Presets</div>
              <div className="list">
                {players.map((p) => {
                  const selected = chosenPlayer?.kind === "preset" && chosenPlayer.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={"tile " + (selected ? "selected" : "")}
                      onClick={() => props.onPickPreset(p)}
                      role="button"
                    >
                      <div className="tileMain">
                        <div className="tileTitle">{p.name}</div>
                        <div className="tileDesc">{p.blurb}</div>
                      </div>
                      <div className="badge">Preset</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="subHead">Custom</div>
              <div className="customBox">
                <div className="dropRow">
                  <div className="preview">
                    {customImage ? <img src={customImage} alt="custom" /> : <span>Drop / Upload</span>}
                  </div>

                  <div className="dropControls">
                    <label className="label">Name</label>
                    <input
                      className="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Enter name…"
                    />

                    <div className="row" style={{ marginTop: 10 }}>
                      <label className="btn small" style={{ display: "inline-flex" }}>
                        Upload image
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void pickCustomFile(f);
                          }}
                        />
                      </label>

                      <button className="btn small" onClick={useCustom}>
                        Use custom
                      </button>
                    </div>

                    <div className="hint" style={{ marginTop: 8 }}>
                      PNG/JPG. Image optional.
                    </div>
                  </div>
                </div>

                {chosenPlayer?.kind === "custom" ? (
                  <div className="pill" style={{ marginTop: 12 }}>
                    Selected: {chosenPlayer.name}
                  </div>
                ) : (
                  <div className="hint" style={{ marginTop: 12 }}>
                    Not selected yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="hint" style={{ marginTop: 12 }}>
            Tip: Layer 1 is static. Move by clicking a neighboring hex.
          </div>
        </div>
      </div>
    </div>
  );
}

function Setup(props: {
  mode: Mode;
  chosenPlayer: PlayerChoice | null;
  onBack: () => void;
  onPlay: () => void;
  onSetMode: (m: Mode) => void;
}) {
  return (
    <div className="layout">
      <div className="centerColumn">
        <div className="card">
          <div className="topRow">
            <div>
              <h2 className="h2">Setup</h2>
              <div className="hint">Confirm mode and start.</div>
            </div>
            <div className="row">
              <button className="btn" onClick={props.onBack}>
                Back
              </button>
              <button className="btn primary" onClick={props.onPlay} disabled={!props.chosenPlayer}>
                Play
              </button>
            </div>
          </div>

          <div className="grid2">
            <div className="tileBlock">
              <div className="subHead">Game mode</div>
              <div className="row" style={{ marginTop: 10 }}>
                <button
                  className={"btn " + (props.mode === "regular" ? "primary" : "")}
                  onClick={() => props.onSetMode("regular")}
                >
                  Regular
                </button>
                <button
                  className={"btn " + (props.mode === "kids" ? "primary" : "")}
                  onClick={() => props.onSetMode("kids")}
                >
                  Kids / Friendly
                </button>
              </div>
            </div>

            <div className="tileBlock">
              <div className="subHead">Player</div>
              <div className="hint" style={{ marginTop: 10 }}>
                {props.chosenPlayer
                  ? props.chosenPlayer.kind === "preset"
                    ? `Preset: ${props.chosenPlayer.name}`
                    : `Custom: ${props.chosenPlayer.name}`
                  : "No player selected."}
              </div>
            </div>
          </div>

          {!props.chosenPlayer ? (
            <div className="warn" style={{ marginTop: 12 }}>
              Pick a player to continue.
            </div>
          ) : (
            <div className="hint" style={{ marginTop: 12 }}>
              Ready.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Game(props: {
  mode: Mode;
  chosenPlayer: PlayerChoice | null;
  currentLayer: number;
  onCycleLayer: () => void;
  onPickLayer: (l: number) => void;
  onExit: () => void;
  onReset: () => void;
  onEndTurn: () => void;

  barSegments: number[];
  posByLayer: Record<number, Coord>;
  miniShiftLeft: Record<number, Record<number, number>>;

  onCellClick: (c: Coord) => void;
  reachableSet: Set<string>;
}) {
  const belowLayer = clamp(props.currentLayer - 1, 1, 7);
  const aboveLayer = clamp(props.currentLayer + 1, 1, 7);

  const currentPos = props.posByLayer[props.currentLayer];
  const belowPos = props.posByLayer[belowLayer];
  const abovePos = props.posByLayer[aboveLayer];

  return (
    <div className="layout">
      <div className="centerColumn">
        <div className="layerTitleRow">
          <div className="layerTitle" onClick={props.onCycleLayer} role="button" tabIndex={0}>
            {layerName(props.currentLayer)}
            <span className="layerHint">click to change layer</span>
          </div>
        </div>

        <div className="boardAndBar">
          <div className="boardFrame">
            <div className="boardSquare">
              <div
                className="boardBg"
                style={{
                  backgroundImage: `url("${toPublicUrl(BOARD_BG_URL)}")`,
                }}
              />
              <div className="boardCenter">
                <HexBoard
                  kind="main"
                  activeLayer={props.currentLayer}
                  selected={currentPos}
                  onCellClick={props.onCellClick}
                  showCoords={true} // main board: show R/C on two rows
                  reachableSet={props.reachableSet}
                />
              </div>
            </div>

            <div className="hudRow">
              <div className="pill">
                Mode: <b>{props.mode}</b>
              </div>
              <div className="pill">
                Player:{" "}
                <b>{props.chosenPlayer ? props.chosenPlayer.name : "—"}</b>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn small" onClick={props.onEndTurn}>
                  End turn
                </button>
                <button className="btn small" onClick={props.onReset}>
                  Reset
                </button>
                <button className="btn small" onClick={props.onExit}>
                  Exit
                </button>
              </div>
            </div>
          </div>

          {/* Rainbow bar OUTSIDE on the clouds */}
          <div className="barWrap" aria-label="Layer bar">
            <div className="layerBar" data-active={props.currentLayer}>
              {props.barSegments.map((L) => {
                const active = L === props.currentLayer;
                return (
                  <div
                    key={L}
                    className={"barSeg" + (active ? " active" : "")}
                    data-layer={L}
                    title={`Layer ${L}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Mini boards */}
        <div className="miniRow">
          <MiniPanel title="Below" tone="below" layer={belowLayer} onPickLayer={props.onPickLayer}>
            <MiniHexBoard
              layer={belowLayer}
              selected={belowPos}
              showPlayer={false}
              currentLayer={props.currentLayer}
              miniShiftLeft={props.miniShiftLeft}
            />
          </MiniPanel>

          <MiniPanel title="Current" tone="current" layer={props.currentLayer} onPickLayer={props.onPickLayer}>
            <MiniHexBoard
              layer={props.currentLayer}
              selected={currentPos}
              showPlayer={true}
              currentLayer={props.currentLayer}
              miniShiftLeft={props.miniShiftLeft}
            />
          </MiniPanel>

          <MiniPanel title="Above" tone="above" layer={aboveLayer} onPickLayer={props.onPickLayer}>
            <MiniHexBoard
              layer={aboveLayer}
              selected={abovePos}
              showPlayer={false}
              currentLayer={props.currentLayer}
              miniShiftLeft={props.miniShiftLeft}
            />
          </MiniPanel>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Components
========================= */

function MiniPanel(props: {
  title: string;
  tone: "below" | "current" | "above";
  layer: number;
  onPickLayer: (layer: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={"miniPanel " + `tone-${props.tone}`}
      data-layer={props.layer}
      onClick={() => props.onPickLayer(props.layer)}
      role="button"
      tabIndex={0}
      title={`Switch to Layer ${props.layer}`}
    >
      <div className="miniHeader">{props.title}</div>
      <div className="miniBody">{props.children}</div>
    </div>
  );
}

function HexBoard(props: {
  kind: "main" | "mini";
  activeLayer: number;
  selected: Coord;
  onCellClick?: (c: Coord) => void;
  showCoords: boolean;
  reachableSet?: Set<string>;
}) {
  const { kind, selected, onCellClick, showCoords } = props;

  return (
    <div className={"hexBoard " + (kind === "main" ? "hexBoardMain" : "hexBoardMini")} data-layer={props.activeLayer}>
      {ROW_LENS.map((len, rIdx) => {
        const row = rIdx + 1;
        const isEven = row % 2 === 0;
        return (
          <div key={row} className={"hexRow " + (isEven ? "offset" : "")} data-row={row}>
            {Array.from({ length: len }, (_, cIdx) => {
              const col = cIdx + 1;
              const cell: Coord = { row, col };
              const key = coordKey(row, col);

              const isSel = selected?.row === row && selected?.col === col;
              const isReach = kind === "main" && !!props.reachableSet?.has(key);

              return (
                <div
                  key={key}
                  className={
                    "hexTile" +
                    (isSel ? " isSelected" : "") +
                    (isReach ? " isReach" : "") +
                    (kind === "main" && !isSel && !isReach ? " isDim" : "")
                  }
                  data-row={row}
                  data-col={col}
                  onClick={onCellClick ? () => onCellClick(cell) : undefined}
                  role={onCellClick ? "button" : undefined}
                  title={showCoords ? `R${row}C${col}` : undefined}
                >
                  {showCoords ? (
                    <div className="hexLabel">
                      <div>R{row}</div>
                      <div>C{col}</div>
                    </div>
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

function MiniHexBoard(props: {
  layer: number;
  selected: Coord;
  showPlayer: boolean;
  currentLayer: number;
  miniShiftLeft: Record<number, Record<number, number>>;
}) {
  const playerRow = props.selected?.row ?? -1;
  const playerCol = props.selected?.col ?? -1;

  return (
    <div className="miniHexBoard" data-layer={props.layer}>
      {ROW_LENS.map((len, rIdx) => {
        const r = rIdx + 1;
        const isEven = r % 2 === 0;
        const shiftLeft = props.miniShiftLeft?.[props.layer]?.[r] ?? 0;
        const orderedCols = rotateCols(len, shiftLeft);

        return (
          <div key={r} className={"miniHexRow " + (isEven ? "offset" : "")}>
            {orderedCols.map((c) => {
              const on =
                props.showPlayer && props.layer === props.currentLayer && r === playerRow && c === playerCol;

              return (
                <div key={`${r}-${c}`} className={"miniHex" + (on ? " on" : "")} title={`R${r} C${c}`}>
                  <div className="miniHexLabel">{c}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* =========================
   File helper
========================= */
async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* =========================
   CSS
========================= */

const css = `
:root{
  --ink: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.70);

  /* Pastel rainbow reversed (R1 violet -> R7 red) */
  --r1: rgba(190, 170, 255, .42);
  --r2: rgba(155, 170, 255, .40);
  --r3: rgba(150, 210, 255, .40);
  --r4: rgba(165, 245, 205, .40);
  --r5: rgba(255, 245, 170, .38);
  --r6: rgba(255, 215, 170, .38);
  --r7: rgba(255, 170, 190, .38);
}

*{ box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }

.screen{
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(1200px 900px at 30% 10%, rgba(255,190,240,.55), transparent 55%),
    radial-gradient(1000px 800px at 80% 25%, rgba(160,210,255,.45), transparent 55%),
    radial-gradient(1200px 900px at 55% 65%, rgba(200,170,255,.35), transparent 60%),
    linear-gradient(180deg, #b8a7ff 0%, #cbb6ff 35%, #f0b0cf 100%);
  color: var(--ink);
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

.layout{
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr minmax(760px, 980px) 1fr;
  padding: 24px 24px 18px;
}

.layoutStart{
  align-items: center;
}

.centerColumn{
  grid-column: 2;
  display: grid;
  grid-template-rows: auto auto 1fr;
  align-items: start;
  gap: 14px;
}

.card{
  border-radius: 18px;
  padding: 14px;
  background: rgba(0,0,0,.18);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 25px 60px rgba(0,0,0,.18);
}

.startCard{
  max-width: 920px;
  margin: 0 auto;
}

.startHeader{
  display:flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}

.h1{ margin: 0; font-size: 44px; letter-spacing:.2px; line-height: 1.05; }
.h2{ margin: 0; font-size: 18px; letter-spacing:.2px; }
.hint{ opacity: .85; font-size: 12px; }

.row{ display:flex; gap: 10px; align-items:center; flex-wrap: wrap; }

.btn{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.10);
  color: var(--ink);
  cursor: pointer;
  font-weight: 900;
  font-size: 12px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.08) inset,
    0 10px 24px rgba(0,0,0,.18);
}
.btn:hover{ filter: brightness(1.05); border-color: rgba(255,255,255,.28); }
.btn:disabled{ opacity: .55; cursor: not-allowed; }

.btn.primary{
  background: linear-gradient(135deg, rgba(120,220,255,.32), rgba(200,140,255,.22));
  border-color: rgba(255,255,255,.28);
}

.btn.small{
  padding: 7px 10px;
  border-radius: 10px;
  font-size: 11px;
}

.pill{
  display:inline-flex;
  align-items:center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.16);
  background: rgba(0,0,0,.14);
  font-size: 11px;
  font-weight: 900;
  color: rgba(255,255,255,.85);
  white-space: nowrap;
}

.warn{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,120,120,.22);
  background: rgba(255,120,120,.12);
  font-weight: 900;
  color: rgba(255,255,255,.92);
}

.startHero{
  margin-top: 14px;
  border-radius: 18px;
  overflow: hidden;
  position: relative;
  min-height: 220px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(0,0,0,.12);
}
.startHero img{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit: cover;
  display:block;
  filter: saturate(1.05) contrast(1.03);
}
.startHeroOverlay{
  position: absolute;
  inset: 0;
  display:flex;
  align-items:flex-end;
  justify-content:flex-end;
  padding: 14px;
  background:
    radial-gradient(700px 340px at 20% 25%, rgba(255,255,255,.20), transparent 55%),
    linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.50));
}

/* select/setup layout */
.topRow{
  display:flex;
  align-items:flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.grid2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 980px){
  .layout{ grid-template-columns: 16px 1fr 16px; }
  .grid2{ grid-template-columns: 1fr; }
}

.subHead{
  font-weight: 1000;
  letter-spacing: .3px;
  opacity: .95;
  margin-bottom: 10px;
}

.list{
  display:grid;
  gap: 10px;
}

.tile{
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
  display:flex;
  justify-content: space-between;
  gap: 10px;
  cursor:pointer;
  box-shadow: 0 12px 28px rgba(0,0,0,.12);
}
.tile:hover{ border-color: rgba(255,255,255,.22); filter: brightness(1.03); }
.tile.selected{
  border-color: rgba(255,255,255,.30);
  box-shadow:
    0 0 0 3px rgba(255,255,255,.10) inset,
    0 16px 36px rgba(0,0,0,.16);
}
.tileMain{ min-width:0; }
.tileTitle{ font-weight: 1000; margin-bottom: 3px; }
.tileDesc{ opacity: .85; font-size: 11px; line-height: 1.25; }
.badge{ opacity: .85; font-weight: 900; font-size: 11px; }

.customBox{
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  padding: 12px;
}

.dropRow{
  display:flex;
  gap: 12px;
  align-items: stretch;
  flex-wrap: wrap;
}

.preview{
  width: 84px;
  height: 84px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(0,0,0,.12);
  display:grid;
  place-items:center;
  overflow:hidden;
  font-weight: 900;
  font-size: 11px;
  color: rgba(255,255,255,.82);
}
.preview img{
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dropControls{
  flex: 1;
  min-width: 220px;
}

.label{ font-size: 11px; font-weight: 900; opacity: .85; }
.text{
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.12);
  color: var(--ink);
  outline: none;
  font-weight: 900;
  margin-top: 6px;
}

.tileBlock{
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  padding: 12px;
}

/* GAME */
.layerTitleRow{
  display:flex;
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
  background: rgba(0,0,0,.16);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 18px 40px rgba(0,0,0,.12);
  display: inline-flex;
  gap: 10px;
  align-items: baseline;
}
.layerHint{
  font-size: 12px;
  font-weight: 900;
  color: rgba(255,255,255,.75);
}

.boardAndBar{
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: 18px;
}

.boardFrame{
  padding: 12px;
  border-radius: 18px;
  background: rgba(255,255,255,.08);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.16) inset,
    0 25px 60px rgba(0,0,0,.14);
}

.boardSquare{
  width: min(80vmin, 720px);
  aspect-ratio: 1 / 1;
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(0,0,0,.10);

  /* main-hex sizing */
  --hexW: 78px;
  --hexH: calc(var(--hexW) * 0.8660254); /* √3/2 */
}

.boardBg{
  position:absolute;
  inset:0;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: .92;
}
.boardBg::after{
  content:"";
  position:absolute;
  inset:0;
  background:
    radial-gradient(900px 500px at 20% 20%, rgba(255,255,255,.14), transparent 60%),
    radial-gradient(900px 500px at 80% 65%, rgba(255,255,255,.12), transparent 60%),
    linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.26));
}

.boardCenter{
  position: relative;
  z-index: 1;
  display:flex;
  justify-content:center;
  align-items:center;
  width:100%;
  height:100%;
  padding: 10px;
}

/* ===== Connected honeycomb (MAIN) ===== */
.hexBoard{
  display: grid;
  justify-content: center;
  user-select: none;
}

.hexRow{
  display:flex;
  height: var(--hexH);
  align-items:center;
  justify-content:center;
}
.hexRow.offset{
  margin-left: calc(var(--hexW) * 0.5);
}

/* Touching horizontally: overlap by 1/4 width */
.hexTile{
  width: var(--hexW);
  height: var(--hexH);
  margin-right: calc(var(--hexW) * -0.25);

  clip-path: polygon(
    25% 0%, 75% 0%,
    100% 50%,
    75% 100%, 25% 100%,
    0% 50%
  );

  position: relative;
  display:flex;
  align-items:center;
  justify-content:center;

  border: 1px solid rgba(255,255,255,.22);
  background: var(--fill, rgba(255,255,255,.14));
  box-shadow: 0 6px 16px rgba(0,0,0,.12);
  cursor: pointer;

  transition: transform .12s ease, filter .12s ease, box-shadow .18s ease;
}

/* Row-based fill (pastel rainbow) */
.hexTile[data-row="1"]{ --fill: var(--r1); }
.hexTile[data-row="2"]{ --fill: var(--r2); }
.hexTile[data-row="3"]{ --fill: var(--r3); }
.hexTile[data-row="4"]{ --fill: var(--r4); }
.hexTile[data-row="5"]{ --fill: var(--r5); }
.hexTile[data-row="6"]{ --fill: var(--r6); }
.hexTile[data-row="7"]{ --fill: var(--r7); }

/* Labels: 2 rows, white with black outline */
.hexLabel{
  font-size: 11px;
  font-weight: 1000;
  color: rgba(255,255,255,.95);
  text-align: center;
  line-height: 1.05;
  text-shadow:
    -1px -1px 0 rgba(0,0,0,.65),
     1px -1px 0 rgba(0,0,0,.65),
    -1px  1px 0 rgba(0,0,0,.65),
     1px  1px 0 rgba(0,0,0,.65),
     0 0 10px rgba(0,0,0,.25);
}

/* Hover */
.hexTile:hover{
  transform: translateY(-1px);
  filter: brightness(1.06);
}

/* Selected glow */
.hexTile.isSelected{
  outline: 2px solid rgba(255,255,255,.35);
  outline-offset: 2px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.18) inset,
    0 0 18px rgba(255,255,255,.18);
}

/* Reachable glow */
.hexTile.isReach{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.12) inset,
    0 0 18px rgba(0,200,255,.35),
    0 0 44px rgba(0,200,255,.20);
}

/* Dim non-reachable tiles slightly (keeps the "glow language") */
.hexTile.isDim{
  opacity: .75;
}

/* HUD row under board */
.hudRow{
  margin-top: 12px;
  display:flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

/* ===== Rainbow bar ===== */
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
    0 18px 40px rgba(0,0,0,.16);
  display: grid;
  grid-template-rows: repeat(7, 1fr);
}

.barSeg{
  opacity: .98;
}

/* 1 bottom red ... 7 top violet */
.barSeg[data-layer="1"]{ background: rgba(255, 92, 120, .95); }
.barSeg[data-layer="2"]{ background: rgba(255, 150, 90, .95); }
.barSeg[data-layer="3"]{ background: rgba(255, 220, 120, .95); }
.barSeg[data-layer="4"]{ background: rgba(120, 235, 170, .95); }
.barSeg[data-layer="5"]{ background: rgba(120, 220, 255, .95); }
.barSeg[data-layer="6"]{ background: rgba(135, 170, 255, .95); }
.barSeg[data-layer="7"]{ background: rgba(200, 140, 255, .95); }

.barSeg.active{
  position: relative;
  z-index: 2;
  outline: 1px solid rgba(255,255,255,.25);
  box-shadow:
    0 0 16px rgba(255,255,255,.35),
    0 0 30px rgba(255,255,255,.18);
}

/* ===== MINI BOARDS (flat honeycomb) ===== */
.miniRow{
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 18px;
  align-items: start;
  padding-bottom: 4px;
}

.miniPanel{
  cursor: pointer;
  border-radius: 18px;
  padding: 10px 10px 12px;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 18px 40px rgba(0,0,0,.12);
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
}

.miniBody{
  padding: 8px 8px 10px;
  border-radius: 14px;
  background: rgba(255,255,255,.10);
  box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset;
}

/* Solid/tinted mini board themes (NOT transparent) */
.tone-below{
  background: linear-gradient(180deg, rgba(255,110,140,.55), rgba(255,110,140,.32));
}
.tone-below .miniHeader{ background: rgba(120, 30, 50, .45); }

.tone-current{
  background: linear-gradient(180deg, rgba(120,235,170,.55), rgba(120,235,170,.30));
}
.tone-current .miniHeader{ background: rgba(20, 80, 55, .45); }

.tone-above{
  background: linear-gradient(180deg, rgba(135,170,255,.55), rgba(135,170,255,.32));
}
.tone-above .miniHeader{ background: rgba(20, 40, 90, .45); }

.miniHexBoard{
  --mHexW: 22px;
  --mHexH: calc(var(--mHexW) * 0.8660254);
  display: grid;
  justify-content: center;
  user-select: none;
}

.miniHexRow{
  display:flex;
  height: var(--mHexH);
  align-items:center;
  justify-content:center;
}
.miniHexRow.offset{
  margin-left: calc(var(--mHexW) * 0.5);
}

.miniHex{
  width: var(--mHexW);
  height: var(--mHexH);
  margin-right: calc(var(--mHexW) * -0.25);
  clip-path: polygon(
    25% 0%, 75% 0%,
    100% 50%,
    75% 100%, 25% 100%,
    0% 50%
  );
  background: rgba(0,0,0,.10);
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: 0 2px 8px rgba(0,0,0,.10);
  display:flex;
  align-items:center;
  justify-content:center;
}

.miniHex.on{
  border-color: rgba(76,255,80,.75);
  background: rgba(76,255,80,.18);
  box-shadow:
    0 0 0 2px rgba(76,255,80,.18) inset,
    0 0 14px rgba(76,255,80,.22);
}

.miniHexLabel{
  font-size: 10px;
  font-weight: 1000;
  color: rgba(255,255,255,.90);
  text-shadow:
    -1px -1px 0 rgba(0,0,0,.65),
     1px -1px 0 rgba(0,0,0,.65),
    -1px  1px 0 rgba(0,0,0,.65),
     1px  1px 0 rgba(0,0,0,.65);
}

@media (max-width: 980px){
  .miniRow{ grid-template-columns: 1fr; }
  .layerBar{ height: 280px; }
}
@media (max-height: 820px){
  .layerBar{ height: 300px; }
  .boardSquare{ --hexW: 70px; }
}
`;
