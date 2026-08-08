import type { PlannerDraftBundle, PlannerScenario, PlannerTrack, PlannerWorld, VisibilityOverlay } from "./types";
import { boardDraftKey, visibilityDraftKey } from "./catalogKeys";

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

/** Persist user-authored worlds/scenarios and board drafts (never built-in production stubs). */
export function saveDraftBundle(bundle: PlannerDraftBundle): void {
  const slim: PlannerDraftBundle = {
    version: 1,
    worlds: bundle.worlds.filter((w) => !w.builtIn),
    scenarios: bundle.scenarios.filter((s) => !s.builtIn),
    tracks: bundle.tracks.filter((t) => !t.builtIn),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch (e) {
    console.warn("Track Planner draft save failed", e);
  }
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
  const worlds = bundle.worlds.filter((w) => w.worldId !== world.worldId).concat({ ...world, builtIn: undefined });
  return { ...bundle, worlds };
}

export function upsertScenario(bundle: PlannerDraftBundle, scenario: PlannerScenario): PlannerDraftBundle {
  const scenarios = bundle.scenarios
    .filter((s) => s.scenarioId !== scenario.scenarioId)
    .concat({ ...scenario, builtIn: undefined });
  return { ...bundle, scenarios };
}

/** Upsert a board draft keyed by world + registered track id (shared across scenario variants). */
export function upsertTrack(bundle: PlannerDraftBundle, track: PlannerTrack): PlannerDraftBundle {
  const key = boardDraftKey(track.worldId, track.trackId);
  const toStore: PlannerTrack = { ...track, builtIn: undefined, catalogStatus: undefined };
  const tracks = bundle.tracks
    .filter((t) => boardDraftKey(t.worldId, t.trackId) !== key)
    .concat(toStore);
  return { ...bundle, tracks };
}

/** Upsert scenario-specific visibility presentation (does not affect board draft identity). */
export function upsertVisibilityDraft(
  bundle: PlannerDraftBundle,
  worldId: string,
  scenarioId: string,
  trackId: string,
  visibility: VisibilityOverlay[],
): PlannerDraftBundle {
  const key = visibilityDraftKey(worldId, scenarioId, trackId);
  const visibilityDrafts = { ...(bundle.visibilityDrafts ?? {}) };
  visibilityDrafts[key] = visibility.map((v) => ({ ...v, positions: v.positions.map((p) => ({ ...p })) }));
  return { ...bundle, visibilityDrafts };
}

export function deleteVisibilityDraft(
  bundle: PlannerDraftBundle,
  worldId: string,
  scenarioId: string,
  trackId: string,
): PlannerDraftBundle {
  const key = visibilityDraftKey(worldId, scenarioId, trackId);
  if (!bundle.visibilityDrafts?.[key]) return bundle;
  const visibilityDrafts = { ...bundle.visibilityDrafts };
  delete visibilityDrafts[key];
  return { ...bundle, visibilityDrafts };
}

export function deleteBoardDraft(bundle: PlannerDraftBundle, worldId: string, trackId: string): PlannerDraftBundle {
  const key = boardDraftKey(worldId, trackId);
  return {
    ...bundle,
    tracks: bundle.tracks.filter((t) => boardDraftKey(t.worldId, t.trackId) !== key),
  };
}

export function deleteWorld(bundle: PlannerDraftBundle, worldId: string): PlannerDraftBundle {
  const scenarioIds = new Set(bundle.scenarios.filter((s) => s.worldId === worldId).map((s) => s.scenarioId));
  return {
    ...bundle,
    worlds: bundle.worlds.filter((w) => w.worldId !== worldId),
    scenarios: bundle.scenarios.filter((s) => s.worldId !== worldId),
    tracks: bundle.tracks.filter((t) => t.worldId !== worldId && !scenarioIds.has(t.scenarioId)),
  };
}

export function deleteScenario(bundle: PlannerDraftBundle, scenarioId: string): PlannerDraftBundle {
  return {
    ...bundle,
    scenarios: bundle.scenarios.filter((s) => s.scenarioId !== scenarioId),
    tracks: bundle.tracks.filter((t) => t.scenarioId !== scenarioId),
  };
}

/** @deprecated Prefer deleteBoardDraft */
export function deleteTrack(bundle: PlannerDraftBundle, trackId: string): PlannerDraftBundle {
  return { ...bundle, tracks: bundle.tracks.filter((t) => t.trackId !== trackId) };
}

export { STORAGE_KEY as TRACK_PLANNER_STORAGE_KEY };
