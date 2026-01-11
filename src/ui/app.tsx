import React, { useMemo, useState, useCallback } from "react";

/* =========================
   Types & constants
========================= */
type Coord = { row: number; col: number };

const ROW_LENS = [7, 6, 7, 6, 7, 6, 7] as const;
const ROWS = ROW_LENS.length;

/* =========================
   Geometry helpers
========================= */
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function defaultPos(): Coord {
  return { row: 4, col: 3 };
}

function isValid(row: number, col: number) {
  return row >= 1 && row <= ROWS && col >= 1 && col <= ROW_LENS[row - 1];
}

function neighborsOf(row: number, col: number): Coord[] {
  const odd = row % 2 === 1;
  const cands: Coord[] = [
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row - 1, col: odd ? col : col - 1 },
    { row: row - 1, col: odd ? col + 1 : col },
    { row: row + 1, col: odd ? col : col - 1 },
    { row: row + 1, col: odd ? col + 1 : col },
  ];
  return cands.filter(p => isValid(p.row, p.col));
}

function isNeighbor(a: Coord, b: Coord) {
  return neighborsOf(a.row, a.col).some(
    p => p.row === b.row && p.col === b.col
  );
}

/* =========================
   App
========================= */
export default function App() {
  const [currentLayer, setCurrentLayer] = useState(4);

  const [posByLayer, setPosByLayer] = useState<Record<number, Coord>>(() => {
    const init: Record<number, Coord> = {};
    for (let l = 1; l <= 7; l++) init[l] = defaultPos();
    return init;
  });

  const currentPos = posByLayer[currentLayer];

  const reachable = useMemo(
    () => neighborsOf(currentPos.row, currentPos.col),
    [currentPos]
  );

  const tryMove = useCallback(
    (to: Coord) => {
      if (currentLayer === 1) return;
      if (!isNeighbor(currentPos, to)) return;
      setPosByLayer(prev => ({ ...prev, [currentLayer]: to }));
    },
    [currentLayer, currentPos]
  );

  const cycleLayer = () =>
    setCurrentLayer(l => (l >= 7 ? 1 : l + 1));

  const below = clamp(currentLayer - 1, 1, 7);
  const above = clamp(currentLayer + 1, 1, 7);

  const barOrder = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);

  return (
    <div className="screen">
      <style>{css}</style>
      <div className="cloudBg" />

      <div className="layout">
        <div className="centerColumn">
          {/* Layer pill */}
          <div className="layerTitleRow">
            <div
              className="layerTitle"
              data-layer={currentLayer}
              onClick={cycleLayer}
            >
              Layer {currentLayer}
              <span className="layerHint">click to change</span>
            </div>
          </div>

          {/* Board + bar */}
          <div className="boardAndBar">
            <div className="boardFrame">
              <HexBoard
                kind="main"
                selected={currentPos}
                reachable={reachable}
                onCellClick={tryMove}
                showCoords={false}
              />
            </div>

            <div className="barWrap">
              <div className="layerBar">
                {barOrder.map(l => (
                  <div
                    key={l}
                    className={
                      "barSeg" + (l === currentLayer ? " isActive" : "")
                    }
                    data-layer={l}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Mini boards */}
          <div className="miniRow">
            <MiniPanel tone="below" title="Below" onPick={() => setCurrentLayer(below)}>
              <HexBoard kind="mini" selected={posByLayer[below]} showCoords />
            </MiniPanel>

            <MiniPanel tone="current" title="Current" onPick={() => setCurrentLayer(currentLayer)}>
              <HexBoard kind="mini" selected={currentPos} showCoords />
            </MiniPanel>

            <MiniPanel tone="above" title="Above" onPick={() => setCurrentLayer(above)}>
              <HexBoard kind="mini" selected={posByLayer[above]} showCoords />
            </MiniPanel>
          </div>
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
  onPick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`miniPanel tone-${props.tone}`} onClick={props.onPick}>
      <div className="miniHeader">{props.title}</div>
      <div className="miniBody">{props.children}</div>
    </div>
  );
}

