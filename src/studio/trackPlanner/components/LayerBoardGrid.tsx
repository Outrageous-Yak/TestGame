import React, { useMemo } from "react";
import type { GameState } from "../../../engine/types";
import { ROW_LENS } from "../../../engine/board";
import { hexIdAtSlot } from "../../../engine/layout";
import { hexGridPlacement, layerCssVar } from "../../../ui/game/helpers";
import { freshPlaytestState } from "../simulation/runSimulator";
import type { PlannerTrack, Pos } from "../types";
import { authoredTrackToScenario } from "../serialization/scenarioBridge";

type LayerBoardGridProps = {
  track: PlannerTrack;
  layer: number;
  playState?: GameState | null;
  selectedSlot?: Pos | null;
  solutionOverlay?: Set<string>;
  onSlotClick?: (pos: Pos, hexId: string | null) => void;
  highlightFeatures?: boolean;
};

export function LayerBoardGrid({
  track,
  layer,
  playState,
  selectedSlot,
  solutionOverlay,
  onSlotClick,
  highlightFeatures = true,
}: LayerBoardGridProps) {
  const layerBoard = track.layers.find((l) => l.layer === layer);
  const missingSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of layerBoard?.missing ?? []) {
      s.add(`${m.row},${m.col}`);
    }
    return s;
  }, [layerBoard]);

  const featureAt = (row: number, col: number) => {
    if (!highlightFeatures) return null;
    for (const f of track.features) {
      const p =
        f.kind === "portal"
          ? f.source.layer === layer
            ? f.source
            : null
          : "position" in f && f.position.layer === layer
            ? f.position
            : null;
      if (p && p.row === row && p.col === col) return f;
    }
    return null;
  };

  let state = playState;
  if (!state) {
    try {
      state = freshPlaytestState(track);
    } catch {
      state = null;
    }
  }

  return (
    <div className="tp-layerBoard">
      <div className="tp-layerHeader" style={{ borderColor: layerCssVar(layer) }}>
        Layer {layer}
      </div>
      <div className="boardScroll">
        <div className="hexGrid">
          {ROW_LENS.map((cols, row) => (
            <div key={row} className="hexRow" style={{ ["--cols" as string]: cols }}>
              {Array.from({ length: cols }, (_, col) => {
                const missing = missingSet.has(`${row},${col}`);
                const hexId = missing ? null : hexIdAtSlot(layer, row, col);
                const pos: Pos = { layer, row, col };
                const selected =
                  selectedSlot?.layer === layer &&
                  selectedSlot.row === row &&
                  selectedSlot.col === col;
                const feat = featureAt(row, col);
                const onPath = hexId && solutionOverlay?.has(hexId);
                const isPlayer = state?.playerHexId === hexId;
                return (
                  <button
                    key={col}
                    type="button"
                    className={[
                      "hexSlot",
                      "tp-hexSlot",
                      missing ? "tp-missing" : "",
                      selected ? "tp-selected" : "",
                      onPath ? "tp-solution" : "",
                      isPlayer ? "tp-player" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={hexGridPlacement(row, col)}
                    disabled={missing && !onSlotClick}
                    onClick={() => onSlotClick?.(pos, hexId)}
                    aria-label={`L${layer} R${row} C${col}`}
                  >
                    {feat ? (
                      <span className="tp-featBadge">
                        {feat.kind === "portal" ? (feat.hidden ? "P*" : "P") : feat.kind[0].toUpperCase()}
                      </span>
                    ) : null}
                    {onPath ? <span className="tp-pathDot" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AllLayersBoard({
  track,
  ...rest
}: Omit<LayerBoardGridProps, "layer">) {
  return (
    <div className="tp-allLayers">
      {[7, 6, 5, 4, 3, 2, 1].map((layer) => (
        <LayerBoardGrid key={layer} track={track} layer={layer} {...rest} />
      ))}
    </div>
  );
}
