import type { CampaignMap, CampaignNode, CampaignNodeType } from "./types";
import { cloneCampaignMap } from "./storage";

export function newCampaignNodeId(prefix = "n"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createEmptyCampaignMap(input: {
  id: string;
  worldId: string;
  areaId: string;
  title: string;
}): CampaignMap {
  return {
    id: input.id,
    worldId: input.worldId,
    areaId: input.areaId,
    title: input.title,
    theme: "grasslands",
    catalogStatus: "new_draft",
    nodes: [],
  };
}

export function addTrackNode(
  map: CampaignMap,
  partial?: Partial<CampaignNode> & { worldId?: string; scenarioId?: string; trackId?: string },
): CampaignMap {
  const next = cloneCampaignMap(map);
  const maxY = next.nodes.reduce((m, n) => Math.max(m, n.y), 0);
  const node: CampaignNode = {
    id: partial?.id ?? newCampaignNodeId(),
    worldId: partial?.worldId ?? map.worldId,
    scenarioId: partial?.scenarioId ?? map.areaId,
    trackId: partial?.trackId ?? "",
    x: partial?.x ?? 50,
    y: partial?.y ?? Math.min(maxY + 12, 200),
    label: partial?.label ?? "New Track",
    type: (partial?.type as CampaignNodeType) ?? "track",
    connections: partial?.connections ? [...partial.connections] : [],
  };
  next.nodes.push(node);
  if (!next.entryNodeId) next.entryNodeId = node.id;
  return next;
}

export function updateNode(
  map: CampaignMap,
  nodeId: string,
  patch: Partial<CampaignNode>,
): CampaignMap {
  const next = cloneCampaignMap(map);
  next.nodes = next.nodes.map((n) => {
    if (n.id !== nodeId) return n;
    return {
      ...n,
      ...patch,
      id: n.id,
      connections: patch.connections ? [...patch.connections] : n.connections,
    };
  });
  return next;
}

export function removeNode(map: CampaignMap, nodeId: string): CampaignMap {
  const next = cloneCampaignMap(map);
  next.nodes = next.nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => ({
      ...n,
      connections: (n.connections ?? []).filter((c) => c !== nodeId),
    }));
  if (next.entryNodeId === nodeId) {
    next.entryNodeId = next.nodes[0]?.id;
  }
  return next;
}

export function addConnection(map: CampaignMap, fromId: string, toId: string): CampaignMap {
  if (fromId === toId) return map;
  const next = cloneCampaignMap(map);
  next.nodes = next.nodes.map((n) => {
    if (n.id !== fromId) return n;
    const conns = n.connections ?? [];
    if (conns.includes(toId)) return n;
    return { ...n, connections: [...conns, toId] };
  });
  return next;
}

export function removeConnection(map: CampaignMap, fromId: string, toId: string): CampaignMap {
  const next = cloneCampaignMap(map);
  next.nodes = next.nodes.map((n) => {
    if (n.id !== fromId) return n;
    return { ...n, connections: (n.connections ?? []).filter((c) => c !== toId) };
  });
  return next;
}

export function nudgeNode(
  map: CampaignMap,
  nodeId: string,
  dx: number,
  dy: number,
): CampaignMap {
  const next = cloneCampaignMap(map);
  next.nodes = next.nodes.map((n) => {
    if (n.id !== nodeId) return n;
    return {
      ...n,
      x: Math.max(5, Math.min(95, n.x + dx)),
      y: Math.max(2, n.y + dy),
    };
  });
  return next;
}

export function setNodePosition(map: CampaignMap, nodeId: string, x: number, y: number): CampaignMap {
  return updateNode(map, nodeId, {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, y),
  });
}
