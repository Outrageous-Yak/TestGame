import React, { useMemo } from "react";
import type {
  PlannerScenario,
  PlannerTrack,
  PlannerWorld,
  Pos,
  TrackFeature,
  CardColor,
} from "../types";
import { newId } from "../catalog";
import type { VillainKey } from "../../../ui/types";
import { LayerBoardGrid } from "../components/LayerBoardGrid";

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
  const selected = track.features.find((f) => f.id === selectedFeatureId) ?? null;
  const villainPool = scenario?.allowedVillains?.length
    ? scenario.allowedVillains
    : world?.villainPool ?? [];

  const placeFeature = (pos: Pos) => {
    if (!featureTool) return;
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
        destination: { layer: pos.layer + 1, row: pos.row, col: pos.col },
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

  const removeFeature = (id: string) => {
    onTrackChange({ ...track, features: track.features.filter((f) => f.id !== id) });
    onSelectFeature(null);
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

  return (
    <div className="tp-featuresView">
      <div className="tp-featuresList">
        <h3>Layer {selectedLayer} features</h3>
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

      <LayerBoardGrid
        track={track}
        layer={selectedLayer}
        selectedSlot={null}
        onSlotClick={(pos) => {
          onSelectLayer(pos.layer);
          if (featureTool) placeFeature(pos);
        }}
      />

      {selected ? (
        <div className="tp-inspector">
          <h3>Edit {selected.kind}</h3>
          {selected.kind === "portal" ? (
            <>
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
                  onChange={(e) =>
                    updateFeature(selected.id, {
                      direction: e.target.value as "UP" | "DOWN",
                    })
                  }
                >
                  <option value="UP">UP</option>
                  <option value="DOWN">DOWN</option>
                </select>
              </label>
              <div>
                Dest: L{selected.destination.layer} R{selected.destination.row} C
                {selected.destination.col}
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
