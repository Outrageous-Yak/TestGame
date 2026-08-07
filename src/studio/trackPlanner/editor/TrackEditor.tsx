import React, { useCallback, useEffect, useState } from "react";
import type {
  EditorSelection,
  EditorView,
  PlannerScenario,
  PlannerTrack,
  PlannerWorld,
  TrackFeature,
  VisibilityStateType,
} from "../types";
import { UndoStack, cloneTrack } from "../state/authoringState";
import { saveDraftBundle, loadDraftBundle, upsertTrack } from "../storage";
import { serializeScenarioExport } from "../serialization/scenarioBridge";
import { scenarioJsonToTrack } from "../catalog";
import { BoardView } from "./BoardView";
import { FeaturesView } from "./FeaturesView";
import { VisibilityView } from "./VisibilityView";
import { AuditView } from "./AuditView";
import { LayerPlaytestView } from "./LayerPlaytestView";
import { SimulatorView } from "./SimulatorView";

const VIEWS: { id: EditorView; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "features", label: "Features" },
  { id: "visibility", label: "Visibility" },
  { id: "audit", label: "Audit" },
  { id: "layerPlaytest", label: "Layer Playtest" },
  { id: "simulator", label: "Simulator" },
];

type TrackEditorProps = {
  track: PlannerTrack;
  world?: PlannerWorld;
  scenario?: PlannerScenario;
  onTrackSaved: (track: PlannerTrack) => void;
  onBack: () => void;
};

export function TrackEditor({ track: initial, world, scenario, onTrackSaved, onBack }: TrackEditorProps) {
  const [undo] = useState(() => new UndoStack(initial));
  const [track, setTrack] = useState(() => cloneTrack(initial));
  const [dirty, setDirty] = useState(false);
  const [selection, setSelection] = useState<EditorSelection>({
    view: "board",
    layer: 7,
    selectedSlot: null,
    selectedFeatureId: null,
    boardTool: "select",
    featureTool: null,
    visibilityTool: "REGULAR",
  });

  useEffect(() => {
    undo.reset(initial);
    setTrack(cloneTrack(initial));
    setDirty(false);
  }, [initial.trackId]);

  const applyTrack = useCallback(
    (next: PlannerTrack) => {
      setTrack(next);
      undo.push(next);
      setDirty(true);
    },
    [undo],
  );

  const handleUndo = () => {
    const prev = undo.undo();
    if (prev) {
      setTrack(prev);
      setDirty(true);
    }
  };

  const handleRedo = () => {
    const next = undo.redo();
    if (next) {
      setTrack(next);
      setDirty(true);
    }
  };

  const saveDraft = () => {
    const bundle = upsertTrack(loadDraftBundle(), track);
    saveDraftBundle(bundle);
    onTrackSaved(track);
    setDirty(false);
  };

  const exportJson = () => {
    const json = serializeScenarioExport(track);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${track.trackId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        const imported = scenarioJsonToTrack(track, raw);
        applyTrack(imported);
      } catch (e) {
        console.error("Import failed", e);
        window.alert("Could not import track JSON. Check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const jumpToFeature = (featureId: string, view: EditorView) => {
    const f = track.features.find((x) => x.id === featureId);
    const layer =
      f && f.kind === "portal"
        ? f.source.layer
        : f && "position" in f
          ? f.position.layer
          : selection.layer;
    setSelection((s) => ({
      ...s,
      view,
      selectedFeatureId: featureId,
      layer,
    }));
  };

  return (
    <div className="tp-editor">
      <header className="tp-editorHeader">
        <button type="button" className="btn" onClick={onBack}>
          ← Back
        </button>
        <h2>{track.name}</h2>
        {dirty ? <span className="tp-dirty">Unsaved changes</span> : null}
        <div className="tp-editorActions">
          <button type="button" className="btn" onClick={handleUndo}>
            Undo
          </button>
          <button type="button" className="btn" onClick={handleRedo}>
            Redo
          </button>
          <button type="button" className="btn" onClick={saveDraft}>
            Save draft
          </button>
          <button type="button" className="btn primary" onClick={exportJson}>
            Export JSON
          </button>
          <label className="btn tp-importBtn">
            Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="tp-fileInput"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </header>

      <nav className="tp-viewTabs">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`btn tp-tab${selection.view === v.id ? " active" : ""}`}
            onClick={() => setSelection((s) => ({ ...s, view: v.id }))}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {selection.view === "board" ? (
        <div className="tp-subToolbar">
          <button
            type="button"
            className={`btn${selection.boardTool === "remove" ? " active" : ""}`}
            onClick={() =>
              setSelection((s) => ({
                ...s,
                boardTool: s.boardTool === "remove" ? "select" : "remove",
              }))
            }
          >
            Remove hex
          </button>
          <button
            type="button"
            className={`btn${selection.boardTool === "restore" ? " active" : ""}`}
            onClick={() =>
              setSelection((s) => ({
                ...s,
                boardTool: s.boardTool === "restore" ? "select" : "restore",
              }))
            }
          >
            Restore hex
          </button>
        </div>
      ) : null}

      {selection.view === "features" ? (
        <div className="tp-subToolbar tp-featureTools">
          {(["start", "goal", "portal", "card", "encounter", "villain"] as TrackFeature["kind"][]).map(
            (k) => (
              <button
                key={k}
                type="button"
                className={`btn${selection.featureTool === k ? " active" : ""}`}
                onClick={() =>
                  setSelection((s) => ({
                    ...s,
                    featureTool: s.featureTool === k ? null : k,
                  }))
                }
              >
                {k}
              </button>
            ),
          )}
        </div>
      ) : null}

      <main className="tp-editorMain">
        {selection.view === "board" ? (
          <BoardView
            track={track}
            selectedLayer={selection.layer}
            boardTool={selection.boardTool}
            selectedSlot={selection.selectedSlot}
            onTrackChange={applyTrack}
            onSelectSlot={(pos) => setSelection((s) => ({ ...s, selectedSlot: pos }))}
            onSelectLayer={(layer) => setSelection((s) => ({ ...s, layer }))}
          />
        ) : null}
        {selection.view === "features" ? (
          <FeaturesView
            track={track}
            world={world}
            scenario={scenario}
            selectedLayer={selection.layer}
            featureTool={selection.featureTool}
            selectedFeatureId={selection.selectedFeatureId}
            onTrackChange={applyTrack}
            onSelectFeature={(id) => setSelection((s) => ({ ...s, selectedFeatureId: id }))}
            onSelectLayer={(layer) => setSelection((s) => ({ ...s, layer }))}
          />
        ) : null}
        {selection.view === "visibility" ? (
          <VisibilityView
            track={track}
            visibilityTool={selection.visibilityTool}
            onTrackChange={applyTrack}
          />
        ) : null}
        {selection.view === "audit" ? (
          <AuditView
            track={track}
            world={world}
            scenario={scenario}
            onJumpToFeature={jumpToFeature}
          />
        ) : null}
        {selection.view === "layerPlaytest" ? (
          <LayerPlaytestView
            track={track}
            selectedLayer={selection.layer}
            onSelectLayer={(layer) => setSelection((s) => ({ ...s, layer }))}
          />
        ) : null}
        {selection.view === "simulator" ? (
          <SimulatorView track={track} />
        ) : null}
      </main>
    </div>
  );
}