function HexBoard(props: {
  kind: "main" | "mini";
  selected: Coord;
  reachable?: Coord[];
  onCellClick?: (c: Coord) => void;
  showCoords: boolean;
}) {
  return (
    <div className={`hexBoard ${props.kind === "main" ? "hexBoardMain" : "hexBoardMini"}`}>
      {ROW_LENS.map((len, ri) => {
        const row = ri + 1;
        return (
          <div key={row} className={`hexRow ${row % 2 ? "odd" : "even"}`}>
            {Array.from({ length: len }, (_, ci) => {
              const col = ci + 1;
              const isSel = props.selected.row === row && props.selected.col === col;
              const isReach = props.reachable?.some(p => p.row === row && p.col === col);
              return (
                <div
                  key={`${row}-${col}`}
                  className={`hex ${isSel ? "isSelected" : ""} ${isReach ? "isReachable" : ""}`}
                  data-row={row}
                  onClick={
                    props.onCellClick
                      ? () => props.onCellClick!({ row, col })
                      : undefined
                  }
                >
                  {props.showCoords && (
                    <span className="hexLabel">r{row}c{col}</span>
                  )}
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
   CSS — Phase 4 polish
========================= */
const css = `
html,body{margin:0;height:100%}
.screen{
  min-height:100vh;
  background: linear-gradient(180deg,#cbb6ff,#f0b0cf);
  position:relative;
  overflow:hidden;
}

.cloudBg{
  position:absolute;
  inset:0;
  background:
    radial-gradient(900px 450px at 50% 85%, rgba(255,255,255,.25), transparent 60%);
}

.layout{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:1fr minmax(760px,980px) 1fr;
  height:100%;
}

.centerColumn{
  grid-column:2;
  display:grid;
  grid-template-rows:auto auto 1fr;
  gap:14px;
}

.layerTitle{
  margin:auto;
  padding:8px 20px;
  border-radius:999px;
  background:rgba(0,0,0,.28);
  color:white;
  font-weight:900;
  cursor:pointer;
  box-shadow:0 0 18px rgba(255,255,255,.25);
}
.layerHint{font-size:12px;opacity:.7;margin-left:8px}

.boardAndBar{
  display:grid;
  grid-template-columns:1fr auto;
  gap:18px;
}

.boardFrame{
  padding:18px;
  background:rgba(255,255,255,.22);
  border-radius:22px;
}

.layerBar{
  width:18px;
  height:360px;
  border-radius:999px;
  overflow:hidden;
  display:grid;
  grid-template-rows:repeat(7,1fr);
}

.barSeg[data-layer="1"]{background:#ff5c78}
.barSeg[data-layer="2"]{background:#ff9a5a}
.barSeg[data-layer="3"]{background:#ffdc78}
.barSeg[data-layer="4"]{background:#78eba8}
.barSeg[data-layer="5"]{background:#78dcff}
.barSeg[data-layer="6"]{background:#87aaff}
.barSeg[data-layer="7"]{background:#c88cff}

.barSeg.isActive{
  box-shadow:0 0 20px rgba(255,255,255,.7);
}

.hexBoard{--w:78px}
.hexBoardMini{--w:22px}
.hexRow{display:flex;height:calc(var(--w)*0.866)}
.hexRow.odd{margin-left:calc(var(--w)*.5)}

.hex{
  width:var(--w);
  height:calc(var(--w)*0.866);
  margin-right:calc(var(--w)*-.25);
  clip-path:polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%);
  border:1px solid rgba(255,255,255,.45);
  transition:transform .12s, box-shadow .12s;
}

.hex[data-row="1"]{background:rgba(200,140,255,.75)}
.hex[data-row="2"]{background:rgba(165,175,255,.75)}
.hex[data-row="3"]{background:rgba(135,205,255,.75)}
.hex[data-row="4"]{background:rgba(120,235,170,.7)}
.hex[data-row="5"]{background:rgba(255,220,120,.7)}
.hex[data-row="6"]{background:rgba(255,155,105,.7)}
.hex[data-row="7"]{background:rgba(255,92,120,.75)}

.hex.isReachable{
  box-shadow:0 0 16px rgba(255,255,255,.55);
  cursor:pointer;
}
.hex.isReachable:hover{
  transform:scale(1.05);
}

.hex.isSelected{
  outline:3px solid white;
  box-shadow:0 0 30px rgba(255,255,255,.85);
}

.hexLabel{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
  font-size:10px;
  font-weight:800;
}

.miniRow{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:18px;
}

.miniPanel{
  padding:10px;
  border-radius:18px;
  cursor:pointer;
  opacity:.92;
}

.tone-below{background:rgba(255,110,140,.55)}
.tone-current{background:rgba(120,235,170,.55)}
.tone-above{background:rgba(135,170,255,.55)}

.miniHeader{
  text-align:center;
  font-weight:900;
  margin-bottom:8px;
}
`;
