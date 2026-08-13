import React, { useEffect, useMemo, useState } from "react";
import type {
  CardColor,
  FeatureTool,
  PlannerScenario,
  PlannerTrack,
  PlannerWorld,
  PortalFeature,
  Pos,
} from "../types";
import type { VillainKey } from "../../../ui/types";
import { ROW_LENS } from "../../../engine/board";
import { LayerBoardGrid } from "../components/LayerBoardGrid";
import { canPlaceFeature } from "../features/featureCompatibility";
import {
  createFeatureAt,
  removeFeatureById,
  removeFeaturesAt,
  updateFeatureInTrack,
} from "../features/featurePlacement";
import { featureConfigLabel, featureListLabel, posLabel } from "../features/featureLabels";
import { withPortalDestination } from "../features/portalEdit";
import { featureOccupancyPos } from "../features/featureOccupancy";
import { CARD_RUNTIME_SUPPORT } from "../features/runtimeSupport";

type FeaturesViewProps = {
  track: PlannerTrack;
  world?: PlannerWorld;
  scenario?: PlannerScenario;
  selectedLayer: number;
  featureTool: FeatureTool | null;
  selectedFeatureId: string | null;
  onTrackChange: (track: PlannerTrack) => void;
  onSelectFeature: (id: string | null) => void;
  onSelectLayer: (layer: number) => void;
};

function cardTypeFromTool(tool: FeatureTool): CardColor | null {
  switch (tool) {
    case "card_red":
      return "RED";
    case "card_blue":
      return "BLUE";
    case "card_green":
      return "GREEN";
    case "card_black":
      return "BLACK";
    case "card_random":
      return "RANDOM";
    case "card_predetermined":
      return "HIDDEN";
    default:
      return null;
  }
}

function inBounds(p: Pos): boolean {
  if (p.layer < 1 || p.layer > 7) return false;
  if (p.row < 0 || p.row >= ROW_LENS.length) return false;
  return p.col >= 0 && p.col < ROW_LENS[p.row];
}

