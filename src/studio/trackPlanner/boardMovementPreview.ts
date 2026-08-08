import { ROW_LENS, posId } from "../../engine/board";
import { newGame } from "../../engine/api";
import type { GameState, Pos, Scenario, Transition } from "../../engine/types";
import { assertScenario } from "../../engine/scenario";
import { applyLayerRowMovement, getRuntimeMovement } from "../../engine/rowMovement";
import type { ScenarioMovementDefinition } from "../../engine/rowMovement/types";
import type { PlannerTrack, TrackFeature } from "./types";

function missingSetForTrack(track: PlannerTrack): Set<string> {
  const set = new Set<string>();
  for (const layer of track.layers) {
    for (const m of layer.missing) {
      set.add(posId({ layer: layer.layer, row: m.row, col: m.col }));
    }
  }
  return set;
}

function buildMovement(track: PlannerTrack): ScenarioMovementDefinition {
  const movement: ScenarioMovementDefinition = {};
  for (const layer of track.layers) {
    const rows: Record<string, { direction: "LEFT" | "RIGHT" | "NONE"; amount: number }> = {};
    let any = false;
    for (const [rowKey, inst] of Object.entries(layer.rowMovement)) {
      rows[rowKey] = { direction: inst.direction, amount: inst.amount };
      if (inst.direction !== "NONE" && inst.amount > 0) any = true;
    }
    movement[String(layer.layer)] = any ? { rows } : "NONE";
  }
  return movement;
}

function featurePosition(f: TrackFeature): Pos | null {
  if (f.kind === "portal") return f.source;
  if ("position" in f) return f.position;
  return null;
}

function findPlaceholderAnchors(missing: Set<string>): { start: Pos; goal: Pos } | null {
  let start: Pos | null = null;
  let goal: Pos | null = null;
  for (let layer = 1; layer <= 7; layer++) {
    for (let row = 0; row < ROW_LENS.length; row++) {
      for (let col = 0; col < ROW_LENS[row]; col++) {
        const p = { layer, row, col };
        if (missing.has(posId(p))) continue;
        if (!start) {
          start = p;
          continue;
        }
        if (posId(p) !== posId(start)) {
          goal = p;
          return { start, goal };
        }
      }
    }
  }
  if (start) return { start, goal: start };
  return null;
}

/** Minimum temporary scenario for authoritative row-movement preview (no full playability required). */
export function buildBoardPreviewScenario(track: PlannerTrack): Scenario | null {
  const missingHexes = missingSetForTrack(track);
  const startFeature = track.features.find((f) => f.kind === "start");
  const goalFeature = track.features.find((f) => f.kind === "goal");

  let start = startFeature ? { ...startFeature.position } : null;
  let goal = goalFeature ? { ...goalFeature.position } : null;

  if (start && missingHexes.has(posId(start))) start = null;
  if (goal && missingHexes.has(posId(goal))) goal = null;

  const placeholders = findPlaceholderAnchors(missingHexes);
  if (!placeholders) return null;
  if (!start) start = placeholders.start;
  if (!goal) goal = placeholders.goal;

  const missing: Pos[] = [];
  for (const layer of track.layers) {
    for (const p of layer.missing) {
      missing.push({ layer: layer.layer, row: p.row, col: p.col });
    }
  }

  const transitions: Transition[] = track.features
    .filter((f): f is Extract<TrackFeature, { kind: "portal" }> => f.kind === "portal")
    .map((p) => ({
      type: p.direction,
      from: { ...p.source },
      to: { ...p.destination },
    }));

  const scenario: Scenario = {
    id: track.trackId || "board_preview",
    name: track.name || "Board preview",
    layers: 7,
    start,
    goal,
    missing,
    blocked: [],
    movement: buildMovement(track),
    transitions,
    revealOnEnterGuaranteedUp: false,
  };

  try {
    assertScenario(scenario);
    return scenario;
  } catch {
    return null;
  }
}

export function canPreviewBoardMovement(track: PlannerTrack): boolean {
  return buildBoardPreviewScenario(track) !== null;
}

/** Temporary runtime state for Board movement preview — does not mutate authored track. */
export function buildMovementPreviewState(track: PlannerTrack, previewSteps: number): GameState | null {
  if (previewSteps <= 0) return null;
  try {
    const scenario = buildBoardPreviewScenario(track);
    if (!scenario) return null;
    const state = newGame(scenario);
    const movement = getRuntimeMovement(scenario);
    const maxLayer = scenario.layers ?? 7;

    for (let step = 0; step < previewSteps; step++) {
      for (let layer = 1; layer <= maxLayer; layer++) {
        if (state.movementActiveLayers.has(layer)) {
          applyLayerRowMovement(state, layer, movement);
        }
      }
      state.turn += 1;
    }
    return state;
  } catch {
    return null;
  }
}
