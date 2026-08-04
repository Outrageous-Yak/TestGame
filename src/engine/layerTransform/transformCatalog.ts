/**
 * Visual mapping reference for the four active 7676767 layer automorphisms.
 *
 * | Canonical ID         | Variant | Example (R0C0 →) | Involution | Screen interpretation        | Inverse        |
 * |----------------------|---------|------------------|------------|------------------------------|----------------|
 * | identity             | 1       | R0C0             | yes        | No change                    | identity       |
 * | reflect-horizontal   | 2       | R0C6             | yes        | Mirror left/right per row    | reflect-horizontal |
 * | symmetry-b           | 3       | R6C0             | yes        | Mirror top/bottom (row axis) | symmetry-b     |
 * | symmetry-c           | 4       | R6C6             | yes        | Map to opposite cell       | symmetry-c     |
 *
 * These are graph automorphisms of the 46-cell 7676767 honeycomb. They are NOT literal
 * 60°/120°/240° rotations. Older builds incorrectly labelled them `rotate-*`.
 */
import { ROW_LENS } from "../board";
import { slotGridCenter } from "../layout";
import type { BoardSlot, LayerTransformDefinition, LayerTransformId } from "./types";
import {
  applySlotMap,
  discoverUniqueAutomorphismMaps,
  isIdentityMap,
  mapFingerprint,
  type SlotTransformMap,
} from "./graphAutomorphism";

export const CANONICAL_TRANSFORM_IDS = [
  "identity",
  "reflect-horizontal",
  "symmetry-b",
  "symmetry-c",
] as const satisfies readonly LayerTransformId[];

export type CanonicalLayerTransformId = (typeof CANONICAL_TRANSFORM_IDS)[number];

export const PLAYER_VARIANT_LABELS: Record<CanonicalLayerTransformId, string> = {
  identity: "Variant 1",
  "reflect-horizontal": "Variant 2",
  "symmetry-b": "Variant 3",
  "symmetry-c": "Variant 4",
};

const EXAMPLE_SLOT: BoardSlot = { row: 0, col: 0 };

function reflectHorizontal(slot: BoardSlot): BoardSlot {
  return { row: slot.row, col: ROW_LENS[slot.row] - 1 - slot.col };
}

function reflectRows(slot: BoardSlot): BoardSlot {
  const targetRow = ROW_LENS.length - 1 - slot.row;
  return { row: targetRow, col: slot.col };
}

function reflectOpposite(slot: BoardSlot): BoardSlot {
  const targetRow = ROW_LENS.length - 1 - slot.row;
  return { row: targetRow, col: ROW_LENS[targetRow] - 1 - slot.col };
}

function matchesMap(map: SlotTransformMap, sample: BoardSlot, expected: BoardSlot): boolean {
  const actual = applySlotMap(sample, map);
  return actual.row === expected.row && actual.col === expected.col;
}

export function classifyMapGeometry(map: SlotTransformMap): CanonicalLayerTransformId {
  if (isIdentityMap(map)) return "identity";
  if (matchesMap(map, EXAMPLE_SLOT, reflectHorizontal(EXAMPLE_SLOT))) return "reflect-horizontal";
  if (matchesMap(map, EXAMPLE_SLOT, reflectRows(EXAMPLE_SLOT))) return "symmetry-b";
  if (matchesMap(map, EXAMPLE_SLOT, reflectOpposite(EXAMPLE_SLOT))) return "symmetry-c";
  throw new Error(`Unclassified automorphism: ${mapFingerprint(map).slice(0, 80)}`);
}

export function buildCanonicalMapById(): Map<CanonicalLayerTransformId, SlotTransformMap> {
  if (cachedMaps) return cachedMaps;
  const maps = discoverUniqueAutomorphismMaps(500);
  const byId = new Map<CanonicalLayerTransformId, SlotTransformMap>();
  for (const map of maps) {
    const id = classifyMapGeometry(map);
    if (!byId.has(id)) byId.set(id, map);
  }
  for (const id of CANONICAL_TRANSFORM_IDS) {
    if (!byId.has(id)) throw new Error(`Missing canonical transform map: ${id}`);
  }
  cachedMaps = byId;
  return byId;
}

let cachedMaps: Map<CanonicalLayerTransformId, SlotTransformMap> | null = null;

export function describeTransformScreen(id: CanonicalLayerTransformId): string {
  switch (id) {
    case "identity":
      return "No change";
    case "reflect-horizontal":
      return "Mirror left/right within each row (column index reverses)";
    case "symmetry-b":
      return "Mirror top/bottom rows (row index reverses, column preserved)";
    case "symmetry-c":
      return "Map each cell to its opposite position (row and column reverse)";
  }
}

export function exampleCoordinate(id: CanonicalLayerTransformId, map: SlotTransformMap): string {
  const target = applySlotMap(EXAMPLE_SLOT, map);
  return `R${EXAMPLE_SLOT.row}C${EXAMPLE_SLOT.col} → R${target.row}C${target.col}`;
}

export function screenDeltaSummary(id: CanonicalLayerTransformId, map: SlotTransformMap): string {
  const from = slotGridCenter(EXAMPLE_SLOT.row, EXAMPLE_SLOT.col);
  const toSlot = applySlotMap(EXAMPLE_SLOT, map);
  const to = slotGridCenter(toSlot.row, toSlot.col);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return `grid-center Δx=${dx}, Δy=${dy}`;
}

export type TransformCatalogEntry = {
  id: CanonicalLayerTransformId;
  playerLabel: string;
  example: string;
  involution: boolean;
  screenInterpretation: string;
  screenDelta: string;
  inverseId: CanonicalLayerTransformId;
};

export function buildTransformCatalog(): TransformCatalogEntry[] {
  const byId = buildCanonicalMapById();
  return CANONICAL_TRANSFORM_IDS.map((id) => ({
    id,
    playerLabel: PLAYER_VARIANT_LABELS[id],
    example: exampleCoordinate(id, byId.get(id)!),
    involution: id !== "identity" ? true : true,
    screenInterpretation: describeTransformScreen(id),
    screenDelta: screenDeltaSummary(id, byId.get(id)!),
    inverseId: id,
  }));
}

export function toLayerTransformDefinition(
  id: CanonicalLayerTransformId,
  map: SlotTransformMap,
  applyDirection: LayerTransformDefinition["applyDirection"]
): LayerTransformDefinition {
  return {
    id,
    label: PLAYER_VARIANT_LABELS[id],
    applySlot: (slot) => applySlotMap(slot, map),
    applyDirection,
    inverseId: id,
  };
}
