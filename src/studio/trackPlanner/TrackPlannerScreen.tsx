import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { WorldEntry } from "../../ui/types";
import type { PlannerDraftBundle, PlannerScenario, PlannerTrack, PlannerWorld } from "./types";
import { createEmptyTrack } from "./types";
import { loadDraftBundle, saveDraftBundle, upsertScenario, upsertTrack, upsertWorld } from "./storage";
import { mergeBundles, newId, seedBundleFromWorlds, hydrateTrackFromJson } from "./catalog";
import { TrackEditor } from "./editor/TrackEditor";
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
  const [bundle, setBundle] = useState<PlannerDraftBundle>(() =>
    mergeBundles(seedBundleFromWorlds(worlds), loadDraftBundle()),
  );
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [editingTrack, setEditingTrack] = useState<PlannerTrack | null>(null);
  const [expandedWorlds, setExpandedWorlds] = useState<Set<string>>(new Set());
  const [formName, setFormName] = useState("");

  const persist = useCallback((next: PlannerDraftBundle) => {
    setBundle(next);
    saveDraftBundle(next);
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
    let t = track;
    if (track.sourceScenarioJson && track.features.length <= 2) {
      try {
        t = await hydrateTrackFromJson(track, async (path) => {
          const res = await fetch(path);
          return res.json();
        });
      } catch {
        /* keep stub */
      }
    }
    setEditingTrack(t);
    setScreen("editor");
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
    if (!selectedWorldId || !selectedScenarioId) return;
    const trackId = newId("track");
    const track = createEmptyTrack(trackId, selectedScenarioId, selectedWorldId, formName || "New Track");
    const sc = bundle.scenarios.find((s) => s.scenarioId === selectedScenarioId);
    if (sc) {
      persist(
        upsertTrack(upsertScenario(bundle, { ...sc, trackOrder: [...sc.trackOrder, trackId] }), track),
      );
    } else {
      persist(upsertTrack(bundle, track));
    }
    setFormName("");
    openTrack(track);
  };

  if (screen === "editor" && editingTrack) {
    return (
      <div className="appRoot tp-root" style={themeVars}>
        <TrackEditor
          track={editingTrack}
          world={bundle.worlds.find((w) => w.worldId === editingTrack.worldId)}
          scenario={bundle.scenarios.find((s) => s.scenarioId === editingTrack.scenarioId)}
          onTrackSaved={(t) => {
            persist(upsertTrack(bundle, t));
            setEditingTrack(t);
          }}
          onBack={() => setScreen("home")}
        />
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
              onClick={() => setScreen("scenarioNew")}
            >
              Add Scenario
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selectedScenarioId}
              onClick={() => setScreen("trackNew")}
            >
              Add Track
            </button>
          </div>

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
                              onClick={() => setSelectedScenarioId(sc.scenarioId)}
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
