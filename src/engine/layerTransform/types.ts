import type { Pos } from "../types";

/** Canonical layer-transform IDs for the 7676767 board (four graph automorphisms). */
export type LayerTransformId =
  | "identity"
  | "reflect-horizontal"
  | "symmetry-b"
  | "symmetry-c";

export type BoardSlot = { row: number; col: number };

export type BoardDirection = 0 | 1 | 2 | 3 | 4 | 5;

export type TrackVariationMode = "fixed" | "new-on-replay" | "seeded";

export interface TrackVariationRules {
  enabled: boolean;
  allowedTransforms: LayerTransformId[];
  independentPerLayer: boolean;
  avoidPreviousCombination: boolean;
  allowIdentity: boolean;
  forcedTransformsByLayer?: Record<string, LayerTransformId>;
}

export interface TrackTransformSelection {
  seed: string;
  layerTransforms: Record<number, LayerTransformId>;
}

export interface LayerTransformDefinition {
  id: LayerTransformId;
  /** Player-facing label, e.g. "Variant 2". */
  label: string;
  applySlot: (slot: BoardSlot) => BoardSlot;
  applyDirection: (direction: BoardDirection) => BoardDirection;
  inverseId: LayerTransformId;
}

export interface ScenarioDocument extends Record<string, unknown> {
  id: string;
  name: string;
  layers: number;
  start: Pos;
  goal: Pos;
  missing?: Pos[];
  blocked?: Pos[];
  movement?: Record<string, string>;
  transitions?: Array<{ type: string; from: Pos; to: Pos }>;
  revealOnEnterGuaranteedUp?: boolean;
  variationRules?: Partial<TrackVariationRules>;
  supportedTransformIds?: LayerTransformId[];
}

export const DEFAULT_VARIATION_RULES: TrackVariationRules = {
  enabled: true,
  allowedTransforms: ["identity", "reflect-horizontal", "symmetry-b", "symmetry-c"],
  independentPerLayer: true,
  avoidPreviousCombination: true,
  allowIdentity: true,
};
