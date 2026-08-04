import React, { useMemo } from "react";
import type { GameState } from "../../../engine/types";
import { ROW_LENS } from "../../../engine/board";
import { hexIdAtSlot, rowShiftLabel } from "../../../engine/layout";
import {
  hexGridPlacement,
  getHexFromState,
  isBlockedOrMissing,
  portalTransitionAt,
  toPublicUrl,
  layerCssVar,
} from "../../../ui/game/helpers";
import { resolveTileVisualType, tileArtRelPath } from "../../../ui/tileArt";
import { buildPortalColorMap } from "../studioOverlay";

export type OverlayOptions = {
  portals: boolean;
  missing: boolean;
  blocked: boolean;
  rowMovement: boolean;
  heatMap: boolean;
  animateRows: boolean;
};

type BoardViewerProps = {
  state: GameState | null;
  viewLayer: number;
  scenarioJsonPath?: string;
  backgroundUrl?: string;
  overlays: OverlayOptions;
  heatMap?: Map<string, number>;
  replayHighlightHex?: string | null;
  onHexClick?: (hexId: string) => void;
  playtestEnabled?: boolean;
  boardRef?: React.RefObject<HTMLDivElement>;
};

function heatColor(count: number, max: number): string {
  if (max <= 0 || count <= 0) return "transparent";
  const t = count / max;
  if (t < 0.25) return "rgba(59, 130, 246, 0.45)";
  if (t < 0.5) return "rgba(34, 197, 94, 0.5)";
  if (t < 0.75) return "rgba(234, 179, 8, 0.55)";
  return "rgba(239, 68, 68, 0.6)";
}

