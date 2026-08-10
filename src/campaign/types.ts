/**
 * Player-facing campaign map presentation metadata.
 * Layered over existing World → ScenarioEntry → Track — does not duplicate board JSON.
 */

export type CampaignNodeType =
  | "track"
  | "start"
  | "gate"
  | "story"
  | "mechanic_intro"
  | "area_gate"
  | "world_exit";

export type CampaignNode = {
  id: string;
  /** Existing WorldEntry.id */
  worldId: string;
  /** Existing ScenarioEntry.id used to launch the Track */
  scenarioId: string;
  /** Existing Track.id */
  trackId: string;
  /** Normalized map coordinates (0–100+) for responsive layout */
  x: number;
  y: number;
  label?: string;
  /** Future-ready; only `track` is fully behaved in 6B */
  type?: CampaignNodeType;
  /** Outgoing edges to other node ids (branching-ready presentation) */
  connections?: string[];
};

export type CampaignCatalogStatus = "production" | "modified_draft" | "new_draft";

export type CampaignMap = {
  id: string;
  /** Owning world */
  worldId: string;
  /** Logical area within the world (often a ScenarioEntry id) */
  areaId: string;
  title: string;
  subtitle?: string;
  /** Optional recommended entry node id */
  entryNodeId?: string;
  /** Visual theme hint — CSS only */
  theme?: "grasslands" | "citadel" | "ruins" | "forest";
  nodes: CampaignNode[];
  /** Authoring catalog status — never written into production modules */
  catalogStatus?: CampaignCatalogStatus;
};

export type CampaignNodeViewState = "LOCKED" | "AVAILABLE" | "COMPLETED" | "CURRENT";

export type CampaignDraftBundle = {
  version: 1;
  maps: CampaignMap[];
  updatedAt: string;
};

export type CampaignValidationSeverity = "error" | "warning";

export type CampaignValidationIssue = {
  severity: CampaignValidationSeverity;
  code: string;
  message: string;
  nodeId?: string;
};
