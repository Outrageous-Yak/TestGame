export type MovementPattern = "NONE" | "SEVEN_LEFT_SIX_RIGHT" | "TOP3_RIGHT_BOTTOM4_LEFT";
export type TransitionType = "UP" | "DOWN";

export type Pos = { layer: number; row: number; col: number };

export type Transition = {
  type: TransitionType;
  from: Pos;
  to: Pos;
};

export type Scenario = {
  id: string;
  name: string;
  layers: number;

  objective?: string;
  description?: string;
  notes?: string[];

  start: Pos;
  goal: Pos;

  missing: Pos[];
  blocked: Pos[];

  movement: Record<string, MovementPattern>;
  transitions: Transition[];

  revealOnEnterGuaranteedUp: boolean;
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
