import React, { useEffect, useMemo, useState } from "react";
import type { ScenarioEntry, Track, WorldEntry } from "../types";
import { getBestScore } from "../bestScore";
import { loadTrackOptimalMap } from "../trackMenuStats";
import {
  getTrackStatus,
  isScenarioUnlocked,
  isTrackUnlocked,
  isWorldUnlocked,
  loadProgression,
  type ProgressionSaveV1,
  type TrackProgressStatus,
} from "../../progression";

type MenuScreenProps = {
  themeVars: React.CSSProperties;
  worlds: WorldEntry[];
  world: WorldEntry | null;
  worldId: string | null;
  scenarioId: string | null;
  trackId: string | null;
  scenarioEntry: ScenarioEntry | null;
  trackEntry: Track | null;
  bypassProgressionLocks?: boolean;
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

function statusLabel(status: TrackProgressStatus): string {
  switch (status) {
    case "COMPLETED":
      return "✓";
    case "LOCKED":
      return "Locked";
    default:
      return "";
  }
}

function isForkVisibilityScenario(scenario: ScenarioEntry): boolean {
  return scenario.id.startsWith("citadel_fork_");
}

function partitionScenarios(scenarios: ScenarioEntry[]): {
  main: ScenarioEntry[];
  fork: ScenarioEntry[];
} {
  const main: ScenarioEntry[] = [];
  const fork: ScenarioEntry[] = [];
  for (const scenario of scenarios) {
    if (isForkVisibilityScenario(scenario)) fork.push(scenario);
    else main.push(scenario);
  }
  return { main, fork };
}

export function MenuScreen({
  themeVars,
  worlds,
  world,
  worldId,
  scenarioId,
  trackId,
  scenarioEntry,
  trackEntry,
  bypassProgressionLocks = false,
  onSelectWorld,
  onSelectScenario,
  onSelectTrack,
  onBack,
  onStart,
  onQuickStart,
}: MenuScreenProps) {
  const [trackOptimals, setTrackOptimals] = useState<Record<string, number | null>>({});
  const [optimalsLoading, setOptimalsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressionSaveV1>(() => loadProgression());

  useEffect(() => {
    setProgress(loadProgression());
  }, [worldId, scenarioId, trackId]);

  const tracks = scenarioEntry?.tracks ?? [];
  const showTrackList = tracks.length > 1;

  const selectedTrackStatus = useMemo(() => {
    if (!world || !scenarioEntry || !trackEntry) return "AVAILABLE" as TrackProgressStatus;
    const idx = tracks.findIndex((t) => t.id === trackEntry.id);
    return getTrackStatus(progress, worlds, world, scenarioEntry, trackEntry, idx, {
      bypassLocks: bypassProgressionLocks,
    });
  }, [world, scenarioEntry, trackEntry, tracks, progress, worlds, bypassProgressionLocks]);

  const canStartSelected =
    !!scenarioEntry &&
    (!trackEntry ||
      isTrackUnlocked(
        progress,
        worlds,
        world!,
        scenarioEntry,
        trackEntry,
        tracks.findIndex((t) => t.id === trackEntry.id),
        { bypassLocks: bypassProgressionLocks }
      ));

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

  const scenarioGroups = useMemo(
    () => (world ? partitionScenarios(world.scenarios) : { main: [], fork: [] }),
    [world]
  );

  const renderScenarioCard = (s: ScenarioEntry) => {
    if (!world) return null;
    const active = s.id === scenarioId;
    const scenarioLocked =
      !bypassProgressionLocks && !isScenarioUnlocked(progress, worlds, world, s);
    return (
      <button
        key={s.id}
        className={"card " + (active ? "active" : "") + (scenarioLocked ? " locked" : "")}
        disabled={scenarioLocked}
        onClick={() => onSelectScenario(s)}
      >
        <div className="cardTitle">
          {s.name}
          {scenarioLocked ? " · Locked" : ""}
        </div>
        <div className="cardDesc">{s.desc ?? ""}</div>
      </button>
    );
  };

  return (
    <div className="appRoot" style={themeVars}>
      <div className="screen center menuScreenScroll">
        <div className="panel wide menuPanelScroll">
          <div className="title">Choose your run</div>
          <div className="sub">Pick a world, then a scenario, then (optionally) a track.</div>

          <div className="grid" style={{ marginTop: 14 }}>
            {worlds.map((w) => {
              const active = w.id === world?.id;
              const worldLocked =
                !bypassProgressionLocks && !isWorldUnlocked(progress, worlds, w);
              return (
                <button
                  key={w.id}
                  className={"card " + (active ? "active" : "") + (worldLocked ? " locked" : "")}
                  disabled={worldLocked}
                  onClick={() => onSelectWorld(w)}
                >
                  <div className="cardTitle">
                    {w.name}
                    {worldLocked ? " · Locked" : ""}
                  </div>
                  <div className="cardDesc">{w.desc ?? ""}</div>
                </button>
              );
            })}
          </div>

          {world ? (
            <div style={{ marginTop: 16 }}>
              <div className="tracksTitle">Scenarios</div>
              <div className="grid">{scenarioGroups.main.map(renderScenarioCard)}</div>

              {scenarioGroups.fork.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <div className="tracksTitle">Portal Fork · visibility modes</div>
                  <div className="grid">{scenarioGroups.fork.map(renderScenarioCard)}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {showTrackList ? (
            <div className="tracks">
              <div className="tracksTitle">Tracks</div>
              <div className="trackListScroll" role="listbox" aria-label="Tracks">
                <div className="trackListHeader" aria-hidden="true">
                  <span className="trackListColName">Track</span>
                  <span className="trackListColStat">Status</span>
                  <span className="trackListColStat">Least</span>
                  <span className="trackListColStat">Your best</span>
                </div>
                {tracks.map((t, idx) => {
                  const active = t.id === trackId;
                  const optimal = trackOptimals[t.id];
                  const best = scenarioEntry ? getBestScore(scenarioEntry.id, t.id) : null;
                  const status = world
                    ? getTrackStatus(progress, worlds, world, scenarioEntry!, t, idx, {
                        bypassLocks: bypassProgressionLocks,
                      })
                    : "AVAILABLE";
                  const locked = status === "LOCKED";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      aria-disabled={locked}
                      className={
                        "trackListRow " +
                        (active ? "active " : "") +
                        (locked ? "locked " : "") +
                        (status === "COMPLETED" ? "completed " : "")
                      }
                      disabled={locked}
                      onClick={() => {
                        if (!locked) onSelectTrack(t.id);
                      }}
                    >
                      <span className="trackListColName">{t.name}</span>
                      <span className="trackListColStat trackListColStatus">{statusLabel(status)}</span>
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
                {selectedTrackStatus === "COMPLETED" ? " · Completed" : ""}
                {selectedTrackStatus === "LOCKED" ? " · Locked" : ""}
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

            <button className="btn primary" disabled={!canStartSelected} onClick={onStart}>
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
