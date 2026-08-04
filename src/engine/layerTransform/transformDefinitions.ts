import { neighborBoardSlots } from "./boardNeighbors";
import type { BoardDirection, BoardSlot, LayerTransformDefinition, LayerTransformId } from "./types";
import {
  applySlotMap,
  classifyMap,
  composeMaps,
  discoverUniqueAutomorphismMaps,
  isIdentityMap,
  mapFingerprint,
  type SlotTransformMap,
} from "./graphAutomorphism";

const LABELS: Record<LayerTransformId, string> = {
  identity: "Identity",
  "rotate-60": "Rotate 60°",
  "rotate-120": "Rotate 120°",
  "rotate-180": "Rotate 180°",
  "rotate-240": "Rotate 240°",
  "rotate-300": "Rotate 300°",
  "reflect-a": "Reflect A",
  "reflect-b": "Reflect B",
};

function directionBetween(from: BoardSlot, to: BoardSlot): BoardDirection | null {
  const idx = neighborBoardSlots(from).findIndex((n) => n.row === to.row && n.col === to.col);
  return idx >= 0 ? (idx as BoardDirection) : null;
}

function transformDirection(
  direction: BoardDirection,
  fromSlot: BoardSlot,
  map: SlotTransformMap
): BoardDirection {
  const neighbors = neighborBoardSlots(fromSlot);
  const target = neighbors[direction];
  if (!target) return direction;
  const mappedFrom = applySlotMap(fromSlot, map);
  const mappedTarget = applySlotMap(target, map);
  return directionBetween(mappedFrom, mappedTarget) ?? direction;
}

function findInverseId(map: SlotTransformMap, byId: Map<LayerTransformId, SlotTransformMap>): LayerTransformId {
  for (const [id, candidate] of byId.entries()) {
    if (isIdentityMap(composeMaps(map, candidate))) return id;
  }
  return "identity";
}

function assignIdsToMaps(maps: SlotTransformMap[]): Map<LayerTransformId, SlotTransformMap> {
  const byId = new Map<LayerTransformId, SlotTransformMap>();
  const used = new Set<string>();

  const take = (id: LayerTransformId, map: SlotTransformMap) => {
    const fp = mapFingerprint(map);
    if (used.has(fp)) return;
    used.add(fp);
    byId.set(id, map);
  };

  const identity = maps.find((m) => isIdentityMap(m));
  if (identity) take("identity", identity);

  const involutions = maps.filter((m) => !isIdentityMap(m) && classifyMap(m).order === 2);
  if (involutions[0]) take("reflect-a", involutions[0]);
  if (involutions[1]) take("reflect-b", involutions[1]);
  if (involutions[2]) take("rotate-180", involutions[2]);

  for (const map of maps) {
    const fp = mapFingerprint(map);
    if (used.has(fp)) continue;
    for (const id of ["rotate-60", "rotate-120", "rotate-240", "rotate-300"] as LayerTransformId[]) {
      if (!byId.has(id)) {
        take(id, map);
        break;
      }
    }
  }

  return byId;
}

function buildDefinitions(): LayerTransformDefinition[] {
  const maps = discoverUniqueAutomorphismMaps(500);
  const byId = assignIdsToMaps(maps);

  const definitions: LayerTransformDefinition[] = [];
  for (const [id, map] of byId.entries()) {
    definitions.push({
      id,
      label: LABELS[id],
      applySlot: (slot) => applySlotMap(slot, map),
      applyDirection: (direction) => transformDirection(direction, { row: 3, col: 3 }, map),
      inverseId: findInverseId(map, byId),
    });
  }

  definitions.sort((a, b) => a.id.localeCompare(b.id));
  return definitions;
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

export function transformBoardDirection(
  direction: BoardDirection,
  transformId: LayerTransformId,
  fromSlot: BoardSlot = { row: 3, col: 3 }
): BoardDirection {
  return getBoardLayerTransformById(transformId).applyDirection(direction);
}

export { applySlotMap, type SlotTransformMap };
