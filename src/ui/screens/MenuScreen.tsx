import React from "react";
import type { ScenarioEntry, Track, WorldEntry } from "../types";

type MenuScreenProps = {
  themeVars: React.CSSProperties;
  worlds: WorldEntry[];
  world: WorldEntry | null;
  worldId: string | null;
  scenarioId: string | null;
  trackId: string | null;
  scenarioEntry: ScenarioEntry | null;
  trackEntry: Track | null;
  onSelectWorld: (world: WorldEntry) => void;
  onSelectScenario: (scenario: ScenarioEntry) => void;
  onSelectTrack: (trackId: string) => void;
  onBack: () => void;
  onStart: () => void;
  onQuickStart: () => void;
};

export function MenuScreen({
  themeVars,
  worlds,
  world,
  scenarioId,
  trackId,
  scenarioEntry,
  trackEntry,
  onSelectWorld,
  onSelectScenario,
  onSelectTrack,
  onBack,
  onStart,
  onQuickStart,
}: MenuScreenProps) {
  return (
    <div className="appRoot" style={themeVars}>
      <div className="screen center">
        <div className="panel wide">
          <div className="title">Choose your run</div>
          <div className="sub">Pick a world, then a scenario, then (optionally) a track.</div>

          <div className="grid" style={{ marginTop: 14 }}>
            {worlds.map((w) => {
              const active = w.id === world?.id;
              return (
                <button
                  key={w.id}
                  className={"card " + (active ? "active" : "")}
                  onClick={() => onSelectWorld(w)}
                >
                  <div className="cardTitle">{w.name}</div>
                  <div className="cardDesc">{w.desc ?? ""}</div>
                </button>
              );
            })}
          </div>

          {world ? (
            <div style={{ marginTop: 16 }}>
              <div className="tracksTitle">Scenarios</div>
              <div className="grid">
                {world.scenarios.map((s) => {
                  const active = s.id === scenarioId;
                  return (
                    <button
                      key={s.id}
                      className={"card " + (active ? "active" : "")}
                      onClick={() => onSelectScenario(s)}
                    >
                      <div className="cardTitle">{s.name}</div>
                      <div className="cardDesc">{s.desc ?? ""}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {scenarioEntry && scenarioEntry.tracks && scenarioEntry.tracks.length > 1 ? (
            <div className="tracks">
              <div className="tracksTitle">Tracks</div>
              <div className="tracksRow">
                {scenarioEntry.tracks.map((t) => {
                  const active = t.id === trackId;
                  return (
                    <button
                      key={t.id}
                      className={"chip " + (active ? "active" : "")}
                      onClick={() => onSelectTrack(t.id)}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>

              <div className="hint">
                Selected: <b>{trackEntry ? trackEntry.name : "—"}</b>
              </div>
            </div>
          ) : scenarioEntry ? (
            <div className="hint" style={{ marginTop: 12 }}>
              {scenarioEntry.tracks && scenarioEntry.tracks.length === 1
                ? "Only one track available."
                : "No tracks for this scenario (it will start normally)."}
            </div>
          ) : null}

          <div className="row">
            <button className="btn" onClick={onBack}>
              Back
            </button>

            <button className="btn primary" disabled={!scenarioEntry} onClick={onStart}>
              Start
            </button>

            <button className="btn" onClick={onQuickStart}>
              Quick start (debug)
            </button>
          </div>

          <div className="hint" style={{ marginTop: 10 }}>
            World: <b>{world ? world.name : "—"}</b> · Scenario:{" "}
            <b>{scenarioEntry ? scenarioEntry.name : "—"}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
