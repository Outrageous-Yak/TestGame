import type { Pos, Scenario, Transition } from "../types";
import type { BoardSlot, LayerTransformId } from "./types";
import { getBoardLayerTransformById } from "./transformDefinitions";

export function transformBoardSlot(slot: BoardSlot, transformId: LayerTransformId): BoardSlot {
  return getBoardLayerTransformById(transformId).applySlot(slot);
}

export function transformPosOnLayer(pos: Pos, layer: number, transformId: LayerTransformId): Pos {
  if (pos.layer !== layer) return { ...pos };
  const slot = transformBoardSlot({ row: pos.row, col: pos.col }, transformId);
  return { layer: pos.layer, row: slot.row, col: slot.col };
}

function clonePos(pos: Pos): Pos {
  return { layer: pos.layer, row: pos.row, col: pos.col };
}

function transformPosForLayer(pos: Pos, layer: number, transformId: LayerTransformId): Pos {
  if (pos.layer !== layer) return clonePos(pos);
  return transformPosOnLayer(pos, layer, transformId);
}

function transformTransition(tr: Transition, layer: number, transformId: LayerTransformId): Transition {
  return {
    type: tr.type,
    from: transformPosForLayer(tr.from, layer, transformId),
    to: transformPosForLayer(tr.to, layer, transformId),
  };
}

export function transformScenarioLayer(
  scenario: Scenario,
  layer: number,
  transformId: LayerTransformId
): Scenario {
  if (transformId === "identity") return scenario;

  const next: Scenario = {
    ...scenario,
    start: transformPosForLayer(scenario.start, layer, transformId),
    goal: transformPosForLayer(scenario.goal, layer, transformId),
    missing: (scenario.missing ?? []).map((p) => transformPosForLayer(p, layer, transformId)),
    blocked: (scenario.blocked ?? []).map((p) => transformPosForLayer(p, layer, transformId)),
    transitions: (scenario.transitions ?? []).map((t) => transformTransition(t, layer, transformId)),
    movement: scenario.movement ? { ...scenario.movement } : {},
  };

  return next;
}
