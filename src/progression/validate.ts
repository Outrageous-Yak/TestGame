import type { WorldEntry } from "../ui/types";
import { progressionTrackKey } from "./keys";

export type ProgressionValidationIssue = {
  level: "error" | "warning";
  message: string;
  worldId?: string;
  scenarioId?: string;
  trackId?: string;
};

export function validateProgressionContent(worlds: WorldEntry[]): ProgressionValidationIssue[] {
  const issues: ProgressionValidationIssue[] = [];
  const worldIds = new Set(worlds.map((w) => w.id));
  const trackKeys = new Set<string>();

  for (const world of worlds) {
    for (const scenario of world.scenarios) {
      const tracks = scenario.tracks ?? [];
      for (const track of tracks) {
        const key = progressionTrackKey(world.id, track.id);
        if (trackKeys.has(key)) {
          issues.push({
            level: "warning",
            message: `Duplicate progression track key ${key} across scenario entries`,
            worldId: world.id,
            scenarioId: scenario.id,
            trackId: track.id,
          });
        }
        trackKeys.add(key);

        for (const req of track.progression?.requires ?? []) {
          issues.push(...validateRequirement(req, worldIds, worlds, world.id, scenario.id, track.id));
        }
      }

      for (const req of scenario.progression?.requires ?? []) {
        issues.push(...validateRequirement(req, worldIds, worlds, world.id, scenario.id));
      }
    }

    for (const wid of world.progression?.requiresWorldIds ?? []) {
      if (!worldIds.has(wid)) {
        issues.push({
          level: "error",
          message: `World ${world.id} requires unknown world ${wid}`,
          worldId: world.id,
        });
      }
      if (wid === world.id) {
        issues.push({
          level: "error",
          message: `World ${world.id} cannot require itself`,
          worldId: world.id,
        });
      }
    }
  }

  return issues;
}

function validateRequirement(
  req: import("./types").ProgressionRequirement,
  worldIds: Set<string>,
  worlds: WorldEntry[],
  contextWorldId: string,
  contextScenarioId?: string,
  contextTrackId?: string
): ProgressionValidationIssue[] {
  const issues: ProgressionValidationIssue[] = [];

  switch (req.type) {
    case "WORLD_COMPLETE":
      if (!worldIds.has(req.worldId)) {
        issues.push({
          level: "error",
          message: `Requirement references unknown world ${req.worldId}`,
          worldId: contextWorldId,
          scenarioId: contextScenarioId,
          trackId: contextTrackId,
        });
      }
      break;
    case "SCENARIO_COMPLETE": {
      if (!worldIds.has(req.worldId)) {
        issues.push({
          level: "error",
          message: `Requirement references unknown world ${req.worldId}`,
          worldId: contextWorldId,
          scenarioId: contextScenarioId,
          trackId: contextTrackId,
        });
        break;
      }
      const world = worlds.find((w) => w.id === req.worldId);
      if (world && !world.scenarios.some((s) => s.id === req.scenarioId)) {
        issues.push({
          level: "error",
          message: `Requirement references unknown scenario ${req.scenarioId}`,
          worldId: req.worldId,
          scenarioId: contextScenarioId,
          trackId: contextTrackId,
        });
      }
      break;
    }
    case "TRACK_COMPLETE": {
      if (!worldIds.has(req.worldId)) {
        issues.push({
          level: "error",
          message: `Requirement references unknown world ${req.worldId}`,
          worldId: contextWorldId,
          scenarioId: contextScenarioId,
          trackId: contextTrackId,
        });
        break;
      }
      const world = worlds.find((w) => w.id === req.worldId);
      const found =
        world?.scenarios.some((s) => s.tracks?.some((t) => t.id === req.trackId)) ?? false;
      if (world && !found) {
        issues.push({
          level: "error",
          message: `Requirement references unknown track ${req.trackId} in world ${req.worldId}`,
          worldId: req.worldId,
          trackId: req.trackId,
        });
      }
      break;
    }
  }

  return issues;
}
