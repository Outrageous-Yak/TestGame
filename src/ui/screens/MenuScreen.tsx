import React, { useEffect, useState } from "react";
import type { ScenarioEntry, Track, WorldEntry } from "../types";
import { getBestScore } from "../bestScore";
import { loadTrackOptimalMap } from "../trackMenuStats";

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

function formatScore(n: number | null | undefined): string {
  if (n == null) return "—";
  return String(n);
}

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
  const [trackOptimals, setTrackOptimals] = useState<Record<string, number | null>>({});
  const [optimalsLoading, setOptimalsLoading] = useState(false);

  const tracks = scenarioEntry?.tracks ?? [];
  const showTrackList = tracks.length > 1;

  useEffect(() => {
    const list = scenarioEntry?.tracks;
    if (!list || list.length <= 1) {
      setTrackOptimals({});
      setOptimalsLoading(false);
      return;
    }

    let cancelled = false;
    setOptimalsLoading(true);
    loadTrackOptimalMap(list)
      .then((map) => {
        if (!cancelled) setTrackOptimals(map);
      })
      .finally(() => {
        if (!cancelled) setOptimalsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioEntry?.id]);

  return (
    <div className="appRoot" style={themeVars}>
      <div className="screen center menuScreenScroll">
        <div className="panel wide menuPanelScroll">
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

          {showTrackList ? (
            <div className="tracks">
              <div className="tracksTitle">Tracks</div>
              <div className="trackListScroll" role="listbox" aria-label="Tracks">
                <div className="trackListHeader" aria-hidden="true">
                  <span className="trackListColName">Track</span>
                  <span className="trackListColStat">Least</span>
                  <span className="trackListColStat">Your best</span>
                </div>
                {tracks.map((t) => {
                  const active = t.id === trackId;
                  const optimal = trackOptimals[t.id];
                  const best = scenarioEntry ? getBestScore(scenarioEntry.id, t.id) : null;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={"trackListRow " + (active ? "active" : "")}
                      onClick={() => onSelectTrack(t.id)}
                    >
                      <span className="trackListColName">{t.name}</span>
                      <span className="trackListColStat trackListColNum">
                        {optimalsLoading && optimal == null ? "…" : formatScore(optimal)}
                      </span>
                      <span className="trackListColStat trackListColNum">{formatScore(best)}</span>
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
              {tracks.length === 1 ? "Only one track available." : "No tracks for this scenario (it will start normally)."}
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