export function FeaturesView({
  track,
  world,
  scenario,
  selectedLayer,
  featureTool,
  selectedFeatureId,
  onTrackChange,
  onSelectFeature,
  onSelectLayer,
}: FeaturesViewProps) {
  const [pickingPortalDest, setPickingPortalDest] = useState(false);
  const selected = track.features.find((f) => f.id === selectedFeatureId) ?? null;
  const selectedPortal = selected?.kind === "portal" ? selected : null;

  const villainPool = scenario?.allowedVillains?.length
    ? scenario.allowedVillains
    : world?.villainPool ?? [];
  const encounterPool = scenario?.allowedEncounters?.length
    ? scenario.allowedEncounters
    : world?.encounterPool ?? [];

  useEffect(() => {
    if (!selectedPortal) setPickingPortalDest(false);
  }, [selectedPortal?.id]);

  const sortedInventory = useMemo(
    () =>
      [...track.features].sort((a, b) => {
        const pa = featureOccupancyPos(a);
        const pb = featureOccupancyPos(b);
        if (!pa || !pb) return 0;
        if (pa.layer !== pb.layer) return pb.layer - pa.layer;
        if (pa.row !== pb.row) return pa.row - pb.row;
        return pa.col - pb.col;
      }),
    [track.features],
  );

  const applyPlacement = (tool: FeatureTool, pos: Pos) => {
    const cardType = cardTypeFromTool(tool);
    let kind: "start" | "goal" | "portal_up" | "portal_down" | "card";
    if (tool === "portal_up") kind = "portal_up";
    else if (tool === "portal_down") kind = "portal_down";
    else if (tool === "start") kind = "start";
    else if (tool === "goal") kind = "goal";
    else if (cardType) kind = "card";
    else return;

    const check = canPlaceFeature(track, kind, pos);
    if (!check.ok) {
      if (check.existingId) onSelectFeature(check.existingId);
      return;
    }

    const next = createFeatureAt(track, kind, pos, {
      cardType: cardType ?? undefined,
      villainPool,
      encounterPool,
    });
    onTrackChange(next);
    const placed = next.features.find((f) => {
      const p = featureOccupancyPos(f);
      return p && posLabel(p) === posLabel(pos);
    });
    if (placed) onSelectFeature(placed.id);
  };

  const setPortalDestination = (portal: PortalFeature, dest: Pos) => {
    if (!inBounds(dest)) return;
    onTrackChange({
      ...track,
      features: track.features.map((f) =>
        f.id === portal.id && f.kind === "portal" ? withPortalDestination(f, dest) : f,
      ),
    });
  };

  const handleSlotClick = (pos: Pos) => {
    onSelectLayer(pos.layer);

    if (pickingPortalDest && selectedPortal) {
      setPortalDestination(selectedPortal, pos);
      setPickingPortalDest(false);
      return;
    }

    if (featureTool === "remove") {
      const hit = track.features.find((f) => {
        const p = featureOccupancyPos(f);
        return p && posLabel(p) === posLabel(pos);
      });
      if (hit) {
        onTrackChange(removeFeatureById(track, hit.id));
        onSelectFeature(null);
      } else {
        onTrackChange(removeFeaturesAt(track, pos));
      }
      return;
    }

    if (featureTool && featureTool !== "select") {
      applyPlacement(featureTool, pos);
      return;
    }

    const hit = track.features.find((f) => {
      const p = featureOccupancyPos(f);
      return p && posLabel(p) === posLabel(pos);
    });
    if (hit) onSelectFeature(hit.id);
  };

  const jumpToFeature = (id: string) => {
    const f = track.features.find((x) => x.id === id);
    if (!f) return;
    const p = featureOccupancyPos(f);
    if (p) onSelectLayer(p.layer);
    onSelectFeature(id);
  };

  const portalDestOnLayer =
    selectedPortal && selectedPortal.destination.layer === selectedLayer
      ? selectedPortal.destination
      : null;

  return (
    <div className={`tp-featuresView${pickingPortalDest ? " tp-pickingPortalDest" : ""}`}>
      <aside className="tp-featureInventory">
        <h3>Track features ({track.features.length})</h3>
        <ul className="tp-featureInventoryList">
          {sortedInventory.map((f) => {
            const p = featureOccupancyPos(f);
            return (
              <li key={f.id}>
                <button
                  type="button"
                  className={`btn tp-listBtn${selectedFeatureId === f.id ? " active" : ""}`}
                  onClick={() => jumpToFeature(f.id)}
                >
                  <span className="tp-featBadge">{featureListLabel(f)}</span>
                  {p ? posLabel(p) : "—"} — {featureConfigLabel(f)}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {pickingPortalDest ? (
        <p className="tp-selectionHint">
          Tap a hex to set portal destination for <strong>{selectedPortal?.portalId}</strong>.
        </p>
      ) : null}

      <div className="tp-featuresBoardWrap">
        <label className="tp-jumpLayer">
          Layer
          <select
            className="tp-select"
            value={selectedLayer}
            onChange={(e) => onSelectLayer(Number(e.target.value))}
          >
            {[7, 6, 5, 4, 3, 2, 1].map((l) => (
              <option key={l} value={l}>
                Layer {l}
              </option>
            ))}
          </select>
        </label>

        <LayerBoardGrid
          track={track}
          layer={selectedLayer}
          selectedSlot={selectedPortal?.source.layer === selectedLayer ? selectedPortal.source : null}
          portalDestination={portalDestOnLayer}
          onSlotClick={(pos) => handleSlotClick(pos)}
        />
      </div>

      {selected ? (
        <div className="tp-inspector">
          <h3>{featureListLabel(selected)}</h3>
          <p className="tp-hint">
            {featureOccupancyPos(selected) ? posLabel(featureOccupancyPos(selected)!) : "—"}
          </p>

          {selected.kind === "portal" ? (
            <>
              <div className="tp-portalEndpoints">
                <div>
                  <strong>FROM</strong> {posLabel(selected.source)}
                </div>
                <div>
                  <strong>TO</strong> {posLabel(selected.destination)}
                </div>
              </div>
              <label>
                Hidden (authoring)
                <input
                  type="checkbox"
                  checked={!!selected.hidden}
                  onChange={(e) =>
                    onTrackChange(updateFeatureInTrack(track, selected.id, { hidden: e.target.checked }))
                  }
                />
              </label>
              <label>
                Direction
                <select
                  value={selected.direction}
                  onChange={(e) => {
                    const direction = e.target.value as "UP" | "DOWN";
                    const layerDelta = direction === "UP" ? 1 : -1;
                    const nextLayer = Math.min(7, Math.max(1, selected.source.layer + layerDelta));
                    setPortalDestination(selected, {
                      layer: nextLayer,
                      row: selected.destination.row,
                      col: selected.destination.col,
                    });
                  }}
                >
                  <option value="UP">Portal UP</option>
                  <option value="DOWN">Portal DOWN</option>
                </select>
              </label>
              <fieldset className="tp-coordFieldset">
                <legend>Destination</legend>
                <div className="tp-coordRow">
                  <label>
                    Layer
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={selected.destination.layer}
                      onChange={(e) => {
                        const layer = Number(e.target.value);
                        if (!Number.isFinite(layer)) return;
                        setPortalDestination(selected, { ...selected.destination, layer });
                      }}
                    />
                  </label>
                  <label>
                    Row
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={selected.destination.row}
                      onChange={(e) => {
                        const row = Number(e.target.value);
                        if (!Number.isFinite(row)) return;
                        const col = Math.min(selected.destination.col, ROW_LENS[row] - 1);
                        setPortalDestination(selected, { ...selected.destination, row, col });
                      }}
                    />
                  </label>
                  <label>
                    Col
                    <input
                      type="number"
                      min={0}
                      max={ROW_LENS[selected.destination.row] - 1}
                      value={selected.destination.col}
                      onChange={(e) => {
                        const col = Number(e.target.value);
                        if (!Number.isFinite(col)) return;
                        setPortalDestination(selected, { ...selected.destination, col });
                      }}
                    />
                  </label>
                </div>
              </fieldset>
              <div className="tp-inspectorActions">
                <button
                  type="button"
                  className={`btn${pickingPortalDest ? " active" : ""}`}
                  onClick={() => setPickingPortalDest((v) => !v)}
                >
                  {pickingPortalDest ? "Done picking" : "Pick destination on board"}
                </button>
              </div>
            </>
          ) : null}

          {selected.kind === "card" ? (
            <>
              {selected.cardType === "RED" ? (
                <>
                  <p className="tp-inspectorTitle">RED — Encounter</p>
                  <label>
                    Resolution
                    <select
                      value={selected.contentMode ?? "random"}
                      onChange={(e) =>
                        onTrackChange(
                          updateFeatureInTrack(track, selected.id, {
                            contentMode: e.target.value as "random" | "specific",
                          }),
                        )
                      }
                    >
                      <option value="random">Random from pool</option>
                      <option value="specific">Specific</option>
                    </select>
                  </label>
                  <label>
                    Tier (optional — Step 5C)
                    <select
                      value={selected.encounterTier ? String(selected.encounterTier) : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onTrackChange(
                          updateFeatureInTrack(track, selected.id, {
                            encounterTier: v ? (Number(v) as 1 | 2 | 3 | 4) : undefined,
                          }),
                        );
                      }}
                    >
                      <option value="">Unset (no silent default)</option>
                      <option value="1">Tier 1</option>
                      <option value="2">Tier 2</option>
                      <option value="3">Tier 3</option>
                      <option value="4">Tier 4</option>
                    </select>
                  </label>
                  {(selected.contentMode ?? "random") === "specific" ? (
                    <label>
                      Villain
                      <select
                        value={selected.villainKey ?? villainPool[0]}
                        onChange={(e) =>
                          onTrackChange(
                            updateFeatureInTrack(track, selected.id, {
                              villainKey: e.target.value as VillainKey,
                              contentMode: "specific",
                            }),
                          )
                        }
                      >
                        {villainPool.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </>
              ) : null}

              {selected.cardType === "RANDOM" ? (
                <p className="tp-hint">
                  ? RANDOM — resolves to RED/BLUE/GREEN/BLACK at play time.
                  {!CARD_RUNTIME_SUPPORT.RANDOM.runtime ? " Runtime support pending." : ""}
                </p>
              ) : null}

              {selected.cardType === "HIDDEN" ? (
                <>
                  <p className="tp-inspectorTitle">? PREDETERMINED</p>
                  <label>
                    Hidden result
                    <select
                      value={selected.resolvedType ?? "RED"}
                      onChange={(e) =>
                        onTrackChange(
                          updateFeatureInTrack(track, selected.id, {
                            resolvedType: e.target.value as Exclude<CardColor, "RANDOM" | "HIDDEN">,
                          }),
                        )
                      }
                    >
                      <option value="RED">RED</option>
                      <option value="BLUE">BLUE</option>
                      <option value="GREEN">GREEN</option>
                      <option value="BLACK">BLACK</option>
                    </select>
                  </label>
                </>
              ) : null}

              {(selected.cardType === "BLUE" ||
                selected.cardType === "GREEN" ||
                selected.cardType === "BLACK") && (
                <p className="tp-hint">
                  {selected.cardType} — placement metadata only. No gameplay effect defined yet.
                </p>
              )}

              <label>
                Hidden (authoring)
                <input
                  type="checkbox"
                  checked={!!selected.hidden}
                  onChange={(e) =>
                    onTrackChange(updateFeatureInTrack(track, selected.id, { hidden: e.target.checked }))
                  }
                />
              </label>
            </>
          ) : null}

          <button
            type="button"
            className="btn"
            onClick={() => {
              onTrackChange(removeFeatureById(track, selected.id));
              onSelectFeature(null);
            }}
          >
            Remove feature
          </button>
        </div>
      ) : (
        <p className="tp-hint">Choose a tool, then tap a logical hex. Features attach to L/R/C coordinates.</p>
      )}
    </div>
  );
}
