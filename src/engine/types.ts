// src/engine/types.ts

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

  movement?: Record<string, MovementPattern>;
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
  playerHexId: string;

  hexesById: Map<string, Hex>;
  rows: Map<number, string[][]>;
  transitionsByFromId: Map<string, Transition>;

  lastGuaranteedUpId?: string;
  lastGuaranteedUpTurn?: number;
};

// Optional: centralize reachability typing here (recommended)
export type ReachInfo = { reachable: boolean; distance: number | null; explored: number };
export type ReachMap = Record<string, ReachInfo>;
