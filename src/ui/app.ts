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

function defaultPosForLayer(_layer: number): Coord {
  // A reasonable “center-ish” start for this 7-6-7 layout:
  // row 4 exists and has 6 cells, row 3 has 7 cells.
  return { row: 4, col: 3 };
}

function isValidCell(row: number, col: number) {
  if (row < 1 || row > ROWS) return false;
  const len = ROW_LENS[row - 1];
  return col >= 1 && col <= len;
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

function layerName(layer: number) {
  return `Layer ${layer}`;
}

export default function App() {
  // Current layer you are “on”
  const [currentLayer, setCurrentLayer] = useState<number>(4);

  // Independent per-layer “current position”
  // Layer 1 is static by rule (we’ll enforce in move logic).
  const [posByLayer, setPosByLayer] = useState<Record<number, Coord>>(() => {
    const init: Record<number, Coord> = {};
    for (let l = 1; l <= 7; l++) init[l] = defaultPosForLayer(l);
    return init;
  });

  const currentPos = posByLayer[currentLayer];

  // Simple “move”: click a hex adjacent to the current position to move there.
  // (No buttons; refresh resets game.)
  const tryMoveTo = useCallback(
    (target: Coord) => {
      // Layer 1 is always static.
      if (currentLayer === 1) return;

      const from = posByLayer[currentLayer];
      if (!from) return;

      // Allow move only if neighbor (keeps it “game-like” without extra UI)
      if (!isNeighbor(from, target)) return;

      setPosByLayer((prev) => ({
        ...prev,
        [currentLayer]: { row: target.row, col: target.col },
      }));
    },
    [currentLayer, posByLayer]
  );

  // Cycle layer by clicking the layer label (no buttons)
  const cycleLayer = useCallback(() => {
    setCurrentLayer((l) => (l >= 7 ? 1 : l + 1));
  }, []);

  const belowLayer = clamp(currentLayer - 1, 1, 7);
  const aboveLayer = clamp(currentLayer + 1, 1, 7);

  // Mini boards should reflect ONLY their own layer’s movement.
  const belowPos = posByLayer[belowLayer];
  const abovePos = posByLayer[aboveLayer];

  // For mini boards, clicking the panel switches current layer (still no buttons)
  const goToLayer = useCallback((layer: number) => {
    setCurrentLayer(layer);
  }, []);

  const barSegments = useMemo(() => {
    // 7 segments, bottom = layer 1 (red), top = layer 7 (violet)
    return [7, 6, 5, 4, 3, 2, 1]; // top -> bottom visual mapping via CSS order
  }, []);

  return (
    <div className="screen">
      <style>{css}</style>

      <div className="cloudBg" aria-hidden="true" />

      <div className="layout">
        {/* Main board area */}
        <div className="centerColumn">
          <div className="layerTitleRow">
            <div className="layerTitle" data-layer={currentLayer} onClick={cycleLayer} role="button" tabIndex={0}>
              {layerName(currentLayer)}
              <span className="layerHint">click to change layer</span>
            </div>
          </div>

          <div className="boardAndBar">
            {/* Main board */}
            <div className="boardFrame">
              <HexBoard
                kind="main"
                activeLayer={currentLayer}
                selected={currentPos}
                onCellClick={tryMoveTo}
                showCoords={false}
              />
            </div>

            {/* Rainbow bar OUTSIDE on the clouds */}
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

          {/* Mini boards */}
          <div className="miniRow">
            <MiniPanel
              title="Below"
              tone="below"
              isActive={false}
              layer={belowLayer}
              onPickLayer={goToLayer}
            >
              <HexBoard
                kind="mini"
                activeLayer={belowLayer}
                selected={belowPos}
                onCellClick={undefined}
                showCoords={true}
              />
            </MiniPanel>

            <MiniPanel
              title="Current"
              tone="current"
              isActive={true}
              layer={currentLayer}
              onPickLayer={goToLayer}
            >
              <HexBoard
                kind="mini"
                activeLayer={currentLayer}
                selected={currentPos}
                onCellClick={undefined}
                showCoords={true}
              />
            </MiniPanel>

            <MiniPanel
              title="Above"
              tone="above"
              isActive={false}
              layer={aboveLayer}
              onPickLayer={goToLayer}
            >
              <HexBoard
                kind="mini"
                activeLayer={aboveLayer}
                selected={abovePos}
                onCellClick={undefined}
                showCoords={true}
              />
            </MiniPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPanel(props: {
  title: string;
  tone: "below" | "current" | "above";
  isActive: boolean;
  layer: number;
  onPickLayer: (layer: number) => void;
  children: React.ReactNode;
}) {
  const { title, tone, isActive, layer, onPickLayer, children } = props;
  return (
    <div
      className={"miniPanel " + `tone-${tone}` + (isActive ? " isActive" : "")}
      data-layer={layer}
      onClick={() => onPickLayer(layer)}
      role="button"
      tabIndex={0}
      title={`Switch to Layer ${layer}`}
    >
      <div className="miniHeader">{title}</div>
      <div className="miniBody">{children}</div>
    </div>
  );
}

function HexBoard(props: {
  kind: "main" | "mini";
  activeLayer: number;
  selected: Coord;
  onCellClick?: (c: Coord) => void;
  showCoords: boolean;
}) {
  const { kind, activeLayer, selected, onCellClick, showCoords } = props;

  return (
    <div className={"hexBoard " + (kind === "main" ? "hexBoardMain" : "hexBoardMini")} data-layer={activeLayer}>
      {ROW_LENS.map((len, rIdx) => {
        const row = rIdx + 1;
        const odd = row % 2 === 1;
        return (
          <div key={row} className={"hexRow" + (odd ? " odd" : " even")} data-row={row}>
            {Array.from({ length: len }, (_, cIdx) => {
              const col = cIdx + 1;
              const isSel = selected?.row === row && selected?.col === col;
              const cell: Coord = { row, col };

              return (
                <div
                  key={coordKey(row, col)}
                  className={"hex" + (isSel ? " isSelected" : "")}
                  data-row={row}
                  data-layer={activeLayer}
                  onClick={onCellClick ? () => onCellClick(cell) : undefined}
                  role={onCellClick ? "button" : undefined}
                  title={showCoords ? coordKey(row, col) : undefined}
                >
                  {showCoords ? <span className="hexLabel">{coordKey(row, col)}</span> : null}
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
:root{
  --ink: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.70);
}

*{ box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }

.screen{
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: radial-gradient(1200px 900px at 30% 10%, rgba(255,190,240,.55), transparent 55%),
              radial-gradient(1000px 800px at 80% 25%, rgba(160,210,255,.45), transparent 55%),
              radial-gradient(1200px 900px at 55% 65%, rgba(200,170,255,.35), transparent 60%),
              linear-gradient(180deg, #b8a7ff 0%, #cbb6ff 35%, #f0b0cf 100%);
}

.cloudBg{
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 450px at 50% 85%, rgba(255,255,255,.85), transparent 60%),
    radial-gradient(1100px 520px at 20% 92%, rgba(255,255,255,.80), transparent 62%),
    radial-gradient(1100px 520px at 80% 92%, rgba(255,255,255,.80), transparent 62%),
    radial-gradient(1200px 650px at 50% 105%, rgba(255,255,255,.90), transparent 65%);
  filter: blur(0px);
  opacity: .95;
  pointer-events: none;
}

.layout{
  position: relative;
  z-index: 1;
  height: 100vh;
  display: grid;
  grid-template-columns: 1fr minmax(760px, 980px) 1fr;
  padding: 24px 24px 18px;
}

.centerColumn{
  grid-column: 2;
  display: grid;
  grid-template-rows: auto auto 1fr;
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
  font-weight: 800;
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
  font-weight: 700;
  color: rgba(255,255,255,.70);
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
    0 25px 60px rgba(0,0,0,.18);
}

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

.barSeg{
  opacity: .95;
}

/* Layer -> color (1 bottom red ... 7 top violet) */
.barSeg[data-layer="1"]{ background: rgba(255, 92, 120, .95); }
.barSeg[data-layer="2"]{ background: rgba(255, 150, 90, .95); }
.barSeg[data-layer="3"]{ background: rgba(255, 220, 120, .95); }
.barSeg[data-layer="4"]{ background: rgba(120, 235, 170, .95); }
.barSeg[data-layer="5"]{ background: rgba(120, 220, 255, .95); }
.barSeg[data-layer="6"]{ background: rgba(135, 170, 255, .95); }
.barSeg[data-layer="7"]{ background: rgba(200, 140, 255, .95); }

.barSeg.isActive{
  position: relative;
  z-index: 2;
  outline: 1px solid rgba(255,255,255,.25);
  box-shadow:
    0 0 16px rgba(255,255,255,.35),
    0 0 30px rgba(255,255,255,.18);
}
.barSeg.isActive::after{
  content: "";
  position: absolute;
  inset: -6px;
  background: inherit;
  filter: blur(10px);
  opacity: .9;
  pointer-events: none;
  border-radius: 999px;
}

/* HEX BOARD GEOMETRY */
.hexBoard{
  --hexW: 74px;
  --hexH: calc(var(--hexW) * 0.8660254); /* √3/2 */
  display: grid;
  justify-content: center;
  gap: 0;
  user-select: none;
}

.hexBoardMain{
  --hexW: 78px;
}

.hexBoardMini{
  --hexW: 22px;
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

/* Touching: overlap the right edge by 1/4 width */
.hex{
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

  /* pastel banding by row position: violet top -> red bottom */
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.16);
  box-shadow: 0 6px 16px rgba(0,0,0,.10);
  cursor: default;
}

.hexBoardMain .hex{
  cursor: pointer;
}

/* Row-based gradient (top violet -> bottom red), consistent across boards */
.hex[data-row="1"]{ background: rgba(200, 140, 255, .28); }
.hex[data-row="2"]{ background: rgba(165, 175, 255, .28); }
.hex[data-row="3"]{ background: rgba(135, 205, 255, .28); }
.hex[data-row="4"]{ background: rgba(120, 235, 170, .24); }
.hex[data-row="5"]{ background: rgba(255, 220, 120, .22); }
.hex[data-row="6"]{ background: rgba(255, 155, 105, .22); }
.hex[data-row="7"]{ background: rgba(255, 92, 120, .24); }

/* Selected position (per-layer) */
.hex.isSelected{
  outline: 2px solid rgba(255,255,255,.35);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.18) inset,
    0 0 18px rgba(255,255,255,.18);
}
.hex.isSelected::after{
  content: "";
  position: absolute;
  inset: -6px;
  background: rgba(255,255,255,.30);
  filter: blur(12px);
  opacity: .55;
  border-radius: 999px;
  pointer-events: none;
  clip-path: polygon(
    25% 0%, 75% 0%,
    100% 50%,
    75% 100%, 25% 100%,
    0% 50%
  );
}

/* Mini labels only */
.hexLabel{
  font-size: 10px;
  font-weight: 800;
  color: rgba(0,0,0,.55);
  text-shadow: 0 1px 0 rgba(255,255,255,.35);
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

/* MINIS */
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
    0 18px 40px rgba(0,0,0,.14);
}

.miniHeader{
  text-align: center;
  font-weight: 900;
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
.tone-below .miniHeader{
  background: rgba(120, 30, 50, .45);
}

.tone-current{
  background: linear-gradient(180deg, rgba(120,235,170,.55), rgba(120,235,170,.30));
}
.tone-current .miniHeader{
  background: rgba(20, 80, 55, .45);
}

.tone-above{
  background: linear-gradient(180deg, rgba(135,170,255,.55), rgba(135,170,255,.32));
}
.tone-above .miniHeader{
  background: rgba(20, 40, 90, .45);
}

/* Keep the main board proportioned: more cloud mass below */
@media (max-height: 820px){
  .layerBar{ height: 300px; }
  .hexBoardMain{ --hexW: 70px; }
}
@media (max-width: 980px){
  .layout{ grid-template-columns: 16px 1fr 16px; }
  .miniRow{ grid-template-columns: 1fr; }
  .layerBar{ height: 280px; }
}

/* Optional: subtle hover on main board */
.hexBoardMain .hex:hover{
  outline: 1px solid rgba(255,255,255,.28);
}
`;
