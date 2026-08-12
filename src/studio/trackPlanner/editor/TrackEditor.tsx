import React, { useCallback, useEffect, useState } from "react";
import type {
  EditorSelection,
  EditorView,
  FeatureTool,
  PlannerScenario,
  PlannerTrack,
  PlannerWorld,
} from "../types";
import { UndoStack, cloneTrack } from "../state/authoringState";
import { saveDraftBundle, loadDraftBundle, upsertTrack, deleteBoardDraft, upsertVisibilityDraft } from "../storage";
import { hydrateTrackFromJson, scenarioJsonToTrack } from "../catalog";
import { serializeScenarioExport } from "../serialization/scenarioBridge";
import { BoardView } from "./BoardView";
import { FeaturesView } from "./FeaturesView";
import { VisibilityView } from "./VisibilityView";
import { AuditView } from "./AuditView";
import { LayerPlaytestView } from "./LayerPlaytestView";
import { SimulatorView } from "./SimulatorView";
import { SimulatorErrorBoundary } from "../components/SimulatorErrorBoundary";

const VIEWS: { id: EditorView; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "features", label: "Features" },
  { id: "visibility", label: "Visibility" },
  { id: "audit", label: "Audit" },
  { id: "layerPlaytest", label: "Layer Playtest" },
  { id: "simulator", label: "Simulator" },
];

const FEATURE_TOOLS: { id: FeatureTool; label: string }[] = [
  { id: "select", label: "Select" },
  { id: "remove", label: "Remove feature" },
  { id: "start", label: "Start" },
  { id: "goal", label: "Goal" },
  { id: "portal_up", label: "Portal UP" },
  { id: "portal_down", label: "Portal DOWN" },
  { id: "card_red", label: "Red" },
  { id: "card_blue", label: "Blue" },
  { id: "card_green", label: "Green" },
  { id: "card_black", label: "Black" },
  { id: "card_random", label: "? Random" },
  { id: "card_predetermined", label: "? Fixed" },
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
    const toSave = { ...track, builtIn: undefined, catalogStatus: undefined };
    let bundle = upsertTrack(loadDraftBundle(), toSave);
    bundle = upsertVisibilityDraft(
      bundle,
      track.worldId,
      track.scenarioId,
      track.trackId,
      track.visibility,
    );
    queueMicrotask(() => saveDraftBundle(bundle));
    onTrackSaved(toSave);
    setDirty(false);
  };

  const deleteDraft = () => {
    if (!window.confirm("Delete local draft for this track? Production content is not affected.")) return;
    const bundle = deleteBoardDraft(loadDraftBundle(), track.worldId, track.trackId);
    saveDraftBundle(bundle);
    setDirty(false);
    onBack();
  };

  const resetToProduction = async () => {
    if (!track.sourceScenarioJson) return;
    if (!window.confirm("Discard local draft and reload production board JSON?")) return;
    saveDraftBundle(deleteBoardDraft(loadDraftBundle(), track.worldId, track.trackId));
    try {
      const base = { ...track, layers: [], features: [], builtIn: true };
      const fresh = await hydrateTrackFromJson(base, async (path) => {
        const res = await fetch(path);
        if (!res.ok) throw new Error(path);
        return res.json();
      });
      undo.reset(fresh);
      setTrack(cloneTrack(fresh));
      setDirty(false);
      onTrackSaved(fresh);
    } catch {
      window.alert("Could not reload production track.");
    }
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
          {track.sourceScenarioJson ? (
            <button type="button" className="btn" onClick={() => void resetToProduction()}>
              Reset to production
            </button>
          ) : null}
          <button type="button" className="btn" onClick={deleteDraft}>
            Delete draft
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
          {FEATURE_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn tp-featureToolBtn${selection.featureTool === t.id ? " active" : ""}`}
              onClick={() =>
                setSelection((s) => ({
                  ...s,
                  featureTool: s.featureTool === t.id ? null : t.id,
                }))
              }
            >
              {t.label}
            </button>
          ))}
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
          <VisibilityView track={track} scenario={scenario} onTrackChange={applyTrack} />
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
          <SimulatorErrorBoundary>
            <SimulatorView track={track} />
          </SimulatorErrorBoundary>
        ) : null}
      </main>
    </div>
  );
}
