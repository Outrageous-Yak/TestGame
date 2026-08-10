import React, { useMemo } from "react";
import type { GameState } from "../../../engine/types";
import { ROW_LENS, posId } from "../../../engine/board";
import { hexIdAtSlot, findSlot } from "../../../engine/layout";
import { hexGridPlacement, layerCssVar } from "../../../ui/game/helpers";
import { freshLayerPlaytestState } from "../simulation/layerPlaytest";
import type { PlannerTrack, Pos, TrackFeature } from "../types";

type LayerBoardGridProps = {
  track: PlannerTrack;
  layer: number;
  playState?: GameState | null;
  selectedSlot?: Pos | null;
  /** Highlight a portal landing hex (e.g. while editing). */
  portalDestination?: Pos | null;
  solutionOverlay?: Set<string>;
  /** Optional move numbers for solution path hexes. */
  solutionStepByHex?: Record<string, number>;
  /** Portal landing hexes on the optimal path (distinct styling). */
  portalLandingHexIds?: Set<string>;
  /** Hex ids currently reachable for playtest movement. */
  reachableIds?: Set<string>;
  onSlotClick?: (pos: Pos, hexId: string | null) => void;
  highlightFeatures?: boolean;
  /** When false, skip building runtime game state (faster board editing). */
  showPlayer?: boolean;
  /** Allow clicking missing-slot positions (restore tool). */
  allowMissingClick?: boolean;
  /** Positions in custom visibility mask on this layer. */
  maskPositions?: Pos[];
  allMaskPositions?: Pos[];
  layerRef?: (el: HTMLDivElement | null) => void;
};

function featureLogicalId(f: TrackFeature): string | null {
  if (f.kind === "portal") return posId(f.source);
  if ("position" in f) return posId(f.position);
  return null;
}

export function LayerBoardGrid({
  track,
  layer,
  playState,
  selectedSlot,
  portalDestination,
  solutionOverlay,
  solutionStepByHex,
  portalLandingHexIds,
  reachableIds,
  onSlotClick,
  highlightFeatures = true,
  showPlayer = false,
  allowMissingClick = false,
  maskPositions,
  layerRef,
}: LayerBoardGridProps) {
  const layerBoard = track.layers.find((l) => l.layer === layer);
  const maskSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of maskPositions ?? []) {
      s.add(`${m.row},${m.col}`);
    }
    return s;
  }, [maskPositions]);

  const missingSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of layerBoard?.missing ?? []) {
      s.add(`${m.row},${m.col}`);
    }
    return s;
  }, [layerBoard]);

  /** Feature badge keyed by display slot when playState maps logical → display. */
  const featureByDisplaySlot = useMemo(() => {
    const map = new Map<string, TrackFeature>();
    if (!highlightFeatures) return map;
    for (const f of track.features) {
      const logicalId = featureLogicalId(f);
      if (!logicalId) continue;
      if (playState) {
        const slot = findSlot(playState, layer, logicalId);
        if (slot) map.set(`${slot.row},${slot.col}`, f);
      } else {
        const p =
          f.kind === "portal"
            ? f.source.layer === layer
              ? f.source
              : null
            : "position" in f && f.position.layer === layer
              ? f.position
              : null;
        if (p) map.set(`${p.row},${p.col}`, f);
      }
    }
    return map;
  }, [track.features, highlightFeatures, playState, layer]);

  let state = playState ?? null;
  if (!state && showPlayer) {
    try {
      state = freshLayerPlaytestState(track);
    } catch {
      state = null;
    }
  }

  return (
    <div className="tp-layerBoard" ref={layerRef}>
      <div className="tp-layerHeader" style={{ borderColor: layerCssVar(layer) }}>
        Layer {layer}
      </div>
      <div className="tp-boardArea">
        <div className="hexGrid tp-hexGrid">
          {ROW_LENS.map((cols, row) => (
            <div key={row} className="hexRow" style={{ ["--cols" as string]: cols }}>
              {Array.from({ length: cols }, (_, col) => {
                const authoredMissing = missingSet.has(`${row},${col}`);
                let hexId: string | null;
                let missing: boolean;
                if (state) {
                  hexId = hexIdAtSlot(state, layer, row, col);
                  const hex = hexId ? state.hexesById.get(hexId) : null;
                  missing = !hexId || !!hex?.missing;
                  if (missing) hexId = null;
                } else {
                  missing = authoredMissing;
                  hexId = missing ? null : posId({ layer, row, col });
                }
                const pos: Pos = { layer, row, col };
                const inMask = maskSet.has(`${row},${col}`);
                const selected =
                  selectedSlot?.layer === layer &&
                  selectedSlot.row === row &&
                  selectedSlot.col === col;
                const isPortalDest =
                  portalDestination?.layer === layer &&
                  portalDestination.row === row &&
                  portalDestination.col === col;
                const feat = featureByDisplaySlot.get(`${row},${col}`) ?? null;
                const onPath = !!(hexId && solutionOverlay?.has(hexId));
                const pathStep = hexId ? solutionStepByHex?.[hexId] : undefined;
                const onPortalLand = !!(hexId && portalLandingHexIds?.has(hexId));
                const isPlayer = !!(state && hexId && state.playerHexId === hexId);
                const isReach = !!(hexId && reachableIds?.has(hexId));
                return (
                  <button
                    key={col}
                    type="button"
                    className={[
                      "hexSlot",
                      "tp-hexSlot",
                      missing ? "tp-missing" : "",
                      inMask ? "tp-visMask" : "",
                      selected ? "tp-selected" : "",
                      isPortalDest ? "tp-portalDest" : "",
                      onPath ? "tp-solution" : "",
                      onPortalLand ? "tp-solutionPortal" : "",
                      isPlayer ? "tp-player" : "",
                      isReach ? "tp-reachable" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={hexGridPlacement(row, col)}
                    disabled={missing && !allowMissingClick && !onSlotClick}
                    onClick={() => onSlotClick?.(pos, hexId)}
                    aria-label={missing ? `Missing L${layer} R${row} C${col}` : `L${layer} R${row} C${col}`}
                  >
                    {missing ? <span className="tp-missingGhost" aria-hidden /> : null}
                    {!missing ? <span className="hex tp-hexFace" aria-hidden /> : null}
                    {inMask ? <span className="tp-visMaskBadge" aria-hidden>V</span> : null}
                    {feat ? (
                      <span className="tp-featBadge">
                        {feat.kind === "portal" ? (feat.hidden ? "P*" : "P") : feat.kind[0].toUpperCase()}
                      </span>
                    ) : null}
                    {isPortalDest ? <span className="tp-portalDestBadge">→</span> : null}
                    {onPath && pathStep == null ? <span className="tp-pathDot" /> : null}
                    {pathStep != null ? <span className="tp-pathStep">{pathStep}</span> : null}
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
  layerRefs,
  allowMissingClick,
  ...rest
}: Omit<LayerBoardGridProps, "layer"> & {
  layerRefs?: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
}) {
  return (
    <div className="tp-allLayers">
      {[7, 6, 5, 4, 3, 2, 1].map((layer) => (
        <LayerBoardGrid
          key={layer}
          track={track}
          layer={layer}
          allowMissingClick={allowMissingClick}
          layerRef={layerRefs ? (el) => { layerRefs.current[layer] = el; } : undefined}
          {...rest}
        />
      ))}
    </div>
  );
}
