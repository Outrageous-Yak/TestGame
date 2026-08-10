import type { CampaignMap, CampaignNode } from "./types";
import type { WorldEntry } from "../ui/types";
import type { ProgressionSaveV1 } from "../progression/types";
import {
  isTrackNodePlayable,
  resolveMapCurrentTrackKey,
  resolveNodeViewState,
  resolvePlayableCampaignMap,
} from "./index";
import type { CampaignPlayOrigin } from "./playOrigin";
import { isCampaignOrigin } from "./playOrigin";

/** Pure helper: build campaign origin from a launch target. */
export function buildCampaignOrigin(input: {
  campaignMapId: string;
  areaId: string;
  nodeId: string;
  worldId: string;
  scenarioId: string;
  trackId: string;
}): CampaignPlayOrigin {
  return { kind: "campaign", ...input };
}

/** Resolve which map to reopen after leaving a Track. */
export function resolveReturnCampaignMapId(
  origin: CampaignPlayOrigin | null,
  fallbackMapId?: string,
): string {
  if (isCampaignOrigin(origin)) return origin.campaignMapId;
  return fallbackMapId ?? resolvePlayableCampaignMap().id;
}

/** Snapshot node view states for assertions / refresh checks. */
export function snapshotMapNodeStates(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  map: CampaignMap,
  options?: { bypassLocks?: boolean },
): Record<string, string> {
  const currentKey = resolveMapCurrentTrackKey(progress, worlds, map, options);
  const out: Record<string, string> = {};
  for (const node of map.nodes) {
    if (!isTrackNodePlayable(worlds, node)) {
      out[node.id] = "INVALID";
      continue;
    }
    out[node.id] = resolveNodeViewState(progress, worlds, node, currentKey, options);
  }
  return out;
}

export function collectInvalidTrackNodes(worlds: WorldEntry[], map: CampaignMap): CampaignNode[] {
  return map.nodes.filter((n) => (n.type ?? "track") === "track" && !isTrackNodePlayable(worlds, n));
}
