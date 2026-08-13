export type Screen =
  | "start"
  | "world"
  | "worldMap"
  | "characters"
  | "scenario"
  | "game"
  | "studio"
  | "trackPlanner"
  | "campaignBuilder";

export type PlayerChoice =
  | { kind: "preset"; id: string; name: string }
  | { kind: "custom"; name: string; imageDataUrl: string | null };

export type Coord = { layer: number; row: number; col: number };

export type LogEntry = {
  n: number;
  t: string;
  msg: string;
  kind?: "ok" | "bad" | "info";
};

export type LayerPalette = {
  L1: string;
  L2: string;
  L3: string;
  L4: string;
  L5: string;
  L6: string;
  L7: string;
};

export type ScenarioTheme = {
  palette: LayerPalette;
  assets: {
    backgroundGame?: string;
    backgroundLayers?: Partial<{
      L1: string;
      L2: string;
      L3: string;
      L4: string;
      L5: string;
      L6: string;
      L7: string;
    }>;
    diceFacesBase: string;
    diceCornerBorder: string;
    villainsBase: string;
    hexTile?: string;
    /** White-emblem tile shown only during active reach-pulse flash on Forgotten Citadel. */
    hexTileMovable?: string;
    /** Render the goal as a solid metallic-gold hex instead of regular tile art. */
    solidGoldGoal?: boolean;
    /** Optional looping background music for this scenario/world. */
    backgroundMusic?: string;
  };
};

export type CloudMode = "cloudy" | "full_cloud";

/** Runtime visibility tuning parameters (Portal Fork / authored scenarios). */
export type VisibilityParams = {
  lanternRadius?: number;
  memoryRevealSec?: number;
};

/** Extended visibility modes (runtime v1 — Portal Fork test scenarios). */
export type ExtendedVisibilityMode =
  | "night"
  | "invisible"
  | "memory"
  | "lantern"
  | "crystal_vision"
  | "echo";

export type {
  MechanicId,
  ProgressionMode,
  ProgressionPresentation,
  ProgressionRequirement,
  ScenarioProgressionMeta,
  TrackProgressionMeta,
  WorldProgressionMeta,
} from "../progression/types";

import type {
  ScenarioProgressionMeta,
  TrackProgressionMeta,
  WorldProgressionMeta,
} from "../progression/types";

/**
 * Registered playable level — points at engine board JSON via `scenarioJson`.
 * Distinct from engine `Scenario` (board definition in JSON).
 */
export type Track = {
  id: string;
  name: string;
  scenarioJson: string;
  progression?: TrackProgressionMeta;
};

/**
 * UI menu scenario variant (theme, cloud mode, track list).
 * Not the same as engine `Scenario` (board JSON).
 */
export type ScenarioEntry = {
  id: string;
  name: string;
  desc?: string;
  scenarioJson: string;
  theme: ScenarioTheme;
  tracks?: Track[];
  cloudMode?: CloudMode;
  visibilityMode?: ExtendedVisibilityMode;
  visibilityParams?: VisibilityParams;
  progression?: ScenarioProgressionMeta;
};

export type WorldEntry = {
  id: string;
  name: string;
  desc?: string;
  menu: { solidColor?: string };
  scenarios: ScenarioEntry[];
  progression?: WorldProgressionMeta;
};

export type VillainKey = "bad1" | "bad2" | "bad3" | "bad4";
export type VillainTrigger = { key: VillainKey; layer: number; row: number; cols?: "any" | number[] };
export type Encounter = null | { villainKey: VillainKey; tries: number };
export type CardKey = "cosmic" | "risk" | "terrain" | "shadow";

/**
 * Runtime card/encounter placement.
 * `id` is the stable encounter/feature identity (Step 5A).
 * Legacy JSON without `id` receives a deterministic `legacy_card_L*_R*_C*` at parse time.
 */
export type CardTrigger = {
  id: string;
  card: CardKey;
  layer: number;
  row: number;
  col: number;
  /** Optional Red encounter tier (1–4). Resolution deferred to Step 5C. */
  encounterTier?: 1 | 2 | 3 | 4;
};
