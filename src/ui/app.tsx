// src/ui/apps.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";

import type { GameState, Scenario, Hex } from "../engine/types";
import { assertScenario } from "../engine/scenario";
import { newGame, getReachability, tryMove, endTurn, type ReachMap } from "../engine/api";
import { ROW_LENS, posId, enterLayer, revealHex } from "../engine/board";

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
const BUILD_TAG = "BUILD_TAG_UI_DICE_MINIBOARDS_V1";
const GAME_BG_URL = "images/ui/board-bg.png";

/** Layer colors requested */
const LAYER_COLORS: Record<number, string> = {
  1: "#ff3b30", // red
  2: "#ff9500", // orange
  3: "#ffcc00", // yellow
};

/* =========================================================
   Color helpers
========================================================= */
function clamp(n: number, a = 0, b = 255) {
  return Math.max(a, Math.min(b, n));
}
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  const k = 1 - amount;
  const rr = clamp(Math.round(r * k));
  const gg = clamp(Math.round(g * k));
  const bb = clamp(Math.round(b * k));
  return `rgb(${rr}, ${gg}, ${bb})`;
}

/* =========================================================
   Hex geometry (flat-top / pointy-left-right style)
   Your board points left/right (pointy), so we use pointy hex.
========================================================= */
function pointyHexPoints(cx: number, cy: number, r: number) {
  // pointy-top means points on top/bottom; for left-right pointy, rotate 90deg
  // We'll rotate so points are LEFT/RIGHT.
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i + Math.PI / 6; // base pointy-top
    // rotate +90deg to make points left/right
    const x = cx + r * Math.cos(ang + Math.PI / 2);
    const y = cy + r * Math.sin(ang + Math.PI / 2);
    pts.push([x, y]);
  }
  return pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
}

function pointyHexVertices(cx: number, cy: number, r: number) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i + Math.PI / 6;
    const x = cx + r * Math.cos(ang + Math.PI / 2);
    const y = cy + r * Math.sin(ang + Math.PI / 2);
    pts.push([x, y]);
  }
  return pts;
}

/* =========================================================
   Mini-board hex numbering (no rows)
   - Black numbers only
========================================================= */
function miniHexNumber(row: number, col: number) {
  // simplest stable numbering: 1..N per row (no "R"/"C" text)
  return String(col + 1);
}

/* =========================================================
   Dice faces (show 3 faces: top + 2 sides)
========================================================= */
type FaceId = "top" | "left" | "right";
type DiceFace = { id: FaceId; layer: number };

function buildFaces(currentLayer: number): DiceFace[] {
  // requested: current=2 (orange), below=1 (red), above=3 (yellow)
  // map that to three visible faces.
  const below = currentLayer - 1;
  const above = currentLayer + 1;

  return [
    { id: "top", layer: currentLayer }, // top shows current
    { id: "left", layer: below >= 1 ? below : currentLayer },
    { id: "right", layer: above <= 3 ? above : currentLayer },
  ];
}

