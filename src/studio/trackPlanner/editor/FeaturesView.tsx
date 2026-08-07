import React, { useMemo, useState, useEffect } from "react";
import type {
  PlannerScenario,
  PlannerTrack,
  PlannerWorld,
  Pos,
  TrackFeature,
  CardColor,
  PortalFeature,
} from "../types";
import { newId } from "../catalog";
import type { VillainKey } from "../../../ui/types";
import { ROW_LENS } from "../../../engine/board";
import { LayerBoardGrid } from "../components/LayerBoardGrid";
import { canPlaceOnSlot } from "../features/featureOccupancy";
import { withPortalDestination } from "../features/portalEdit";

type FeaturesViewProps = {
  track: PlannerTrack;
  world?: PlannerWorld;
  scenario?: PlannerScenario;
  selectedLayer: number;
  featureTool: TrackFeature["kind"] | null;
  selectedFeatureId: string | null;
  onTrackChange: (track: PlannerTrack) => void;
  onSelectFeature: (id: string | null) => void;
  onSelectLayer: (layer: number) => void;
};

function posLabel(p: Pos): string {
  return `L${p.layer} R${p.row} C${p.col}`;
}

function featureAt(track: PlannerTrack, pos: Pos): TrackFeature | undefined {
  return track.features.find((f) => {
    const p =
      f.kind === "portal"
        ? f.source
        : "position" in f
          ? f.position
          : null;
    return p && posLabel(p) === posLabel(pos);
  });
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

  useEffect(() => {
    if (!selectedPortal) setPickingPortalDest(false);
  }, [selectedPortal?.id]);

  const placeFeature = (pos: Pos) => {
    if (!featureTool) return;

    const slotCheck = canPlaceOnSlot(track, featureTool, pos);
    if (!slotCheck.ok) {
      if (slotCheck.existingId) onSelectFeature(slotCheck.existingId);
      return;
    }

    const next = { ...track, features: [...track.features] };

    const removeAt = (kind: TrackFeature["kind"]) => {
      if (kind === "start" || kind === "goal") {
        next.features = next.features.filter((f) => f.kind !== kind);
      }
    };

    if (featureTool === "start") {
      removeAt("start");
      next.features.push({ kind: "start", id: newId("start"), position: { ...pos } });
    } else if (featureTool === "goal") {
      removeAt("goal");
      next.features.push({ kind: "goal", id: newId("goal"), position: { ...pos } });
    } else if (featureTool === "portal") {
      next.features.push({
        kind: "portal",
        id: newId("portal"),
        portalId: `portal_${next.features.filter((f) => f.kind === "portal").length + 1}`,
        source: { ...pos },
        direction: "UP",
        destination: { layer: Math.min(7, pos.layer + 1), row: pos.row, col: pos.col },
        hidden: false,
      });
    } else if (featureTool === "card") {
      next.features.push({
        kind: "card",
        id: newId("card"),
        position: { ...pos },
        cardType: "RED",
        contentMode: "specific",
      });
    } else if (featureTool === "encounter") {
      next.features.push({
        kind: "encounter",
        id: newId("encounter"),
        position: { ...pos },
        mode: "random",
      });
    } else if (featureTool === "villain") {
      next.features.push({
        kind: "villain",
        id: newId("villain"),
        position: { ...pos },
        mode: "random",
        villainKey: villainPool[0],
      });
    }
    onTrackChange(next);
  };

  const updateFeature = (id: string, patch: Partial<TrackFeature>) => {
    onTrackChange({
      ...track,
      features: track.features.map((f) => (f.id === id ? { ...f, ...patch } as TrackFeature : f)),
    });
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

  const removeFeature = (id: string) => {
    onTrackChange({ ...track, features: track.features.filter((f) => f.id !== id) });
    onSelectFeature(null);
    setPickingPortalDest(false);
  };

  const handleSlotClick = (pos: Pos) => {
    onSelectLayer(pos.layer);

    if (pickingPortalDest && selectedPortal) {
      setPortalDestination(selectedPortal, pos);
      return;
    }

    if (featureTool) {
      placeFeature(pos);
      return;
    }

    const hit = featureAt(track, pos);
    if (hit) onSelectFeature(hit.id);
  };

  const layerFeatures = useMemo(
    () =>
      track.features.filter((f) => {
        const p =
          f.kind === "portal"
            ? f.source
            : "position" in f
              ? f.position
              : null;
        return p?.layer === selectedLayer;
      }),
    [track.features, selectedLayer],
  );

  const portalDestOnLayer =
    selectedPortal && selectedPortal.destination.layer === selectedLayer
      ? selectedPortal.destination
      : null;

  return (
    <div className={`tp-featuresView${pickingPortalDest ? " tp-pickingPortalDest" : ""}`}>
      <div className="tp-featuresList">
        <h3>Layer {selectedLayer} features</h3>
        <label className="tp-jumpLayer">
          View layer
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
        <ul>
          {layerFeatures.map((f) => (
            <li key={f.id}>
              <button type="button" className="btn tp-listBtn" onClick={() => onSelectFeature(f.id)}>
                {f.kind} — {f.id}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {pickingPortalDest ? (
        <p className="tp-selectionHint">
          Click a hex to set where <strong>{selectedPortal?.portalId}</strong> lands. Switch layers above
          to pick a destination on another floor.
        </p>
      ) : null}

      <LayerBoardGrid
        track={track}
        layer={selectedLayer}
        selectedSlot={selectedPortal?.source.layer === selectedLayer ? selectedPortal.source : null}
        portalDestination={portalDestOnLayer}
        onSlotClick={(pos) => handleSlotClick(pos)}
      />

      {selected ? (
        <div className="tp-inspector">
          <h3>Edit {selected.kind}</h3>
          {selected.kind === "portal" ? (
            <>
              <div className="tp-portalEndpoints">
                <div>
                  <strong>From</strong> {posLabel(selected.source)}
                </div>
                <div>
                  <strong>To</strong> {posLabel(selected.destination)}
                </div>
              </div>
              <label>
                Hidden
                <input
                  type="checkbox"
                  checked={!!selected.hidden}
                  onChange={(e) => updateFeature(selected.id, { hidden: e.target.checked })}
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
                  <option value="UP">UP</option>
                  <option value="DOWN">DOWN</option>
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
                        setPortalDestination(selected, {
                          ...selected.destination,
                          layer,
                        });
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
                        setPortalDestination(selected, {
                          ...selected.destination,
                          row,
                          col,
                        });
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
                        setPortalDestination(selected, {
                          ...selected.destination,
                          col,
                        });
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
                  {pickingPortalDest ? "Done picking" : "Pick on board"}
                </button>
                <button
                  type="button"
                  className="btn tp-miniBtn"
                  onClick={() => {
                    onSelectLayer(selected.destination.layer);
                    setPickingPortalDest(false);
                  }}
                >
                  Go to destination layer
                </button>
              </div>
            </>
          ) : null}
          {selected.kind === "card" ? (
            <>
              <label>
                Type
                <select
                  value={selected.cardType}
                  onChange={(e) =>
                    updateFeature(selected.id, { cardType: e.target.value as CardColor })
                  }
                >
                  {(["RED", "BLUE", "GREEN", "BLACK", "RANDOM", "HIDDEN"] as CardColor[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ),
                  )}
                </select>
              </label>
              {selected.cardType === "HIDDEN" ? (
                <label>
                  Resolved
                  <select
                    value={selected.resolvedType ?? "RED"}
                    onChange={(e) =>
                      updateFeature(selected.id, {
                        resolvedType: e.target.value as Exclude<CardColor, "RANDOM" | "HIDDEN">,
                      })
                    }
                  >
                    <option value="RED">RED</option>
                    <option value="BLUE">BLUE</option>
                    <option value="GREEN">GREEN</option>
                    <option value="BLACK">BLACK</option>
                  </select>
                </label>
              ) : null}
              <label>
                Hidden
                <input
                  type="checkbox"
                  checked={!!selected.hidden}
                  onChange={(e) => updateFeature(selected.id, { hidden: e.target.checked })}
                />
              </label>
            </>
          ) : null}
          {selected.kind === "villain" ? (
            <>
              <label>
                Mode
                <select
                  value={selected.mode}
                  onChange={(e) =>
                    updateFeature(selected.id, {
                      mode: e.target.value as "specific" | "random",
                    })
                  }
                >
                  <option value="specific">Specific</option>
                  <option value="random">Random</option>
                </select>
              </label>
              {selected.mode === "specific" ? (
                <select
                  value={selected.villainKey ?? villainPool[0]}
                  onChange={(e) =>
                    updateFeature(selected.id, { villainKey: e.target.value as VillainKey })
                  }
                >
                  {villainPool.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : null}
            </>
          ) : null}
          <button type="button" className="btn" onClick={() => removeFeature(selected.id)}>
            Remove feature
          </button>
        </div>
      ) : (
        <p className="tp-hint">Select a feature type in the toolbar, then tap a hex.</p>
      )}
    </div>
  );
}
