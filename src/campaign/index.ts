import type { CampaignMap, CampaignNode, CampaignNodeViewState } from "./types";
import type { ProgressionSaveV1 } from "../progression/types";
import type { WorldEntry } from "../ui/types";
import { getContinueTarget, getTrackStatus } from "../progression";
import { FORGOTTEN_CITADEL_PATH_MAP } from "./maps/forgottenCitadelPath";

export const CAMPAIGN_MAPS: CampaignMap[] = [FORGOTTEN_CITADEL_PATH_MAP];

export function getCampaignMap(mapId: string): CampaignMap | undefined {
  return CAMPAIGN_MAPS.find((m) => m.id === mapId);
}

export function getDefaultCampaignMap(): CampaignMap {
  return FORGOTTEN_CITADEL_PATH_MAP;
}

export function getCampaignMapsForWorld(worldId: string): CampaignMap[] {
  return CAMPAIGN_MAPS.filter((m) => m.worldId === worldId);
}

export function resolveNodeTrack(
  worlds: WorldEntry[],
  node: CampaignNode,
): { world: WorldEntry; scenario: NonNullable<WorldEntry["scenarios"][number]>; track: NonNullable<NonNullable<WorldEntry["scenarios"][number]>["tracks"]>[number]; trackIndex: number } | null {
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

/** @deprecated Prefer resolveMapCurrentTrackKey for map UI */
export function resolveCurrentTrackKey(
  progress: ProgressionSaveV1,
  worlds: WorldEntry[],
): string | null {
  const target = getContinueTarget(progress, worlds);
  if (target.kind !== "track") return null;
  return `${target.worldId}|${target.trackId}`;
}

export type { CampaignMap, CampaignNode, CampaignNodeViewState } from "./types";
export { FORGOTTEN_CITADEL_PATH_MAP } from "./maps/forgottenCitadelPath";
