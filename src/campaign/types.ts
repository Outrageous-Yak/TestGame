/**
 * Player-facing campaign map presentation metadata.
 * Layered over existing World → ScenarioEntry → Track — does not duplicate board JSON.
 */

export type CampaignNodeType = "track" | "start" | "gate" | "story";

export type CampaignNode = {
  id: string;
  /** Existing WorldEntry.id */
  worldId: string;
  /** Existing ScenarioEntry.id used to launch the Track */
  scenarioId: string;
  /** Existing Track.id */
  trackId: string;
  /** Normalized map coordinates (0–100) for responsive layout */
  x: number;
  y: number;
  label?: string;
  type?: CampaignNodeType;
  /** Outgoing edges to other node ids (branching-ready) */
  connections?: string[];
};

export type CampaignMap = {
  id: string;
  /** Owning world */
  worldId: string;
  /** Logical area within the world (often a ScenarioEntry id) */
  areaId: string;
  title: string;
  subtitle?: string;
  /** Visual theme hint — CSS only for 6A */
  theme?: "grasslands" | "citadel" | "ruins" | "forest";
  nodes: CampaignNode[];
};

export type CampaignNodeViewState = "LOCKED" | "AVAILABLE" | "COMPLETED" | "CURRENT";
