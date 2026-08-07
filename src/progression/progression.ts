import type { ScenarioEntry, Track, WorldEntry } from "../ui/types";
import { progressionTrackKey } from "./progressionTrackKey";
import type {
  NextTrackResolution,
  ProgressionContext,
  ProgressionMode,
  ProgressionRequirement,
  ProgressionSaveV1,
  TrackProgressStatus,
} from "./types";

export function getWorldProgressionMode(world: WorldEntry): ProgressionMode {
  return world.progression?.progressionMode ?? "OPEN";
}

export function getScenarioProgressionMode(world: WorldEntry, scenario: ScenarioEntry): ProgressionMode {
  return scenario.progression?.progressionMode ?? world.progression?.progressionMode ?? "OPEN";
}

export function getOrderedWorlds(worlds: WorldEntry[]): WorldEntry[] {
  return [...worlds].sort((a, b) => {
    const ao = a.progression?.order ?? worlds.indexOf(a);
    const bo = b.progression?.order ?? worlds.indexOf(b);
    return ao - bo;
  });
}

export function getOrderedScenarios(world: WorldEntry): ScenarioEntry[] {
  const scenarios = world.scenarios;
  return [...scenarios].sort((a, b) => {
    const ao = a.progression?.order ?? scenarios.indexOf(a);
    const bo = b.progression?.order ?? scenarios.indexOf(b);
    return ao - bo;
  });
}

export function getOrderedTracks(scenario: ScenarioEntry): Track[] {
  const tracks = scenario.tracks ?? [];
  return [...tracks].sort((a, b) => {
    const ao = a.progression?.order ?? tracks.indexOf(a);
    const bo = b.progression?.order ?? tracks.indexOf(b);
    return ao - bo;
  });
}

export function getRequiredTracks(scenario: ScenarioEntry): Track[] {
  return getOrderedTracks(scenario).filter((t) => !t.progression?.optional);
}

export function isTrackCompleted(
  save: ProgressionSaveV1,
  worldId: string,
  trackId: string,
): boolean {
  return save.completedTracks[progressionTrackKey(worldId, trackId)]?.completed === true;
}

export function isRequirementMet(
  save: ProgressionSaveV1,
  worlds: WorldEntry[],
  req: ProgressionRequirement,
): boolean {
  switch (req.type) {
    case "TRACK_COMPLETE":
      return isTrackCompleted(save, req.worldId, req.trackId);
    case "SCENARIO_COMPLETE": {
      const world = worlds.find((w) => w.id === req.worldId);
      if (!world) return false;
      const scenario = world.scenarios.find((s) => s.id === req.scenarioId);
      if (!scenario) return false;
      return isScenarioCompleted(save, world, scenario);
    }
    case "WORLD_COMPLETE": {
      const world = worlds.find((w) => w.id === req.worldId);
      if (!world) return false;
      return isWorldCompleted(save, world);
    }
    default:
      return false;
  }
}

function areExplicitRequirementsMet(
  save: ProgressionSaveV1,
  worlds: WorldEntry[],
  track: Track,
): boolean {
  const reqs = track.progression?.requires ?? [];
  return reqs.every((r) => isRequirementMet(save, worlds, r));
}

function isPreviousSequentialTrackCompleted(
  save: ProgressionSaveV1,
  world: WorldEntry,
  scenario: ScenarioEntry,
  track: Track,
  orderedTracks: Track[],
): boolean {
  const idx = orderedTracks.findIndex((t) => t.id === track.id);
  if (idx <= 0) return true;
  const prev = orderedTracks[idx - 1];
  return isTrackCompleted(save, world.id, prev.id);
}

export function isTrackUnlocked(
  save: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  trackId: string,
): boolean {
  const orderedTracks = getOrderedTracks(scenario);
  const track = orderedTracks.find((t) => t.id === trackId);
  if (!track) return false;

  if (!isScenarioUnlocked(save, worlds, world, scenario)) return false;

  if (!areExplicitRequirementsMet(save, worlds, track)) return false;

  const mode = getScenarioProgressionMode(world, scenario);
  if (mode === "OPEN") return true;

  if (!isPreviousSequentialTrackCompleted(save, world, scenario, track, orderedTracks)) {
    return false;
  }
  return true;
}

export function getTrackStatus(
  save: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  trackId: string,
): TrackProgressStatus {
  if (isTrackCompleted(save, world.id, trackId)) return "COMPLETED";
  if (isTrackUnlocked(save, worlds, world, scenario, trackId)) return "AVAILABLE";
  return "LOCKED";
}

export function isScenarioCompleted(
  save: ProgressionSaveV1,
  world: WorldEntry,
  scenario: ScenarioEntry,
): boolean {
  const requiredTrackIds = scenario.progression?.requiredTrackIds;
  if (requiredTrackIds?.length) {
    return requiredTrackIds.every((id) => isTrackCompleted(save, world.id, id));
  }

  const required = getRequiredTracks(scenario);
  if (required.length === 0) {
    const tracks = getOrderedTracks(scenario);
    if (tracks.length === 0) return false;
    return tracks.every((t) => isTrackCompleted(save, world.id, t.id));
  }
  return required.every((t) => isTrackCompleted(save, world.id, t.id));
}

