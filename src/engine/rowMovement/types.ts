export type LayerNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RowNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ROW_NUMBERS: RowNumber[] = [0, 1, 2, 3, 4, 5, 6];

export const LAYER_NUMBERS: LayerNumber[] = [1, 2, 3, 4, 5, 6, 7];

export type RowMovementDirection = "LEFT" | "RIGHT" | "NONE";

export interface RowMovementInstruction {
  direction: RowMovementDirection;
  amount: number;
}

export interface LayerRowMovementDefinition {
  rows: Record<string, RowMovementInstruction>;
}

export type LayerMovementDefinition = "NONE" | LayerRowMovementDefinition;

/** Authored scenario movement keyed by layer string ("1"–"7"). */
export type ScenarioMovementDefinition = Record<string, LayerMovementDefinition>;

export interface NormalizedLayerMovement {
  rows: Record<RowNumber, RowMovementInstruction>;
}

export type NormalizedScenarioMovement = Record<LayerNumber, NormalizedLayerMovement>;

/** @deprecated Legacy preset identifiers — migrate via legacyMovementMigration. */
export type LegacyMovementPreset =
  | "NONE"
  | "SEVEN_LEFT_SIX_RIGHT"
  | "TOP3_RIGHT_BOTTOM4_LEFT"
  | string;

export type LegacyOrCurrentLayerMovementDefinition =
  | LegacyMovementPreset
  | LayerMovementDefinition;

export const MAX_AUTHORED_ROW_MOVEMENT_AMOUNT = 1_000_000;

export const STATIONARY_ROW: RowMovementInstruction = { direction: "NONE", amount: 0 };
