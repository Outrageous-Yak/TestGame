/**
 * Navigation context for Campaign Map ↔ Track round-trips.
 * Stable IDs only — never display labels.
 */

export type CampaignPlayOrigin =
  | {
      kind: "campaign";
      /** CampaignMap.id */
      campaignMapId: string;
      /** CampaignMap.areaId (Scenario/Area foundation) */
      areaId: string;
      /** CampaignNode.id that launched the Track */
      nodeId: string;
      worldId: string;
      scenarioId: string;
      trackId: string;
    }
  | {
      kind: "list";
    };

export function isCampaignOrigin(
  origin: CampaignPlayOrigin | null | undefined,
): origin is Extract<CampaignPlayOrigin, { kind: "campaign" }> {
  return origin?.kind === "campaign";
}
