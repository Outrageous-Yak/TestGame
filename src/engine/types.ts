// src/engine/types.ts

import type {
  NormalizedScenarioMovement,
  ScenarioMovementDefinition,
} from "./rowMovement/types";
import type { PlayerAction } from "./moveAttempt";

/** @deprecated Legacy preset id — migrate via rowMovement/legacyMovementMigration */
export type MovementPattern = "NONE" | "SEVEN_LEFT_SIX_RIGHT" | "TOP3_RIGHT_BOTTOM4_LEFT";
export type TransitionType = "UP" | "DOWN";

export type Pos = { layer: number; row: number; col: number };

export type Transition = {
  type: TransitionType;
  from: Pos;
  to: Pos;
};

export type VillainTrigger = { id: string; layer: number; row: number };

export type VillainsSpec = {
  requiredRoll: number;
  triggers: VillainTrigger[];
};

export type Scenario = {
  id: string;
  name: string;
  layers: number;

  objective?: string;
  description?: string;
  notes?: string[];

  // Your JSON includes this, so we type it.
  villains?: VillainsSpec;

  start: Pos;
  goal: Pos;

  // Make optional because assertScenario normalizes defaults
  missing?: Pos[];
  blocked?: Pos[];

  movement?: ScenarioMovementDefinition;
  /** Normalized per-row movement for runtime — set by assertScenario / attachRuntimeMovement. */
  runtimeMovement?: NormalizedScenarioMovement;
  transitions?: Transition[];

  // Make optional because assertScenario sets default if missing
  revealOnEnterGuaranteedUp?: boolean;
};

export type HexKind = "NORMAL" | "GOAL";

export type Hex = {
  id: string;
  pos: Pos;

  kind: HexKind;

  missing: boolean;
  blocked: boolean;

  revealed: boolean;
};

export type GameState = {
  scenario: Scenario;
  turn: number;
  visibleLayers: Set<number>;
  /** Layers whose row movement is active because the player has entered them. */
  movementActiveLayers: Set<number>;
  playerHexId: string;

  hexesById: Map<string, Hex>;
  rows: Map<number, string[][]>;
  transitionsByFromId: Map<string, Transition>;

  lastGuaranteedUpId?: string;
  lastGuaranteedUpTurn?: number;

  /** Player action log for replay/debug (moves and failed attempts). */
  moveHistory?: PlayerAction[];

  /**
   * When true, hex cosmetic mutations (reveal) are skipped.
   * Set on lite-restored analysis branches so shared hex maps stay immutable.
   */
  analysisSafe?: boolean;
};

// Optional: centralize reachability typing here (recommended)
export type ReachInfo = { reachable: boolean; distance: number | null; explored: number };
export type ReachMap = Record<string, ReachInfo>;
