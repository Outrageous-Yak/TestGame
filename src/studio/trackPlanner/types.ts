import type { ScenarioMovementDefinition } from "../../engine/rowMovement/types";
import type { Pos, Transition, TransitionType } from "../../engine/types";
import type { CardKey, VillainKey } from "../../ui/types";

/** Stable planner hierarchy IDs — names are display-only. */
export type PlannerWorldId = string;
export type PlannerScenarioId = string;
export type PlannerTrackId = string;
export type FeatureId = string;

export type EditorView =
  | "board"
  | "features"
  | "visibility"
  | "audit"
  | "layerPlaytest"
  | "simulator";

export type ValidationStatus = "unvalidated" | "validating" | "valid" | "warning" | "invalid";

export type CardColor = "RED" | "BLUE" | "GREEN" | "BLACK" | "RANDOM" | "HIDDEN";

export type CardContentMode = "specific" | "random";

export type EncounterContentMode = "specific" | "random";

export type VillainContentMode = "specific" | "random";

export type VisibilityStateType =
  | "REGULAR"
  | "PARTLY_CLOUDY"
  | "FULL_CLOUD"
  | "NIGHT"
  | "INVISIBLE"
  | "MEMORY"
  | "LANTERN"
  | "CRYSTAL_VISION"
  | "ECHO";

export type VisibilityCoverage = "FULL_BOARD" | "CUSTOM";

export interface PlannerWorld {
  worldId: PlannerWorldId;
  name: string;
  description?: string;
  background?: string;
  hexTheme?: string;
  musicRef?: string;
  encounterPool: string[];
  villainPool: VillainKey[];
  scenarioIds: PlannerScenarioId[];
  /** When true, seeded from shipped game content (read-only base). */
  builtIn?: boolean;
}

export interface PlannerScenario {
  scenarioId: PlannerScenarioId;
  worldId: PlannerWorldId;
  name: string;
  description?: string;
  trackOrder: PlannerTrackId[];
  allowedEncounters: string[];
  allowedVillains: VillainKey[];
  visibilityDefault?: VisibilityStateType;
  builtIn?: boolean;
}

export interface RowMovementAuthored {
  direction: "LEFT" | "RIGHT" | "NONE";
  amount: number;
}

export interface LayerBoardAuthored {
  layer: number;
  /** Positions marked missing (no geometry). */
  missing: Pos[];
  /** Per-row movement — keys "0".."6". */
  rowMovement: Record<string, RowMovementAuthored>;
}

export interface StartFeature {
  kind: "start";
  id: FeatureId;
  position: Pos;
}

export interface GoalFeature {
  kind: "goal";
  id: FeatureId;
  position: Pos;
}

export interface PortalFeature {
  kind: "portal";
  id: FeatureId;
  portalId: string;
  source: Pos;
  direction: TransitionType;
  destination: Pos;
  hidden?: boolean;
}

export interface CardFeature {
  kind: "card";
  id: FeatureId;
  position: Pos;
  cardType: CardColor;
  /** For HIDDEN — predetermined underlying color. */
  resolvedType?: Exclude<CardColor, "RANDOM" | "HIDDEN">;
  hidden?: boolean;
  contentMode?: CardContentMode;
  encounterId?: string;
  villainKey?: VillainKey;
  /**
   * Optional Red encounter tier (1–4). Authoring-only until Step 5C.
   * Omitted on legacy tracks — do not invent a silent default for resolution.
   */
  encounterTier?: 1 | 2 | 3 | 4;
}

export interface EncounterFeature {
  kind: "encounter";
  id: FeatureId;
  position: Pos;
  mode: EncounterContentMode;
  encounterId?: string;
}

export interface VillainFeature {
  kind: "villain";
  id: FeatureId;
  position: Pos;
  mode: VillainContentMode;
  villainKey?: VillainKey;
}

export type TrackFeature =
  | StartFeature
  | GoalFeature
  | PortalFeature
  | CardFeature
  | EncounterFeature
  | VillainFeature;

