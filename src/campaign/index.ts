import type { CampaignMap, CampaignNode, CampaignNodeViewState } from "./types";
import type { ProgressionSaveV1 } from "../progression/types";
import type { WorldEntry } from "../ui/types";
import { getTrackStatus } from "../progression";
import { FORGOTTEN_CITADEL_PATH_MAP } from "./maps/forgottenCitadelPath";
import { cloneCampaignMap, getCampaignDraft, loadCampaignDraftBundle } from "./storage";

export const CAMPAIGN_MAPS: CampaignMap[] = [FORGOTTEN_CITADEL_PATH_MAP];

export function getCampaignMap(mapId: string): CampaignMap | undefined {
  return CAMPAIGN_MAPS.find((m) => m.id === mapId);
}

export function getDefaultCampaignMap(): CampaignMap {
  return cloneCampaignMap(FORGOTTEN_CITADEL_PATH_MAP);
}

export function getCampaignMapsForWorld(worldId: string): CampaignMap[] {
  return CAMPAIGN_MAPS.filter((m) => m.worldId === worldId).map(cloneCampaignMap);
}

/** Production maps plus local drafts for builder catalog. */
export function listCampaignCatalog(): CampaignMap[] {
  const drafts = loadCampaignDraftBundle();
  const draftById = new Map(drafts.maps.map((m) => [m.id, m]));
  const items: CampaignMap[] = [];

  for (const prod of CAMPAIGN_MAPS) {
    const draft = draftById.get(prod.id);
    if (draft) {
      items.push({ ...cloneCampaignMap(draft), catalogStatus: "modified_draft" });
      draftById.delete(prod.id);
    } else {
      items.push({ ...cloneCampaignMap(prod), catalogStatus: "production" });
    }
  }

  for (const draft of draftById.values()) {
    items.push({ ...cloneCampaignMap(draft), catalogStatus: draft.catalogStatus ?? "new_draft" });
  }

  return items;
}

/**
 * Player / preview resolution: local draft overlays production when present.
 * Never mutates production modules.
 */
export function resolvePlayableCampaignMap(mapId?: string): CampaignMap {
  const id = mapId ?? FORGOTTEN_CITADEL_PATH_MAP.id;
  const draft = getCampaignDraft(loadCampaignDraftBundle(), id);
  if (draft) return { ...draft, catalogStatus: "modified_draft" };
  const prod = getCampaignMap(id);
  return prod ? { ...cloneCampaignMap(prod), catalogStatus: "production" } : getDefaultCampaignMap();
}

export function resolveNodeTrack(
  worlds: WorldEntry[],
  node: CampaignNode,
): {
  world: WorldEntry;
  scenario: NonNullable<WorldEntry["scenarios"][number]>;
  track: NonNullable<NonNullable<WorldEntry["scenarios"][number]>["tracks"]>[number];
  trackIndex: number;
} | null {
  const world = worlds.find((w) => w.id === node.worldId);
  if (!world) return null;
  const scenario = world.scenarios.find((s) => s.id === node.scenarioId);
  if (!scenario) return null;
  const tracks = scenario.tracks ?? [];
  const trackIndex = tracks.findIndex((t) => t.id === node.trackId);
  if (trackIndex < 0) return null;
  return { world, scenario, track: tracks[trackIndex], trackIndex };
}

export function resolveNodeViewState(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  node: CampaignNode,
  currentTrackKey: string | null,
  options?: { bypassLocks?: boolean },
): CampaignNodeViewState {
  const resolved = resolveNodeTrack(worlds, node);
  if (!resolved) return "LOCKED";

  const status = getTrackStatus(
    progress,
    worlds,
    resolved.world,
    resolved.scenario,
    resolved.track,
    resolved.trackIndex,
    options,
  );

  if (status === "COMPLETED") return "COMPLETED";
  if (status === "LOCKED") return "LOCKED";

  const key = `${node.worldId}|${node.trackId}`;
  if (currentTrackKey === key) return "CURRENT";
  return "AVAILABLE";
}

/** Recommended next node on this map from existing progression (does not write save). */
export function resolveMapCurrentTrackKey(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
  map: CampaignMap,
  options?: { bypassLocks?: boolean },
): string | null {
  for (const node of map.nodes) {
    const resolved = resolveNodeTrack(worlds, node);
    if (!resolved) continue;
    const status = getTrackStatus(
      progress,
      worlds,
      resolved.world,
      resolved.scenario,
      resolved.track,
      resolved.trackIndex,
      options,
    );
    if (status === "AVAILABLE") {
      return `${node.worldId}|${node.trackId}`;
    }
  }
  return null;
}

export type {
  CampaignMap,
  CampaignNode,
  CampaignNodeViewState,
  CampaignDraftBundle,
  CampaignValidationIssue,
} from "./types";
export { FORGOTTEN_CITADEL_PATH_MAP } from "./maps/forgottenCitadelPath";
export {
  CAMPAIGN_MAP_DRAFTS_KEY,
  cloneCampaignMap,
  loadCampaignDraftBundle,
  saveCampaignDraftBundle,
  upsertCampaignDraft,
  deleteCampaignDraft,
  getCampaignDraft,
  emptyCampaignDraftBundle,
} from "./storage";
export { validateCampaignMap } from "./validate";
export {
  addTrackNode,
  updateNode,
  removeNode,
  addConnection,
  removeConnection,
  nudgeNode,
  setNodePosition,
  createEmptyCampaignMap,
  newCampaignNodeId,
} from "./mutate";
