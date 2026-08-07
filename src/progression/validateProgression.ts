import type { ScenarioEntry, Track, WorldEntry } from "../ui/types";
import { getOrderedTracks } from "./progression";

export type ProgressionValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type ProgressionValidationResult = {
  ok: boolean;
  issues: ProgressionValidationIssue[];
};

function trackExists(worlds: WorldEntry[], worldId: string, trackId: string): boolean {
  const world = worlds.find((w) => w.id === worldId);
  if (!world) return false;
  return world.scenarios.some((s) => (s.tracks ?? []).some((t) => t.id === trackId));
}

function scenarioExists(worlds: WorldEntry[], worldId: string, scenarioId: string): boolean {
  const world = worlds.find((w) => w.id === worldId);
  if (!world) return false;
  return world.scenarios.some((s) => s.id === scenarioId);
}

function worldExists(worlds: WorldEntry[], worldId: string): boolean {
  return worlds.some((w) => w.id === worldId);
}

function validateTrackRequirements(
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  track: Track,
  issues: ProgressionValidationIssue[],
): void {
  const reqs = track.progression?.requires ?? [];
  for (const req of reqs) {
    if (req.type === "TRACK_COMPLETE") {
      if (!worldExists(worlds, req.worldId)) {
        issues.push({
          code: "MISSING_WORLD",
          message: `Track ${track.id} requires unknown world ${req.worldId}`,
          path: `${world.id}/${scenario.id}/${track.id}`,
        });
      } else if (!trackExists(worlds, req.worldId, req.trackId)) {
        issues.push({
          code: "MISSING_TRACK",
          message: `Track ${track.id} requires unknown track ${req.worldId}::${req.trackId}`,
          path: `${world.id}/${scenario.id}/${track.id}`,
        });
      }
      if (req.worldId === world.id && req.trackId === track.id) {
        issues.push({
          code: "SELF_DEPENDENCY",
          message: `Track ${track.id} cannot require itself`,
          path: `${world.id}/${scenario.id}/${track.id}`,
        });
      }
    } else if (req.type === "SCENARIO_COMPLETE") {
      if (!scenarioExists(worlds, req.worldId, req.scenarioId)) {
        issues.push({
          code: "MISSING_SCENARIO",
          message: `Track ${track.id} requires unknown scenario ${req.worldId}::${req.scenarioId}`,
          path: `${world.id}/${scenario.id}/${track.id}`,
        });
      }
    } else if (req.type === "WORLD_COMPLETE") {
      if (!worldExists(worlds, req.worldId)) {
        issues.push({
          code: "MISSING_WORLD",
          message: `Track ${track.id} requires unknown world ${req.worldId}`,
          path: `${world.id}/${scenario.id}/${track.id}`,
        });
      }
    }
  }
}

function validateScenarioRefs(
  worlds: WorldEntry[],
  world: WorldEntry,
  scenario: ScenarioEntry,
  issues: ProgressionValidationIssue[],
): void {
  for (const sid of scenario.progression?.requiresScenarioIds ?? []) {
    if (!world.scenarios.some((s) => s.id === sid)) {
      issues.push({
        code: "MISSING_SCENARIO",
        message: `Scenario ${scenario.id} requires unknown scenario ${sid}`,
        path: `${world.id}/${scenario.id}`,
      });
    }
    if (sid === scenario.id) {
      issues.push({
        code: "SELF_DEPENDENCY",
        message: `Scenario ${scenario.id} cannot require itself`,
        path: `${world.id}/${scenario.id}`,
      });
    }
  }

  for (const tid of scenario.progression?.requiredTrackIds ?? []) {
    if (!(scenario.tracks ?? []).some((t) => t.id === tid)) {
      issues.push({
        code: "MISSING_TRACK",
        message: `Scenario ${scenario.id} requiredTrackIds references unknown track ${tid}`,
        path: `${world.id}/${scenario.id}`,
      });
    }
  }
}

function validateWorldRefs(
  worlds: WorldEntry[],
  world: WorldEntry,
  issues: ProgressionValidationIssue[],
): void {
  for (const wid of world.progression?.requiresWorldIds ?? []) {
    if (!worldExists(worlds, wid)) {
      issues.push({
        code: "MISSING_WORLD",
        message: `World ${world.id} requires unknown world ${wid}`,
        path: world.id,
      });
    }
    if (wid === world.id) {
      issues.push({
        code: "SELF_DEPENDENCY",
        message: `World ${world.id} cannot require itself`,
        path: world.id,
      });
    }
  }

  for (const sid of world.progression?.requiredScenarioIds ?? []) {
    if (!world.scenarios.some((s) => s.id === sid)) {
      issues.push({
        code: "MISSING_SCENARIO",
        message: `World ${world.id} requiredScenarioIds references unknown scenario ${sid}`,
        path: world.id,
      });
    }
  }
}

/** Validate progression metadata against the production registry. Legacy content without metadata passes. */
export function validateProgressionMetadata(worlds: WorldEntry[]): ProgressionValidationResult {
  const issues: ProgressionValidationIssue[] = [];
  const seenWorldOrders = new Map<number, string>();
  const seenIds = new Set<string>();

  for (const world of worlds) {
    if (!seenIds.has(world.id)) seenIds.add(world.id);
    validateWorldRefs(worlds, world, issues);

    const wo = world.progression?.order;
    if (wo != null) {
      if (seenWorldOrders.has(wo)) {
        issues.push({
          code: "DUPLICATE_ORDER",
          message: `Duplicate world progression order ${wo}`,
          path: world.id,
        });
      }
      seenWorldOrders.set(wo, world.id);
    }

    for (const scenario of world.scenarios) {
      validateScenarioRefs(worlds, world, scenario, issues);
      for (const track of getOrderedTracks(scenario)) {
        validateTrackRequirements(worlds, world, scenario, track, issues);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