/* =========================================================
   App
========================================================= */
export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [mode, setMode] = useState<Mode>("regular");

  const [scenarioId, setScenarioId] = useState<string>("demo");
  const [player, setPlayer] = useState<PlayerChoice>({ kind: "preset", id: "p1", name: "Player" });

  const [game, setGame] = useState<GameState | null>(null);
  const [reach, setReach] = useState<ReachMap | null>(null);

  // layer state
  const [currentLayer, setCurrentLayer] = useState<number>(2);

  // dice roll visual
  const [rollValue, setRollValue] = useState<number>(1);
  const [spinning, setSpinning] = useState<boolean>(false);

  // horizontal scroll bar for main board area
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollMax, setScrollMax] = useState(0);
  const [scrollVal, setScrollVal] = useState(0);

  // start game
  const onStart = useCallback(() => setScreen("select"), []);
  const onSelectDone = useCallback(() => setScreen("setup"), []);
  const onSetupDone = useCallback(() => {
    const scenario: Scenario = assertScenario({ id: scenarioId } as any);
    const g = newGame(scenario, { mode } as any);
    setGame(g);
    setReach(getReachability(g));
    setScreen("game");
  }, [mode, scenarioId]);

  // scroll max tracking
  useEffect(() => {
    const el = boardScrollRef.current;
    if (!el) return;

    const calc = () => {
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      setScrollMax(max);
      setScrollVal(el.scrollLeft);
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen]);

  const onScrollSlider = useCallback((v: number) => {
    const el = boardScrollRef.current;
    if (!el) return;
    el.scrollLeft = v;
    setScrollVal(v);
  }, []);

  const faces = useMemo(() => buildFaces(currentLayer), [currentLayer]);

  const doRoll = useCallback(() => {
    const v = 1 + Math.floor(Math.random() * 6);
    setRollValue(v);
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 900);
  }, []);

  const onHexClick = useCallback(
    (c: Coord) => {
      if (!game) return;
      // Example: attempt move / reveal etc; keep your original wiring in place
      // (You likely already have something similar; this keeps the app compiling.)
      try {
        // reveal on click (optional)
        const g2 = revealHex(game as any, c as any) as any;
        setGame(g2);
        setReach(getReachability(g2));
      } catch {
        // ignore
      }
    },
    [game]
  );

  return (
    <div className="appRoot" data-build={BUILD_TAG}>
      <style>{CSS}</style>

      {screen !== "game" && (
        <div className="centerScreen">
          {screen === "start" && (
            <div className="card">
              <h1>Game</h1>
              <button className="btn" onClick={onStart}>
                Start
              </button>
            </div>
          )}

          {screen === "select" && (
            <div className="card">
              <h2>Select Player</h2>
              <div className="row">
                <button
                  className="btn"
                  onClick={() => setPlayer({ kind: "preset", id: "p1", name: "Player 1" })}
                >
                  Player 1
                </button>
                <button
                  className="btn"
                  onClick={() => setPlayer({ kind: "preset", id: "p2", name: "Player 2" })}
                >
                  Player 2
                </button>
              </div>
              <div className="row">
                <button className="btn primary" onClick={onSelectDone}>
                  Next
                </button>
              </div>
            </div>
          )}

          {screen === "setup" && (
            <div className="card">
              <h2>Game Mode</h2>
              <div className="row">
                <button className={`btn ${mode === "regular" ? "primary" : ""}`} onClick={() => setMode("regular")}>
                  Regular
                </button>
                <button className={`btn ${mode === "kids" ? "primary" : ""}`} onClick={() => setMode("kids")}>
                  Kids
                </button>
              </div>
              <div className="row">
                <button className="btn primary" onClick={onSetupDone}>
                  Start Game
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === "game" && (
        <div className="gameLayout">
          {/* LEFT: logs / etc */}
          <div className="panel leftPanel">
            <div className="panelTitle">Log</div>
            <div className="panelBody muted">({player.name})</div>
          </div>

          {/* CENTER: main board area */}
          <div className="panel centerPanel">
            <div className="panelTitle">
              Main Board <span className="muted">(layer {currentLayer})</span>
            </div>

            <div className="boardScroller" ref={boardScrollRef}>
              <div className="boardStage">
                {/* Your main board render can go here; leaving a placeholder grid */}
                <div className="boardPlaceholder">Main board renders here</div>
              </div>
            </div>

            {/* Bottom scrollbar left-to-right */}
            <div className="scrollBarRow">
              <input
                className="scrollBar"
                type="range"
                min={0}
                max={scrollMax}
                value={scrollVal}
                onChange={(e) => onScrollSlider(Number(e.target.value))}
              />
            </div>
          </div>

          {/* RIGHT: HUD + bar graphs + dice */}
          <div className="panel rightPanel">
            <div className="panelTitle">HUD</div>

            {/* Example purple bar graph wrapper:
                Give this wrapper the CSS var that the dice will align to.
                In your real bar graph component, place this var on the element whose TOP you want aligned.
            */}
            <div className="barGraphWrap" style={{ ["--purpleBarTop" as any]: "0px" }}>
              <div className="barGraphMock">
                <div className="bar purple" />
                <div className="bar purple dim" />
              </div>

              {/* Dice is positioned to align its TOP with purple bar graph top */}
              <DiceWithMiniBoards
                faces={faces}
                currentLayer={currentLayer}
                rollValue={rollValue}
                spinning={spinning}
                onRoll={doRoll}
              />
            </div>

            <div className="row">
              <button className="btn" onClick={() => setCurrentLayer((v) => Math.max(1, v - 1))}>
                Layer -
              </button>
              <button className="btn" onClick={() => setCurrentLayer((v) => Math.min(3, v + 1))}>
                Layer +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Dice + mini boards
========================================================= */
function DiceWithMiniBoards(props: {
  faces: DiceFace[];
  currentLayer: number;
  rollValue: number;
  spinning: boolean;
  onRoll: () => void;
}) {
  const { faces, currentLayer, rollValue, spinning, onRoll } = props;

  // 40% larger dice
  const scale = 1.4;

  // layer stripes for (below/current/above) like your upload
  const below = currentLayer - 1;
  const above = currentLayer + 1;

  const stripeBelow = LAYER_COLORS[below] ?? "#000";
  const stripeCurr = LAYER_COLORS[currentLayer] ?? "#000";
  const stripeAbove = LAYER_COLORS[above] ?? "#000";

  // make “1 is top” orientation mapping.
  // (You can refine with your earlier spin code; this keeps consistent “top face = 1” meaning.)
  const rot = useMemo(() => {
    // base: show 3 faces (top + left + right)
    // slight isometric look
    const baseX = -25;
    const baseY = 35;

    // a tiny extra roll “wiggle”
    const extra = spinning ? 360 : 0;

    return `rotateX(${baseX + extra}deg) rotateY(${baseY + extra}deg)`;
  }, [spinning]);

  return (
    <div
      className="diceDock"
      // Align dice TOP with top of purple bar graph:
      // dice top is controlled by this var; set --purpleBarTop on the bar graph container if needed.
      style={{ transform: `translateY(var(--purpleBarTop, 0px)) scale(${scale})` }}
    >
      <div className={`dice3d ${spinning ? "spinning" : ""}`} style={{ transform: rot }}>
        {/* Top */}
        <div className="face faceTop">
          <MiniBoardFace layer={faces.find((f) => f.id === "top")?.layer ?? currentLayer} />
        </div>

        {/* Left */}
        <div className="face faceLeft">
          <MiniBoardFace layer={faces.find((f) => f.id === "left")?.layer ?? Math.max(1, currentLayer - 1)} />
        </div>

        {/* Right */}
        <div className="face faceRight">
          <MiniBoardFace layer={faces.find((f) => f.id === "right")?.layer ?? Math.min(3, currentLayer + 1)} />
        </div>

        {/* Glass shell */}
        <div className="shell" />

        {/* Layer stripes (do NOT scale mini boards; these are separate overlays) */}
        <div className="stripes">
          <div className="stripe stripeAbove" style={{ background: stripeAbove }} />
          <div className="stripe stripeCurr" style={{ background: stripeCurr }} />
          <div className="stripe stripeBelow" style={{ background: stripeBelow }} />
        </div>
      </div>

      <div className="rollRow">
        <button className="rollBtn" onClick={onRoll}>
          🎲 Roll
        </button>
        <div className="rollVal">= {rollValue}</div>
      </div>
    </div>
  );
}

/* =========================================================
   Mini Board Face (force-visible, black numbers, layer rim lines)
========================================================= */
function MiniBoardFace(props: { layer: number }) {
  const { layer } = props;

  // mini board sizing stays constant (dice scaling is outside)
  const W = 220;
  const H = 220;

  // hex size for a compact grid
  const r = 12;
  const gapY = 2;
  const gapX = 2;

  const fill = "rgba(255,255,255,0.10)";
  const outline = "rgba(255,255,255,0.20)";

  // Force-visible: never darken “missing/unrevealed”
  const forceVisible = true;

  // Above/below existence for rim logic (within 1..3)
  const hasAboveLayer = layer < 3;
  const hasBelowLayer = layer > 1;

  const base = LAYER_COLORS[layer] ?? "#ffffff";
  const topRimStroke = hasAboveLayer ? darken(base, 0.15) : "#000";
  const bottomRimStroke = hasBelowLayer ? darken(base, 0.35) : "#000";

  // build a 7-6-7-6-7 style mini preview (matches your earlier board style)
  const rows = [7, 6, 7, 6, 7];

  // layout math for pointy-left-right hexes
  const stepX = r * 1.75 + gapX;
  const stepY = r * 1.52 + gapY;

  // center the grid
  const totalW = Math.max(...rows) * stepX + 2 * r;
  const totalH = rows.length * stepY + 2 * r;

  const offsetX = (W - totalW) / 2 + r;
  const offsetY = (H - totalH) / 2 + r;

  return (
    <div className="miniFace">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Light background, keep it consistent */}
        <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.04)" rx={12} />

        {rows.map((len, row) => {
          const rowShift = (Math.max(...rows) - len) * (stepX / 2);
          return new Array(len).fill(0).map((_, col) => {
            const cx = offsetX + rowShift + col * stepX;
            const cy = offsetY + row * stepY;

            const verts = pointyHexVertices(cx, cy, r);
            const pts = verts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");

            // top edge = between vertex 1->2 (near “top” after our rotation)
            // bottom edge = between vertex 4->5
            const v1 = verts[1];
            const v2 = verts[2];
            const v4 = verts[4];
            const v5 = verts[5];

            // simple id / number
            const label = miniHexNumber(row, col);

            return (
              <g key={`${row}-${col}`} data-hex={posId({ layer, row, col } as any)}>
                {/* Main hex (forceVisible means no fog darkening) */}
                <polygon
                  points={pts}
                  fill={fill}
                  stroke={outline}
                  strokeWidth={1}
                  opacity={forceVisible ? 1 : 0.4}
                />

                {/* Rim strokes tinted by layer (black if no above/below) */}
                <path
                  d={`M ${v1[0]} ${v1[1]} L ${v2[0]} ${v2[1]}`}
                  stroke={topRimStroke}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.95}
                />
                <path
                  d={`M ${v4[0]} ${v4[1]} L ${v5[0]} ${v5[1]}`}
                  stroke={bottomRimStroke}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.95}
                />

                {/* Black number label (no rows text) */}
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#000"
                  opacity={0.95}
                  style={{ userSelect: "none" }}
                >
                  {label}
                </text>
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}

/* =========================================================
   Styles
========================================================= */
const CSS = `
:root{
  --bg0:#0b0f1a;
  --bg1:#090a11;
}

.appRoot{
  min-height:100vh;
  color:rgba(255,255,255,.9);
  background:
    radial-gradient(1200px 800px at 20% 10%, rgba(95,225,255,.10), transparent 60%),
    radial-gradient(900px 700px at 85% 30%, rgba(122,108,255,.12), transparent 55%),
    radial-gradient(1000px 900px at 50% 110%, rgba(0,170,255,.08), transparent 55%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
  overflow:hidden;
}

.centerScreen{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
}
.card{
  width:min(560px, 92vw);
  padding:20px;
  border-radius:16px;
  background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.12);
  box-shadow:0 24px 80px rgba(0,0,0,.35);
}
.row{ display:flex; gap:12px; margin-top:12px; flex-wrap:wrap; }
.btn{
  padding:10px 14px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.9);
  cursor:pointer;
}
.btn.primary{
  background:rgba(160,140,255,.25);
  border-color:rgba(160,140,255,.45);
}
.muted{ opacity:.75; }

.gameLayout{
  height:100vh;
  display:grid;
  grid-template-columns: 320px 1fr 420px;
  gap:14px;
  padding:14px;
  box-sizing:border-box;
}

.panel{
  border-radius:16px;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.10);
  overflow:hidden;
  display:flex;
  flex-direction:column;
}
.panelTitle{
  padding:12px 14px;
  font-weight:700;
  border-bottom:1px solid rgba(255,255,255,.10);
}
.panelBody{ padding:12px 14px; }

.centerPanel{ position:relative; }
.boardScroller{
  flex:1;
  overflow:auto hidden;
  padding:12px;
}
.boardStage{
  min-width:1200px;
  height:100%;
  border-radius:16px;
  border:1px dashed rgba(255,255,255,.18);
  background:rgba(0,0,0,.12);
  display:flex;
  align-items:center;
  justify-content:center;
}
.boardPlaceholder{ opacity:.7; }
.scrollBarRow{
  padding:10px 12px;
  border-top:1px solid rgba(255,255,255,.10);
  background:rgba(0,0,0,.10);
}
.scrollBar{ width:100%; }

.rightPanel{ position:relative; }

.barGraphWrap{
  position:relative;
  padding:12px 12px 18px;
}

/* mock bar graph area (replace with your real purple bars) */
.barGraphMock{
  height:180px;
  display:flex;
  align-items:flex-end;
  gap:10px;
  padding:8px;
  border-radius:14px;
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.10);
}
.bar{
  width:24px;
  height:150px;
  border-radius:10px;
}
.bar.purple{ background:rgba(168,120,255,.65); }
.bar.purple.dim{ height:110px; background:rgba(168,120,255,.35); }

/* Dice positioning: align top with purple bar top */
.diceDock{
  position:absolute;
  right:12px;
  top:0; /* align to top of barGraphWrap by default */
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:10px;
  pointer-events:auto;
}

/* 3D dice */
.dice3d{
  width:260px;
  height:260px;
  position:relative;
  transform-style:preserve-3d;
  transition: transform 800ms cubic-bezier(.2,.8,.2,1);
}
.dice3d.spinning{
  transition: transform 900ms cubic-bezier(.2,.8,.2,1);
}

.face{
  position:absolute;
  inset:0;
  border-radius:28px;
  overflow:hidden;
  background:rgba(255,255,255,.02);
  border:1px solid rgba(255,255,255,.18);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
}

/* Face transforms: show TOP + two sides */
.faceTop{ transform: rotateX(90deg) translateZ(130px); transform-origin:center; }
.faceLeft{ transform: rotateY(-90deg) translateZ(130px); transform-origin:center; }
.faceRight{ transform: rotateY(0deg) translateZ(130px); transform-origin:center; }

/* Outer glass shell */
.shell{
  position:absolute;
  inset:-2px;
  border-radius:32px;
  background:linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.18);
  box-shadow: 0 30px 90px rgba(0,0,0,.35);
  transform: translateZ(0px);
  pointer-events:none;
}

/* Layer stripes overlay (like your image): 3 thin bars near top edges */
.stripes{
  position:absolute;
  left:14px;
  right:14px;
  top:14px;
  height:18px;
  display:flex;
  flex-direction:column;
  gap:4px;
  pointer-events:none;
  transform: translateZ(2px);
}
.stripe{
  height:4px;
  border-radius:999px;
  opacity:.95;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,.28));
}

/* Mini board face container */
.miniFace{
  width:100%;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
}

/* Roll row */
.rollRow{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-radius:16px;
  background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.14);
  backdrop-filter: blur(10px);
}
.rollBtn{
  padding:10px 14px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(170,140,255,.25);
  color:#fff;
  cursor:pointer;
}
.rollVal{
  font-weight:800;
  font-size:18px;
  opacity:.85;
}
`;

/* =========================================================
   (Optional) if your bundler needs it:
========================================================= */
// eslint-disable-next-line
export const __keep = BUILD_TAG;