export interface VisibilityOverlay {
  id: string;
  state: VisibilityStateType;
  coverage: VisibilityCoverage;
  /** Board-slot positions when coverage is CUSTOM. */
  positions: Pos[];
  movement?: { direction: "NONE" | "LEFT" | "RIGHT"; amount: number };
  /** Lantern radius in hex steps; future-ready. */
  lanternRadius?: number;
  memoryRevealSec?: number;
}

export type TrackCatalogStatus = "production" | "new_draft" | "modified_draft";

export interface PlannerTrack {
  trackId: PlannerTrackId;
  scenarioId: PlannerScenarioId;
  worldId: PlannerWorldId;
  name: string;
  description?: string;
  layers: LayerBoardAuthored[];
  features: TrackFeature[];
  visibility: VisibilityOverlay[];
  /** Editor-only metadata — not exported to runtime JSON. */
  editorMeta?: {
    lastView?: EditorView;
    selectedLayer?: number;
  };
  builtIn?: boolean;
  /** Path to source scenario JSON when imported from game. */
  sourceScenarioJson?: string;
  /** Derived UI label — not persisted. */
  catalogStatus?: TrackCatalogStatus;
  /** Optional progression metadata preserved across board edits (Step 2). */
  progression?: import("../../progression/types").TrackProgressionDefinition;
}

export interface PlannerDraftBundle {
  version: 1;
  worlds: PlannerWorld[];
  scenarios: PlannerScenario[];
  tracks: PlannerTrack[];
  /** Scenario-specific visibility keyed by visibilityDraftKey(worldId, scenarioId, trackId). */
  visibilityDrafts?: Record<string, VisibilityOverlay[]>;
  updatedAt: string;
}

export interface TrackValidationSummary {
  status: ValidationStatus;
  shortestMoves: number | null;
  optimalPathCount: number;
  warningCount: number;
  errorCount: number;
  strandedStateCount: number;
}

export interface PlannerSelection {
  worldId: PlannerWorldId | null;
  scenarioId: PlannerScenarioId | null;
  trackId: PlannerTrackId | null;
}

export type FeatureTool =
  | "select"
  | "remove"
  | "start"
  | "goal"
  | "portal_up"
  | "portal_down"
  | "card_red"
  | "card_blue"
  | "card_green"
  | "card_black"
  | "card_random"
  | "card_predetermined";

export interface EditorSelection {
  view: EditorView;
  layer: number;
  selectedSlot: Pos | null;
  selectedFeatureId: FeatureId | null;
  boardTool: "select" | "remove" | "restore";
  featureTool: FeatureTool | null;
  visibilityTool: VisibilityStateType;
}

/** Runtime scenario movement keyed by layer string. */
export type AuthoredMovement = ScenarioMovementDefinition;

export function emptyLayerBoard(layer: number): LayerBoardAuthored {
  const rowMovement: Record<string, RowMovementAuthored> = {};
  for (let r = 0; r < 7; r++) {
    rowMovement[String(r)] = { direction: "NONE", amount: 0 };
  }
  return { layer, missing: [], rowMovement };
}

export function createEmptyTrack(
  trackId: PlannerTrackId,
  scenarioId: PlannerScenarioId,
  worldId: PlannerWorldId,
  name: string,
): PlannerTrack {
  return {
    trackId,
    scenarioId,
    worldId,
    name,
    layers: Array.from({ length: 7 }, (_, i) => emptyLayerBoard(i + 1)),
    features: [],
    visibility: [
      {
        id: "vis_default",
        state: "REGULAR",
        coverage: "FULL_BOARD",
        positions: [],
      },
    ],
  };
}

export const CARD_COLOR_TO_RUNTIME: Record<Exclude<CardColor, "RANDOM" | "HIDDEN">, CardKey> = {
  RED: "cosmic",
  BLUE: "terrain",
  GREEN: "risk",
  BLACK: "shadow",
};

export function portalToTransition(p: PortalFeature): Transition {
  return {
    type: p.direction,
    from: { ...p.source },
    to: { ...p.destination },
  };
}
