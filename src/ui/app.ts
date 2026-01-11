// apps.ts
import React, { useMemo, useState, useCallback } from "react";

type Coord = { row: number; col: number };

// 7-6-7-6-7-6-7
const ROW_LENS = [7, 6, 7, 6, 7, 6, 7] as const;
const ROWS = ROW_LENS.length;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function coordKey(r: number, c: number) {
  return `r${r}c${c}`;
}

function defaultPosForLayer(): Coord {
  return { row: 4, col: 3 };
}

function isValidCell(row: number, col: number) {
  if (row < 1 || row > ROWS) return false;
  const len = ROW_LENS[row - 1];
  return col >= 1 && col <= len;
}

/* flat-top neighbor rules */
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
  return cands.filter(p => isValidCell(p.row, p.col));
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
    for (let l = 1; l <= 7; l++) o[l] = defaultPosForLayer();
    return o;
  });

  const currentPos = posByLayer[currentLayer];

  const tryMoveTo = useCallback(
    (target: Coord) => {
      if (currentLayer === 1) return;
      const from = posByLayer[currentLayer];
      if (!isNeighbor(from, target)) return;

      setPosByLayer(p => ({
        ...p,
        [currentLayer]: target,
      }));
    },
    [currentLayer, posByLayer]
  );

  const cycleLayer = useCallback(
    () => setCurrentLayer(l => (l >= 7 ? 1 : l + 1)),
    []
  );

  const belowLayer = clamp(currentLayer - 1, 1, 7);
  const aboveLayer = clamp(currentLayer + 1, 1, 7);

  const barSegments = useMemo(() => [7, 6, 5, 4, 3, 2, 1], []);

  return (
    <div className="screen">
      <style>{css}</style>
      <div className="cloudBg" />

      <div className="layout">
        <div className="centerColumn">
          <div className="layerTitleRow">
            <div className="layerTitle" onClick={cycleLayer}>
              Layer {currentLayer}
              <span className="layerHint">click</span>
            </div>
          </div>

          <div className="boardAndBar">
            <div className="boardFrame">
              <HexBoard
                kind="main"
                selected={currentPos}
                onCellClick={tryMoveTo}
                showCoords={false}
              />
            </div>

            <div className="barWrap">
              <div className="layerBar">
                {barSegments.map(l => (
                  <div
                    key={l}
                    className={"barSeg" + (l === currentLayer ? " isActive" : "")}
                    data-layer={l}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="miniRow">
            <Mini title="Below" tone="below">
              <HexBoard kind="mini" selected={posByLayer[belowLayer]} showCoords />
            </Mini>
            <Mini title="Current" tone="current">
              <HexBoard kind="mini" selected={currentPos} showCoords />
            </Mini>
            <Mini title="Above" tone="above">
              <HexBoard kind="mini" selected={posByLayer[aboveLayer]} showCoords />
            </Mini>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini(props: {
  title: string;
  tone: "below" | "current" | "above";
  children: React.ReactNode;
}) {
  return (
    <div className={"miniPanel tone-" + props.tone}>
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
    <div className={"hexBoard " + (kind === "main" ? "hexBoardMain" : "hexBoardMini")}>
      {ROW_LENS.map((len, rIdx) => {
        const row = rIdx + 1;
        const odd = row % 2 === 1;
        return (
          <div key={row} className={"hexRow" + (odd ? " odd" : "")}>
            {Array.from({ length: len }, (_, cIdx) => {
              const col = cIdx + 1;
              const sel = selected?.row === row && selected?.col === col;
              return (
                <div
                  key={coordKey(row, col)}
                  className={"hex" + (sel ? " isSelected" : "")}
                  data-row={row}
                  onClick={onCellClick ? () => onCellClick({ row, col }) : undefined}
                >
                  {showCoords && <span className="hexLabel">{coordKey(row, col)}</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* =======================
   PHASE 2 HEX POLISH CSS
======================= */
const css = `
/* unchanged layout + clouds omitted for brevity */

/* HEX GEOMETRY */
.hex{
  position: relative;
  background:
    linear-gradient(
      180deg,
      rgba(255,255,255,.35),
      rgba(255,255,255,.05)
    );
  box-shadow:
    0 4px 0 rgba(255,255,255,.35) inset,
    0 -6px 12px rgba(0,0,0,.28),
    0 10px 22px rgba(0,0,0,.22);
  transition: transform .12s ease, box-shadow .12s ease;
}

.hexBoardMain .hex{
  transform: translateY(-2px);
}

.hexBoardMain .hex:hover{
  transform: translateY(-4px);
}

.hexBoardMini .hex{
  box-shadow:
    0 2px 0 rgba(255,255,255,.25) inset,
    0 4px 10px rgba(0,0,0,.18);
}

.hex.isSelected{
  box-shadow:
    0 0 0 2px rgba(255,255,255,.55),
    0 0 18px rgba(255,255,255,.45),
    0 18px 30px rgba(0,0,0,.30);
}
`;
