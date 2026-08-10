import type { CampaignDraftBundle, CampaignMap } from "./types";

export const CAMPAIGN_MAP_DRAFTS_KEY = "campaign_map_drafts_v1";

export function emptyCampaignDraftBundle(): CampaignDraftBundle {
  return { version: 1, maps: [], updatedAt: new Date().toISOString() };
}

export function loadCampaignDraftBundle(
  storage: Pick<Storage, "getItem"> = localStorage,
): CampaignDraftBundle {
  try {
    const raw = storage.getItem(CAMPAIGN_MAP_DRAFTS_KEY);
    if (!raw) return emptyCampaignDraftBundle();
    const parsed = JSON.parse(raw) as CampaignDraftBundle;
    if (parsed.version !== 1 || !Array.isArray(parsed.maps)) return emptyCampaignDraftBundle();
    return parsed;
  } catch {
    return emptyCampaignDraftBundle();
  }
}

export function saveCampaignDraftBundle(
  bundle: CampaignDraftBundle,
  storage: Pick<Storage, "setItem"> = localStorage,
): void {
  const slim: CampaignDraftBundle = {
    version: 1,
    maps: bundle.maps.map(cloneCampaignMap),
    updatedAt: new Date().toISOString(),
  };
  try {
    storage.setItem(CAMPAIGN_MAP_DRAFTS_KEY, JSON.stringify(slim));
  } catch (e) {
    console.warn("Campaign map draft save failed", e);
  }
}

export function cloneCampaignMap(map: CampaignMap): CampaignMap {
  return {
    ...map,
    nodes: map.nodes.map((n) => ({
      ...n,
      connections: n.connections ? [...n.connections] : [],
    })),
  };
}

export function upsertCampaignDraft(
  bundle: CampaignDraftBundle,
  map: CampaignMap,
): CampaignDraftBundle {
  const next = cloneCampaignMap(map);
  const maps = bundle.maps.filter((m) => m.id !== next.id).concat(next);
  return { ...bundle, maps, updatedAt: new Date().toISOString() };
}

export function deleteCampaignDraft(
  bundle: CampaignDraftBundle,
  mapId: string,
): CampaignDraftBundle {
  return {
    ...bundle,
    maps: bundle.maps.filter((m) => m.id !== mapId),
    updatedAt: new Date().toISOString(),
  };
}

export function getCampaignDraft(
  bundle: CampaignDraftBundle,
  mapId: string,
): CampaignMap | null {
  const found = bundle.maps.find((m) => m.id === mapId);
  return found ? cloneCampaignMap(found) : null;
}
