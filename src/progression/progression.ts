import type { ScenarioEntry, Track, WorldEntry } from "../ui/types";
import { progressionTrackKey } from "./keys";
import type {
  NextTrackResolution,
  ProgressionMode,
  ProgressionRequirement,
  ProgressionSaveV1,
  TrackProgressStatus,
} from "./types";

export function resolveWorldProgressionMode(world: WorldEntry): ProgressionMode {
  return world.progression?.mode ?? "OPEN";
}

export function resolveScenarioProgressionMode(
  world: WorldEntry,
  scenario: ScenarioEntry
): ProgressionMode {
  return scenario.progression?.mode ?? resolveWorldProgressionMode(world);
}

export function isTrackCompleted(
  progress: ProgressionSaveV1,
  worldId: string,
  trackId: string
): boolean {
  const key = progressionTrackKey(worldId, trackId);
  return !!progress.completedTracks[key];
}

export function requirementsMet(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  requires: ProgressionRequirement[] | undefined
): boolean {
  if (!requires || requires.length === 0) return true;
  return requires.every((req) => requirementMet(progress, worlds, req));
}

function requirementMet(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  req: ProgressionRequirement
): boolean {
  switch (req.type) {
    case "TRACK_COMPLETE":
      return isTrackCompleted(progress, req.worldId, req.trackId);
    case "SCENARIO_COMPLETE":
      return isScenarioCompleted(progress, worlds, req.worldId, req.scenarioId);
    case "WORLD_COMPLETE":
      return isWorldCompleted(progress, worlds, req.worldId);
    default:
      return true;
  }
}

function orderedTracks(scenario: ScenarioEntry): Track[] {
  const tracks = scenario.tracks ?? [];
  return [...tracks].sort((a, b) => {
    const ao = a.progression?.order;
    const bo = b.progression?.order;
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    if (ao != null && bo == null) return -1;
    if (ao == null && bo != null) return 1;
    return 0;
  });
}

function requiredTracks(scenario: ScenarioEntry): Track[] {
  return orderedTracks(scenario).filter((t) => !t.progression?.optional);
}

export function getTrackStatus(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  track: Track,
  trackIndexInScenario: number,
  options?: { bypassLocks?: boolean }
): TrackProgressStatus {
  if (isTrackCompleted(progress, world.id, track.id)) {
    return "COMPLETED";
  }

  if (options?.bypassLocks) return "AVAILABLE";

  const mode = resolveScenarioProgressionMode(world, scenario);

  if (!requirementsMet(progress, worlds, track.progression?.requires)) {
    return "LOCKED";
  }

  if (!requirementsMet(progress, worlds, scenario.progression?.requires)) {
    return "LOCKED";
  }

  if (!isWorldUnlocked(progress, worlds, world)) {
    return "LOCKED";
  }

  if (mode === "OPEN") {
    return "AVAILABLE";
  }

  // SEQUENTIAL: first track available; each next requires previous required track complete
  const tracks = orderedTracks(scenario);
  const idx = tracks.findIndex((t) => t.id === track.id);
  if (idx < 0) return "LOCKED";

  if (idx === 0) return "AVAILABLE";

  for (let i = 0; i < idx; i++) {
    const prev = tracks[i];
    if (prev.progression?.optional) continue;
    if (!isTrackCompleted(progress, world.id, prev.id)) {
      return "LOCKED";
    }
  }

  return "AVAILABLE";
}

export function isTrackUnlocked(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  track: Track,
  trackIndexInScenario: number,
  options?: { bypassLocks?: boolean }
): boolean {
  return (
    getTrackStatus(progress, worlds, world, scenario, track, trackIndexInScenario, options) !==
    "LOCKED"
  );
}

export function recordTrackCompletion(
  progress: ProgressionSaveV1,
  worldId: string,
  trackId: string
): ProgressionSaveV1 {
  const key = progressionTrackKey(worldId, trackId);
  const existing = progress.completedTracks[key];
  const now = new Date().toISOString();

  if (existing) {
    return {
      ...progress,
      completedTracks: {
        ...progress.completedTracks,
        [key]: {
          ...existing,
          completionCount: existing.completionCount + 1,
        },
      },
    };
  }

  return {
    ...progress,
    completedTracks: {
      ...progress.completedTracks,
      [key]: {
        completionCount: 1,
        firstCompletedAt: now,
      },
    },
  };
}

export function isScenarioCompleted(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  worldId: string,
  scenarioId: string
): boolean {
  const world = worlds.find((w) => w.id === worldId);
  if (!world) return false;
  const scenario = world.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return false;

  const tracks = requiredTracks(scenario);
  if (tracks.length === 0) return true;

  return tracks.every((t) => isTrackCompleted(progress, worldId, t.id));
}

