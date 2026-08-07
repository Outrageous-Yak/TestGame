import type { PlannerDraftBundle, PlannerScenario, PlannerTrack, PlannerWorld } from "./types";

const STORAGE_KEY = "track_planner_drafts_v1";

export function loadDraftBundle(): PlannerDraftBundle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBundle();
    const parsed = JSON.parse(raw) as PlannerDraftBundle;
    if (parsed.version !== 1) return emptyBundle();
    return parsed;
  } catch {
    return emptyBundle();
  }
}

export function saveDraftBundle(bundle: PlannerDraftBundle): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...bundle, updatedAt: new Date().toISOString() }),
  );
}

export function emptyBundle(): PlannerDraftBundle {
  return {
    version: 1,
    worlds: [],
    scenarios: [],
    tracks: [],
    updatedAt: new Date().toISOString(),
  };
}

export function upsertWorld(bundle: PlannerDraftBundle, world: PlannerWorld): PlannerDraftBundle {
  const worlds = bundle.worlds.filter((w) => w.worldId !== world.worldId).concat(world);
  return { ...bundle, worlds };
}

export function upsertScenario(bundle: PlannerDraftBundle, scenario: PlannerScenario): PlannerDraftBundle {
  const scenarios = bundle.scenarios.filter((s) => s.scenarioId !== scenario.scenarioId).concat(scenario);
  return { ...bundle, scenarios };
}

export function upsertTrack(bundle: PlannerDraftBundle, track: PlannerTrack): PlannerDraftBundle {
  const tracks = bundle.tracks.filter((t) => t.trackId !== track.trackId).concat(track);
  return { ...bundle, tracks };
}

export function deleteWorld(bundle: PlannerDraftBundle, worldId: string): PlannerDraftBundle {
  const scenarioIds = new Set(bundle.scenarios.filter((s) => s.worldId === worldId).map((s) => s.scenarioId));
  return {
    ...bundle,
    worlds: bundle.worlds.filter((w) => w.worldId !== worldId),
    scenarios: bundle.scenarios.filter((s) => s.worldId !== worldId),
    tracks: bundle.tracks.filter((t) => !scenarioIds.has(t.scenarioId)),
  };
}

export function deleteScenario(bundle: PlannerDraftBundle, scenarioId: string): PlannerDraftBundle {
  return {
    ...bundle,
    scenarios: bundle.scenarios.filter((s) => s.scenarioId !== scenarioId),
    tracks: bundle.tracks.filter((t) => t.scenarioId !== scenarioId),
  };
}

export function deleteTrack(bundle: PlannerDraftBundle, trackId: string): PlannerDraftBundle {
  return { ...bundle, tracks: bundle.tracks.filter((t) => t.trackId !== trackId) };
}
