import React, { useMemo, useState, useCallback } from "react";

type Coord = { row: number; col: number };

// 7-6-7-6-7-6-7 layout
const ROW_LENS = [7, 6, 7, 6, 7, 6, 7] as const;
const ROWS = ROW_LENS.length;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function coordKey(r: number, c: number) {
  return `r${r}c${c}`;
}

function defaultPos(): Coord {
  return { row: 4, col: 3 };
}

function isValidCell(row: number, col: number) {
  if (row < 1 || row > ROWS) return false;
  return col >= 1 && col <= ROW_LENS[row - 1];
}

/* Flat-top neighbor rules */
function neighborsOf(row: number, col: number): Coord[] {
  const odd = row % 2 === 1;
  const list: Coord[] = [
    { row, col: col - 1 },
    { row, col: col + 1 },
    { row: row - 1, col: odd ? col : col - 1 },
    { row: row - 1, col: odd ? col + 1 : col },
    { row: row + 1, col: odd ? col : col - 1 },
    { row: row + 1, col: odd ? col + 1 : col },
  ];
  return list.filter(p => isValidCell(p.row, p.col));
}

function isNeighbor(a: Coord, b: Coord) {
  return neighborsOf(a.row, a.col).some(
    p => p.row === b.row && p.col === b.col
  );
}

export default function App() {
  const [currentLayer, setCurrentLayer] = useState(4);

  const [posByLayer, setPosByLayer] = useState<Record<number, Coord>>(() => {
    const o: Record<number, Coord> = {};
    for (let l = 1; l <= 7; l++) o[l] = defaultPos();
    return o;
  });

  const currentPos = posByLayer[currentLayer];

  const tryMoveTo = useCallback(
    (target: Coord) => {
      if (currentLayer === 1) return;
      if (!isNeighbor(currentPos, target)) return;

      setPosByLayer(p => ({ ...p, [currentLayer]: target }));
    },
    [currentLayer, currentPos]
  );

  const cycleLayer = useCallback(
    () => setCurrentLayer(l => (l >= 7 ? 1 : l + 1)),
    []
  );

  const below = clamp(currentLayer - 1, 1, 7);
  const above = clamp(currentLayer + 1, 1, 7);

  const bar = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);

  return (
    <div className="screen">
      <style>{css}</style>
      <div className="cloudBg" />

      <div className="layout">
        <div className="centerColumn">
          <div className="layerTitle" onClick={cycleLayer}>
            Layer {currentLayer}
          </div>

          <div className="boardAndBar">
            <HexBoard
              kind="main"
              selected={currentPos}
              onCellClick={tryMoveTo}
              showCoords={false}
            />

            <div className="layerBar">
              {bar.map(l => (
                <div
                  key={l}
                  className={"barSeg" + (l === currentLayer ? " active" : "")}
                  data-layer={l}
                />
              ))}
            </div>
          </div>

          <div className="miniRow">
            <Mini title="Below">
              <HexBoard kind="mini" selected={posByLayer[below]} showCoords />
            </Mini>
            <Mini title="Current">
              <HexBoard kind="mini" selected={currentPos} showCoords />
            </Mini>
            <Mini title="Above">
              <HexBoard kind="mini" selected={posByLayer[above]} showCoords />
            </Mini>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="miniPanel">
      <div className="miniHeader">{props.title}</div>
      <div className="miniBody">{props.children}</div>
    </div>
  );
}

function HexBoard(props: {
  kind: "main" | "mini";
  selected: Coord;
  onCellClick?: (c: Coord) => void;
  showCoords: boolean;
}) {
  const { kind, selected, onCellClick, showCoords } = props;

  return (
    <div className={`hexBoard ${kind}`}>
      {ROW_LENS.map((len, rIdx) => {
        const row = rIdx + 1;
        return (
          <div key={row} className={`hexRow ${row % 2 ? "odd" : ""}`}>
            {Array.from({ length: len }, (_, i) => {
              const col = i + 1;
              const sel = selected.row === row && selected.col === col;
              return (
                <div
                  key={coordKey(row, col)}
                  className={`hex ${sel ? "sel" : ""}`}
                  data-row={row}
                  onClick={onCellClick ? () => onCellClick({ row, col }) : undefined}
                >
                  {showCoords && <span>{coordKey(row, col)}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const css = `
/* --- minimal but complete CSS --- */
.screen{min-height:100vh;background:#bfa8ff}
.cloudBg{position:absolute;inset:0;background:radial-gradient(circle at 50% 95%,#fff 0%,transparent 65%)}
.layout{display:grid;grid-template-columns:1fr minmax(760px,960px) 1fr}
.centerColumn{grid-column:2;display:flex;flex-direction:column;align-items:center;gap:16px}
.layerTitle{cursor:pointer;padding:10px 16px;border-radius:999px;background:#0003;color:#fff;font-weight:900}
.boardAndBar{display:grid;grid-template-columns:auto 24px;gap:16px}
.layerBar{display:grid;grid-template-rows:repeat(7,1fr);height:360px;border-radius:999px;overflow:hidden}
.barSeg{opacity:.6}
.barSeg.active{opacity:1;box-shadow:0 0 18px #fff}
.hexBoard{user-select:none}
.hexRow{display:flex}
.hexRow.odd{margin-left:40px}
.hex{width:76px;height:66px;margin-right:-19px;clip-path:polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%);background:#fff3;border:1px solid #fff5}
.hex.sel{outline:2px solid #fff}
.miniRow{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.miniPanel{background:#0002;border-radius:16px;padding:10px}
`;
