import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { WorldEntry } from "../../ui/types";
import type { PlannerDraftBundle, PlannerScenario, PlannerTrack, PlannerWorld } from "./types";
import { createEmptyTrack } from "./types";
import {
  emptyBundle,
  loadDraftBundle,
  saveDraftBundle,
  upsertScenario,
  upsertTrack,
  upsertWorld,
} from "./storage";
import { mergeBundles, newId, seedBundleFromWorlds, hydrateTrackFromJson } from "./catalog";
import { TrackEditor } from "./editor/TrackEditor";
import { TrackPlannerErrorBoundary } from "./components/TrackPlannerErrorBoundary";
import "./trackPlanner.css";

type Screen =
  | "home"
  | "worldNew"
  | "scenarioNew"
  | "trackNew"
  | "editor";

type TrackPlannerScreenProps = {
  themeVars: React.CSSProperties;
  worlds: WorldEntry[];
  onBack: () => void;
};

export function TrackPlannerScreen({ themeVars, worlds, onBack }: TrackPlannerScreenProps) {
  const [bundle, setBundle] = useState<PlannerDraftBundle>(() => emptyBundle());
  const [catalogReady, setCatalogReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [editingTrack, setEditingTrack] = useState<PlannerTrack | null>(null);
  const [expandedWorlds, setExpandedWorlds] = useState<Set<string>>(new Set());
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [openingTrack, setOpeningTrack] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setBundle(mergeBundles(seedBundleFromWorlds(worlds), loadDraftBundle()));
      setCatalogReady(true);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [worlds]);

  const persist = useCallback((next: PlannerDraftBundle) => {
    setBundle(next);
    window.setTimeout(() => saveDraftBundle(next), 0);
  }, []);

  const selectedWorld = bundle.worlds.find((w) => w.worldId === selectedWorldId);
  const selectedScenario = bundle.scenarios.find((s) => s.scenarioId === selectedScenarioId);

  const scenariosForWorld = useMemo(
    () => bundle.scenarios.filter((s) => s.worldId === selectedWorldId),
    [bundle.scenarios, selectedWorldId],
  );

  const tracksForScenario = useMemo(
    () => bundle.tracks.filter((t) => t.scenarioId === selectedScenarioId),
    [bundle.tracks, selectedScenarioId],
  );

  const openTrack = async (track: PlannerTrack) => {
    setOpeningTrack(true);
    setFormError(null);
    let t = track;
    const needsHydrate =
      !!track.sourceScenarioJson &&
      (track.layers.length === 0 || track.features.length === 0);
    if (needsHydrate) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        t = await hydrateTrackFromJson(track, async (path) => {
          const res = await fetch(path, { signal: controller.signal });
          if (!res.ok) throw new Error(`Failed to load ${path}`);
          return res.json();
        });
      } catch {
        setFormError("Could not load track data. Try again.");
        setOpeningTrack(false);
        return;
      } finally {
        window.clearTimeout(timeout);
      }
    }
    setEditingTrack(t);
    setScreen("editor");
    setOpeningTrack(false);
  };

  const resolveWorldId = (): string | null => {
    if (selectedWorldId) return selectedWorldId;
    const sc = bundle.scenarios.find((s) => s.scenarioId === selectedScenarioId);
    return sc?.worldId ?? null;
  };

  const createWorld = () => {
    const worldId = newId("world");
    const w: PlannerWorld = {
      worldId,
      name: formName || "New World",
      encounterPool: [],
      villainPool: ["bad1", "bad2", "bad3", "bad4"],
      scenarioIds: [],
    };
    persist(upsertWorld(bundle, w));
    setSelectedWorldId(worldId);
    setFormName("");
    setScreen("home");
  };

  const createScenario = () => {
    if (!selectedWorldId) return;
    const scenarioId = newId("scenario");
    const sc: PlannerScenario = {
      scenarioId,
      worldId: selectedWorldId,
      name: formName || "New Scenario",
      trackOrder: [],
      allowedEncounters: [],
      allowedVillains: selectedWorld?.villainPool ?? [],
    };
    const world = bundle.worlds.find((w) => w.worldId === selectedWorldId);
    if (world) {
      persist(
        upsertWorld(upsertScenario(bundle, sc), {
          ...world,
          scenarioIds: [...world.scenarioIds, scenarioId],
        }),
      );
    } else {
      persist(upsertScenario(bundle, sc));
    }
    setSelectedScenarioId(scenarioId);
    setFormName("");
    setScreen("home");
  };

  const createTrack = () => {
    const worldId = resolveWorldId();
    if (!selectedScenarioId || !worldId) {
      setFormError("Select a scenario in the list below first (tap a scenario name).");
      return;
    }
    setFormError(null);
    const trackId = newId("track");
    const track = createEmptyTrack(
      trackId,
      selectedScenarioId,
      worldId,
      formName.trim() || "New Track",
    );
    setFormName("");
    setEditingTrack(track);
    setScreen("editor");
    window.setTimeout(() => {
      setBundle((prev) => {
        const sc = prev.scenarios.find((s) => s.scenarioId === selectedScenarioId);
        const next = sc
          ? upsertTrack(
              upsertScenario(prev, { ...sc, trackOrder: [...sc.trackOrder, trackId] }),
              track,
            )
          : upsertTrack(prev, track);
        saveDraftBundle(next);
        return next;
      });
    }, 0);
  };

  if (screen === "editor" && editingTrack) {
    return (
      <div className="appRoot tp-root" style={themeVars}>
        <TrackPlannerErrorBoundary
          onBack={() => {
            setScreen("home");
            setEditingTrack(null);
          }}
        >
          <TrackEditor
            track={editingTrack}
            world={bundle.worlds.find((w) => w.worldId === editingTrack.worldId)}
            scenario={bundle.scenarios.find((s) => s.scenarioId === editingTrack.scenarioId)}
            onTrackSaved={(t) => {
              persist(upsertTrack(bundle, t));
              setEditingTrack(t);
            }}
            onBack={() => {
              setScreen("home");
              setEditingTrack(null);
            }}
          />
        </TrackPlannerErrorBoundary>
      </div>
    );
  }

  if (!catalogReady) {
    return (
      <div className="appRoot tp-root" style={themeVars}>
        <div className="screen tp-home">
          <div className="panel tp-panel">
            <p className="tp-hint">Loading Track Planner…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="appRoot tp-root" style={themeVars}>
      <div className="screen tp-home">
        <div className="panel tp-panel">
          <header className="tp-homeHeader">
            <button type="button" className="btn" onClick={onBack}>
              ← Start
            </button>
            <h1>Track Planner</h1>
          </header>

          <div className="tp-homeActions">
            <button type="button" className="btn primary" onClick={() => setScreen("worldNew")}>
              New World
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selectedWorldId}
              onClick={() => {
                setFormError(null);
                setScreen("scenarioNew");
              }}
            >
              Add Scenario
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selectedScenarioId || openingTrack}
              onClick={() => {
                setFormName("");
                setFormError(null);
                setScreen("trackNew");
              }}
            >
              Add Track
            </button>
          </div>

          {selectedScenario ? (
            <p className="tp-selectionHint">
              Selected: <b>{selectedWorld?.name ?? "World"}</b> → <b>{selectedScenario.name}</b>
            </p>
          ) : (
            <p className="tp-selectionHint tp-hint">
              Expand a world below and tap a scenario name before adding a track.
            </p>
          )}

          {formError ? <p className="tp-formError">{formError}</p> : null}

          {openingTrack ? (
            <p className="tp-hint">Loading track…</p>
          ) : null}

          {(screen === "worldNew" || screen === "scenarioNew" || screen === "trackNew") && (
            <div className="tp-form">
              <input
                className="tp-input"
                placeholder="Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (screen === "worldNew") createWorld();
                  else if (screen === "scenarioNew") createScenario();
                  else createTrack();
                }}
              >
                Create
              </button>
              <button type="button" className="btn" onClick={() => setScreen("home")}>
                Cancel
              </button>
            </div>
          )}

          <section className="tp-browse">
            <h2>Browse existing</h2>
            {bundle.worlds.map((world) => {
              const open = expandedWorlds.has(world.worldId);
              const scenarios = bundle.scenarios.filter((s) => s.worldId === world.worldId);
              return (
                <div key={world.worldId} className="tp-worldBlock">
                  <button
                    type="button"
                    className={`tp-worldTitle${selectedWorldId === world.worldId ? " selected" : ""}`}
                    onClick={() => {
                      setSelectedWorldId(world.worldId);
                      setExpandedWorlds((prev) => {
                        const n = new Set(prev);
                        if (n.has(world.worldId)) n.delete(world.worldId);
                        else n.add(world.worldId);
                        return n;
                      });
                    }}
                  >
                    {open ? "▼" : "▶"} {world.name}
                    {world.builtIn ? " (shipped)" : ""}
                  </button>
                  {open
                    ? scenarios.map((sc) => {
                        const tracks = bundle.tracks.filter((t) => t.scenarioId === sc.scenarioId);
                        return (
                          <div key={sc.scenarioId} className="tp-scenarioBlock">
                            <button
                              type="button"
                              className={`tp-scenarioTitle${
                                selectedScenarioId === sc.scenarioId ? " selected" : ""
                              }`}
                              onClick={() => {
                                setSelectedScenarioId(sc.scenarioId);
                                setSelectedWorldId(world.worldId);
                                setFormError(null);
                              }}
                            >
                              {sc.name}
                            </button>
                            <ul className="tp-trackList">
                              {tracks.map((tr) => (
                                <li key={tr.trackId}>
                                  <button
                                    type="button"
                                    className="btn tp-trackBtn"
                                    onClick={() => openTrack(tr)}
                                  >
                                    {tr.name}
                                    {tr.builtIn ? " · built-in" : ""}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
