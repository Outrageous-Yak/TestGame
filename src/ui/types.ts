export type Screen = "start" | "world" | "characters" | "scenario" | "game" | "studio";

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
  /** Optional hex edge treatment for this scenario/world. */
  hexBorder?: "marching-dots";
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
  };
};

export type CloudMode = "cloudy" | "full_cloud";

export type Track = { id: string; name: string; scenarioJson: string };

export type ScenarioEntry = {
  id: string;
  name: string;
  desc?: string;
  scenarioJson: string;
  theme: ScenarioTheme;
  tracks?: Track[];
  cloudMode?: CloudMode;
};

export type WorldEntry = {
  id: string;
  name: string;
  desc?: string;
  menu: { solidColor?: string };
  scenarios: ScenarioEntry[];
};

export type VillainKey = "bad1" | "bad2" | "bad3" | "bad4";
export type VillainTrigger = { key: VillainKey; layer: number; row: number; cols?: "any" | number[] };
export type Encounter = null | { villainKey: VillainKey; tries: number };
export type CardKey = "cosmic" | "risk" | "terrain" | "shadow";
export type CardTrigger = { card: CardKey; layer: number; row: number; col: number };
