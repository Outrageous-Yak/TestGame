export type Screen = "start" | "world" | "characters" | "scenario" | "game" | "studio" | "trackPlanner";

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

import type {
  ScenarioProgressionDefinition,
  TrackProgressionDefinition,
  WorldProgressionDefinition,
} from "../progression/types";

export type Track = {
  id: string;
  name: string;
  scenarioJson: string;
  progression?: TrackProgressionDefinition;
};

export type ScenarioEntry = {
  id: string;
  name: string;
  desc?: string;
  scenarioJson: string;
  theme: ScenarioTheme;
  tracks?: Track[];
  cloudMode?: CloudMode;
  progression?: ScenarioProgressionDefinition;
};

export type WorldEntry = {
  id: string;
  name: string;
  desc?: string;
  menu: { solidColor?: string };
  scenarios: ScenarioEntry[];
  progression?: WorldProgressionDefinition;
};

export type VillainKey = "bad1" | "bad2" | "bad3" | "bad4";
export type VillainTrigger = { key: VillainKey; layer: number; row: number; cols?: "any" | number[] };
export type Encounter = null | { villainKey: VillainKey; tries: number };
export type CardKey = "cosmic" | "risk" | "terrain" | "shadow";
export type CardTrigger = { card: CardKey; layer: number; row: number; col: number };
