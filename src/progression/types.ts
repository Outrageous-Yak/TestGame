/**
 * Player progression storage — separate from static World / ScenarioEntry / Track content.
 *
 * Terminology:
 * - ScenarioEntry (UI): menu variant with theme, cloud mode, tracks[]
 * - Scenario (engine): board JSON loaded at runtime
 */

export type MechanicId =
  | "basic_movement"
  | "missing_hexes"
  | "portals"
  | "moving_rows"
  | "partly_cloudy"
  | "encounter_cards";

export type ProgressionMode = "OPEN" | "SEQUENTIAL";

export type ProgressionRequirement =
  | { type: "TRACK_COMPLETE"; worldId: string; trackId: string }
  | { type: "SCENARIO_COMPLETE"; worldId: string; scenarioId: string }
  | { type: "WORLD_COMPLETE"; worldId: string };

export type ProgressionPresentation = {
  title?: string;
  text?: string;
  image?: string;
};

export type TrackProgressionMeta = {
  order?: number;
  requires?: ProgressionRequirement[];
  optional?: boolean;
  introduces?: MechanicId[];
  story?: ProgressionPresentation;
};

export type ScenarioProgressionMeta = {
  order?: number;
  mode?: ProgressionMode;
  requires?: ProgressionRequirement[];
  intro?: ProgressionPresentation;
  completion?: ProgressionPresentation;
};

export type WorldProgressionMeta = {
  order?: number;
  mode?: ProgressionMode;
  requiresWorldIds?: string[];
  intro?: ProgressionPresentation;
  completion?: ProgressionPresentation;
};

export type TrackProgressStatus = "LOCKED" | "AVAILABLE" | "COMPLETED";

export type TrackCompletionRecord = {
  completionCount: number;
  firstCompletedAt: string;
};

export type ProgressionSaveV1 = {
  version: 1;
  /** Keys from `progressionTrackKey(worldId, trackId)` — variant-independent (Model A). */
  completedTracks: Record<string, TrackCompletionRecord>;
  seenMechanicIntroductions: string[];
};

export type NextTrackResolution =
  | { kind: "track"; worldId: string; scenarioId: string; trackId: string; trackName: string }
  | { kind: "scenario_complete"; worldId: string; scenarioId: string }
  | { kind: "world_complete"; worldId: string }
  | { kind: "none" };