export function isScenarioUnlocked(
  save: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
): boolean {
  if (!isWorldUnlocked(save, worlds, world)) return false;

  const worldMode = getWorldProgressionMode(world);
  const scenarioMode = getScenarioProgressionMode(world, scenario);

  const scenarioReqs = scenario.progression?.requiresScenarioIds ?? [];
  for (const sid of scenarioReqs) {
    const reqScenario = world.scenarios.find((s) => s.id === sid);
    if (reqScenario && !isScenarioCompleted(save, world, reqScenario)) return false;
  }

  if (worldMode === "OPEN" && scenarioMode === "OPEN") return true;

  if (scenarioMode === "SEQUENTIAL") {
    const ordered = getOrderedScenarios(world);
    const idx = ordered.findIndex((s) => s.id === scenario.id);
    if (idx <= 0) return true;
    for (let i = 0; i < idx; i++) {
      if (!isScenarioCompleted(save, world, ordered[i])) return false;
    }
  }

  return true;
}

export function isWorldCompleted(save: ProgressionSaveV1, world: WorldEntry): boolean {
  const requiredScenarioIds = world.progression?.requiredScenarioIds;
  if (requiredScenarioIds?.length) {
    return requiredScenarioIds.every((sid) => {
      const scenario = world.scenarios.find((s) => s.id === sid);
      return scenario ? isScenarioCompleted(save, world, scenario) : true;
    });
  }

  const scenarios = getOrderedScenarios(world);
  const required = scenarios.filter((s) => !s.progression?.optional);
  const target = required.length > 0 ? required : scenarios;
  if (target.length === 0) return false;
  return target.every((s) => isScenarioCompleted(save, world, s));
}

export function isWorldUnlocked(
  save: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
): boolean {
  const mode = getWorldProgressionMode(world);
  const reqs = world.progression?.requiresWorldIds ?? [];
  for (const wid of reqs) {
    const reqWorld = worlds.find((w) => w.id === wid);
    if (reqWorld && !isWorldCompleted(save, reqWorld)) return false;
  }

  if (mode === "OPEN") return true;

  const ordered = getOrderedWorlds(worlds);
  const idx = ordered.findIndex((w) => w.id === world.id);
  if (idx <= 0) return true;
  for (let i = 0; i < idx; i++) {
    if (!isWorldCompleted(save, ordered[i])) return false;
  }
  return true;
}

export function recordTrackCompletion(
  save: ProgressionSaveV1,
  worldId: string,
  trackId: string,
  options?: { incrementCount?: boolean },
): ProgressionSaveV1 {
  const key = progressionTrackKey(worldId, trackId);
  const existing = save.completedTracks[key];
  if (existing?.completed) {
    if (!options?.incrementCount) return save;
    return {
      ...save,
      completedTracks: {
        ...save.completedTracks,
        [key]: {
          ...existing,
          completionCount: (existing.completionCount ?? 1) + 1,
        },
      },
    };
  }

  return {
    ...save,
    completedTracks: {
      ...save.completedTracks,
      [key]: {
        completed: true,
        completionCount: 1,
        firstCompletedAt: new Date().toISOString(),
      },
    },
  };
}

export function resolveNextAvailableTrack(
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  currentTrackId: string,
  save: ProgressionSaveV1,
): NextTrackResolution {
  const ordered = getOrderedTracks(scenario);
  const idx = ordered.findIndex((t) => t.id === currentTrackId);
  if (idx < 0) return { kind: "NONE" };

  for (let i = idx + 1; i < ordered.length; i++) {
    const status = getTrackStatus(save, worlds, world, scenario, ordered[i].id);
    if (status !== "LOCKED") return { kind: "TRACK", trackId: ordered[i].id };
  }

  if (isScenarioCompleted(save, world, scenario)) {
    if (isWorldCompleted(save, world)) return { kind: "WORLD_COMPLETE" };
    return { kind: "SCENARIO_COMPLETE" };
  }
  return { kind: "NONE" };
}

export function getContinueTarget(
  worlds: WorldEntry[],
  save: ProgressionSaveV1,
): ProgressionContext | null {
  for (const world of getOrderedWorlds(worlds)) {
    if (!isWorldUnlocked(save, worlds, world)) continue;
    for (const scenario of getOrderedScenarios(world)) {
      if (!isScenarioUnlocked(save, worlds, world, scenario)) continue;
      for (const track of getOrderedTracks(scenario)) {
        const status = getTrackStatus(save, worlds, world, scenario, track.id);
        if (status === "AVAILABLE") {
          return { worldId: world.id, scenarioId: scenario.id, trackId: track.id };
        }
      }
    }
  }
  return null;
}

export function logProgressionDebug(
  save: ProgressionSaveV1,
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  trackId: string,
): void {
  if (typeof console === "undefined") return;
  const status = getTrackStatus(save, worlds, world, scenario, trackId);
  const completed = isTrackCompleted(save, world.id, trackId);
  console.info(
    `[progression] World: ${world.id} Scenario: ${scenario.id} Track: ${trackId} Completed: ${completed ? "yes" : "no"} Status: ${status}`,
  );
}