export function isScenarioUnlocked(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  options?: { bypassLocks?: boolean }
): boolean {
  if (options?.bypassLocks) return true;

  if (!isWorldUnlocked(progress, worlds, world)) return false;

  if (!requirementsMet(progress, worlds, scenario.progression?.requires)) {
    return false;
  }

  const mode = resolveScenarioProgressionMode(world, scenario);
  if (mode === "OPEN") return true;

  const scenarios = [...world.scenarios].sort((a, b) => {
    const ao = a.progression?.order;
    const bo = b.progression?.order;
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    return 0;
  });

  const idx = scenarios.findIndex((s) => s.id === scenario.id);
  if (idx <= 0) return true;

  for (let i = 0; i < idx; i++) {
    const prev = scenarios[i];
    if (!isScenarioCompleted(progress, worlds, world.id, prev.id)) {
      return false;
    }
  }

  return true;
}

export function isWorldCompleted(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  worldId: string
): boolean {
  const world = worlds.find((w) => w.id === worldId);
  if (!world) return false;

  const scenarios = world.scenarios.filter((s) => resolveScenarioProgressionMode(world, s) !== "OPEN");
  const toCheck = scenarios.length > 0 ? scenarios : world.scenarios;

  return toCheck.every((s) => isScenarioCompleted(progress, worlds, worldId, s.id));
}

export function isWorldUnlocked(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  options?: { bypassLocks?: boolean }
): boolean {
  if (options?.bypassLocks) return true;

  const requires = world.progression?.requiresWorldIds;
  if (!requires || requires.length === 0) return true;

  return requires.every((wid) => isWorldCompleted(progress, worlds, wid));
}

export function getNextAvailableTrack(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  currentTrackId: string | null,
  options?: { bypassLocks?: boolean }
): NextTrackResolution {
  const tracks = orderedTracks(scenario);
  if (tracks.length === 0) {
    return { kind: "none" };
  }

  const startIdx =
    currentTrackId != null ? tracks.findIndex((t) => t.id === currentTrackId) : -1;

  for (let i = startIdx + 1; i < tracks.length; i++) {
    const t = tracks[i];
    const status = getTrackStatus(progress, worlds, world, scenario, t, i, options);
    if (status !== "LOCKED") {
      return {
        kind: "track",
        worldId: world.id,
        scenarioId: scenario.id,
        trackId: t.id,
        trackName: t.name,
      };
    }
  }

  if (isScenarioCompleted(progress, worlds, world.id, scenario.id)) {
    if (isWorldCompleted(progress, worlds, world.id)) {
      return { kind: "world_complete", worldId: world.id };
    }
    return { kind: "scenario_complete", worldId: world.id, scenarioId: scenario.id };
  }

  return { kind: "none" };
}

export function getContinueTarget(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[]
): NextTrackResolution {
  const sortedWorlds = [...worlds].sort((a, b) => {
    const ao = a.progression?.order;
    const bo = b.progression?.order;
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });

  for (const world of sortedWorlds) {
    if (!isWorldUnlocked(progress, worlds, world)) continue;

    const scenarios = [...world.scenarios].sort((a, b) => {
      const ao = a.progression?.order;
      const bo = b.progression?.order;
      if (ao != null && bo != null && ao !== bo) return ao - bo;
      return 0;
    });

    for (const scenario of scenarios) {
      if (!isScenarioUnlocked(progress, worlds, world, scenario)) continue;

      const tracks = orderedTracks(scenario);
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        const status = getTrackStatus(progress, worlds, world, scenario, t, i);
        if (status === "AVAILABLE") {
          return {
            kind: "track",
            worldId: world.id,
            scenarioId: scenario.id,
            trackId: t.id,
            trackName: t.name,
          };
        }
      }
    }
  }

  return { kind: "none" };
}

export function hasSeenMechanic(progress: ProgressionSaveV1, mechanicId: string): boolean {
  return progress.seenMechanicIntroductions.includes(mechanicId);
}

export function markMechanicSeen(
  progress: ProgressionSaveV1,
  mechanicId: string
): ProgressionSaveV1 {
  if (progress.seenMechanicIntroductions.includes(mechanicId)) {
    return progress;
  }
  return {
    ...progress,
    seenMechanicIntroductions: [...progress.seenMechanicIntroductions, mechanicId],
  };
}

export function markMechanicsIntroducedByTrack(
  progress: ProgressionSaveV1,
  track: Track
): ProgressionSaveV1 {
  const ids = track.progression?.introduces;
  if (!ids || ids.length === 0) return progress;
  let next = progress;
  for (const id of ids) {
    next = markMechanicSeen(next, id);
  }
  return next;
}
