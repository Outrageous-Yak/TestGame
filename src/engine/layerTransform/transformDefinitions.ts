import { neighborBoardSlots } from "./boardNeighbors";
import type { BoardDirection, BoardSlot, LayerTransformDefinition, LayerTransformId } from "./types";
import {
  applySlotMap,
  type SlotTransformMap,
} from "./graphAutomorphism";
import {
  buildCanonicalMapById,
  CANONICAL_TRANSFORM_IDS,
  toLayerTransformDefinition,
  type CanonicalLayerTransformId,
} from "./transformCatalog";
import { findSlotWithDirection } from "./boardDirectionSamples";

function directionBetween(from: BoardSlot, to: BoardSlot): BoardDirection | null {
  const idx = neighborBoardSlots(from).findIndex((n) => n.row === to.row && n.col === to.col);
  return idx >= 0 ? (idx as BoardDirection) : null;
}

export function transformDirectionForSlot(
  direction: BoardDirection,
  fromSlot: BoardSlot,
  map: SlotTransformMap
): BoardDirection | null {
  const neighbors = neighborBoardSlots(fromSlot);
  const target = neighbors[direction];
  if (!target) return null;
  const mappedFrom = applySlotMap(fromSlot, map);
  const mappedTarget = applySlotMap(target, map);
  return directionBetween(mappedFrom, mappedTarget);
}

function buildDefinitions(): LayerTransformDefinition[] {
  const maps = buildCanonicalMapById();
  return CANONICAL_TRANSFORM_IDS.map((id) => {
    const map = maps.get(id)!;
    return toLayerTransformDefinition(id, map, (direction) => {
      const fromSlot = findSlotWithDirection(direction);
      const mapped = transformDirectionForSlot(direction, fromSlot, map);
      if (mapped == null) {
        throw new Error(`Direction ${direction} unsupported for transform ${id} at sample slot`);
      }
      return mapped;
    });
  });
}

let cachedDefinitions: LayerTransformDefinition[] | null = null;

export function getBoardLayerTransforms(): LayerTransformDefinition[] {
  if (!cachedDefinitions) cachedDefinitions = buildDefinitions();
  return cachedDefinitions;
}

export function getActiveLayerTransformIds(): LayerTransformId[] {
  return getBoardLayerTransforms().map((d) => d.id);
}

export function getBoardLayerTransformById(id: LayerTransformId): LayerTransformDefinition {
  const definition = getBoardLayerTransforms().find((d) => d.id === id);
  if (!definition) throw new Error(`Unknown layer transform: ${id}`);
  return definition;
}

export function getBoardTransform(id: LayerTransformId): LayerTransformDefinition {
  return getBoardLayerTransformById(id);
}

/**
 * Transforms a board-neighbor direction index using the actual slot map.
 * Returns null when the direction cannot be resolved (no valid neighbor at fromSlot).
 */
export function transformBoardDirection(
  direction: BoardDirection,
  transformId: LayerTransformId,
  fromSlot: BoardSlot
): BoardDirection | null {
  const map = buildCanonicalMapById().get(transformId as CanonicalLayerTransformId);
  if (!map) return null;
  return transformDirectionForSlot(direction, fromSlot, map);
}

export { applySlotMap, type SlotTransformMap };
