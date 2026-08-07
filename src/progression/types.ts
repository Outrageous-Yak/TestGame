/** Stable mechanic ids for future tutorial popups (metadata only in Step 2). */
export type MechanicId =
  | "basic_movement"
  | "missing_hexes"
  | "portals"
  | "moving_rows"
  | "partly_cloudy"
  | "encounter_cards";

export type ProgressionPresentation = {
  title?: string;
  text?: string;
  image?: string;
};

export type ProgressionRequirement =
  | { type: "TRACK_COMPLETE"; worldId: string; trackId: string }
  | { type: "SCENARIO_COMPLETE"; worldId: string; scenarioId: string }
  | { type: "WORLD_COMPLETE"; worldId: string };

export type ProgressionMode = "OPEN" | "SEQUENTIAL";

export type TrackProgressionDefinition = {
  order?: number;
  requires?: ProgressionRequirement[];
  optional?: boolean;
  introduces?: MechanicId[];
  story?: ProgressionPresentation;
};

export type ScenarioProgressionDefinition = {
  order?: number;
  requiresScenarioIds?: string[];
  requiredTrackIds?: string[];
  optional?: boolean;
  progressionMode?: ProgressionMode;
  story?: ProgressionPresentation;
};

export type WorldProgressionDefinition = {
  order?: number;
  requiresWorldIds?: string[];
  requiredScenarioIds?: string[];
  progressionMode?: ProgressionMode;
  story?: ProgressionPresentation;
};

export type TrackProgressStatus = "LOCKED" | "AVAILABLE" | "COMPLETED";

export type TrackCompletionRecord = {
  completed: true;
  completionCount?: number;
  firstCompletedAt?: string;
};

export type ProgressionSaveV1 = {
  version: 1;
  completedTracks: Record<string, TrackCompletionRecord>;
  seenMechanicIntroductions: string[];
};

export type ProgressionContext = {
  worldId: string;
  scenarioId: string;
  trackId: string;
};

export type NextTrackResolution =
  | { kind: "TRACK"; trackId: string }
  | { kind: "SCENARIO_COMPLETE" }
  | { kind: "WORLD_COMPLETE" }
  | { kind: "NONE" };