export function BoardViewer({
  state,
  viewLayer,
  backgroundUrl,
  overlays,
  heatMap,
  replayHighlightHex,
  onHexClick,
  playtestEnabled = true,
  boardRef,
}: BoardViewerProps) {
  const rows = useMemo(() => Array.from({ length: ROW_LENS.length }, (_, i) => i), []);
  const maxHeat = useMemo(() => {
    if (!heatMap) return 0;
    let m = 0;
    for (const v of heatMap.values()) m = Math.max(m, v);
    return m;
  }, [heatMap]);

  const startId = state ? `L${state.scenario.start.layer}-R${state.scenario.start.row}-C${state.scenario.start.col}` : null;
  const goalId = state
    ? `L${state.scenario.goal.layer}-R${state.scenario.goal.row}-C${state.scenario.goal.col}`
    : null;
  const playerId = state?.playerHexId ?? null;

  const portalColorMap = useMemo(
    () => buildPortalColorMap(state?.scenario.transitions),
    [state?.scenario.transitions]
  );

  const movement = state?.scenario.movement ?? {};

  return (
    <div className="ps-boardWrap boardWrap studioBoard" ref={boardRef}>
      <div className="ps-layerBar">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((layer) => (
          <div
            key={layer}
            className={`ps-layerSeg${viewLayer === layer ? " active" : ""}`}
            data-layer={layer}
            style={{ background: layerCssVar(layer) }}
          />
        ))}
      </div>

      {backgroundUrl ? (
        <div
          className="boardLayerBg"
          style={{ backgroundImage: `url(${toPublicUrl(backgroundUrl)})` }}
        />
      ) : null}

      <div className="boardScroll">
        <div className="board ps-board">
          <div className="hexGrid ps-hexGrid showCoords">
            {rows.map((r) => {
              const cols = ROW_LENS[r] ?? 0;
              return (
                <div key={`row-${r}`} className="hexRow">
                  {Array.from({ length: cols }, (_, c) => {
                    const id = state ? hexIdAtSlot(state, viewLayer, r, c) : null;
                    const cellStyle = hexGridPlacement(r, c);

                    if (!id) {
                      return <div key={`e-${r}-${c}`} className="hexSlot empty" style={cellStyle} />;
                    }

                    const hex = getHexFromState(state, id);
                    const bm = isBlockedOrMissing(hex);
                    const isMissingCell = bm.missing;
                    const isBlockedCell = bm.blocked && !bm.missing;

                    if (isMissingCell && !overlays.missing) {
                      return <div key={id} className="hexSlot empty" style={cellStyle} />;
                    }

                    const tr = state ? portalTransitionAt(state as any, id) : null;
                    const isPortalUp = tr?.type === "UP";
                    const isPortalDown = tr?.type === "DOWN";
                    const isPlayer = playerId === id;
                    const isStart = startId === id;
                    const isGoal = goalId === id;
                    const isReplay = replayHighlightHex === id;

                    const tileVisual = resolveTileVisualType({
                      revealed: true,
                      blocked: bm.blocked,
                      isGoal,
                      isStart,
                      isPortalUp: overlays.portals ? false : isPortalUp,
                      isPortalDown: overlays.portals ? false : isPortalDown,
                    });
                    const tileArtUrl = toPublicUrl(tileArtRelPath(tileVisual));

                    const heat = heatMap?.get(id) ?? 0;
                    const portalColor = portalColorMap.get(id);
                    const rowPat = movement[String(viewLayer)] ?? "NONE";
                    const rowLabel =
                      overlays.rowMovement && state && rowPat !== "NONE"
                        ? rowShiftLabel(state, viewLayer, r)
                        : "";

                    let overlayClass = "";
                    if (overlays.missing && isMissingCell) overlayClass = "ps-missing";
                    else if (overlays.blocked && isBlockedCell) overlayClass = "ps-blocked";
                    else if (overlays.missing && !isMissingCell && !isBlockedCell) overlayClass = "ps-normal";

                    return (
                      <div key={id} className="hexSlot" style={cellStyle}>
                        {overlays.rowMovement && rowLabel ? (
                          <div className={`ps-rowShift${overlays.animateRows ? " animate" : ""}`}>
                            {rowLabel}
                          </div>
                        ) : null}
                        {overlays.portals && portalColor ? (
                          <div className="ps-portalOverlay" style={{ borderColor: portalColor }}>
                            <span className="ps-portalArrow">
                              {isPortalUp ? "↑" : isPortalDown ? "↓" : "•"}
                            </span>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className={[
                            "hex",
                            bm.blocked ? "blocked" : "",
                            isPlayer ? "player" : "",
                            isGoal ? "goal" : "",
                            isStart ? "portalStart" : "",
                            isPortalUp && !overlays.portals ? "portalUp" : "",
                            isPortalDown && !overlays.portals ? "portalDown" : "",
                            overlayClass,
                            isReplay ? "ps-replayHex" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={{
                            ["--tileArt" as string]: `url(${tileArtUrl})`,
                            backgroundColor:
                              overlays.heatMap && heat > 0
                                ? heatColor(heat, maxHeat)
                                : undefined,
                          }}
                          disabled={!playtestEnabled || bm.blocked || bm.missing}
                          onClick={() => onHexClick?.(id)}
                        >
                          <div className="hexCoords">
                            <div className="hexId">{r},{c}</div>
                          </div>
                          {!overlays.portals && (isPortalUp || isPortalDown) ? (
                            <div className="hexMarks">
                              {isPortalUp ? <span className="mark">↑</span> : null}
                              {isPortalDown ? <span className="mark">↓</span> : null}
                            </div>
                          ) : null}
                          {isGoal ? (
                            <div className="hexMarks">
                              <span className="mark g">G</span>
                            </div>
                          ) : null}
                          {isPlayer ? <div className="ps-playerDot" /> : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {overlays.portals && state?.scenario.transitions?.length ? (
        <div className="ps-portalLegend">
          {state.scenario.transitions.map((t) => {
            const from = `L${t.from.layer}-R${t.from.row}-C${t.from.col}`;
            const to = `L${t.to.layer}-R${t.to.row}-C${t.to.col}`;
            const color = portalColorMap.get(from) ?? "#888";
            return (
              <div key={from} className="ps-portalLegendItem">
                <span className="ps-portalDot" style={{ background: color }} />
                <span>{t.type}</span>
                <span className="ps-portalPath">{from} → {to}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
