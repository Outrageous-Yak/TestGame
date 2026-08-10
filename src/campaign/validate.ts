import type { WorldEntry } from "../ui/types";
import type { CampaignMap, CampaignValidationIssue } from "./types";

/** Structural campaign validation only — no board solvability / solver. */
export function validateCampaignMap(
  map: CampaignMap,
  worlds: WorldEntry[],
): CampaignValidationIssue[] {
  const issues: CampaignValidationIssue[] = [];

  if (!map.id?.trim()) {
    issues.push({ severity: "error", code: "missing_id", message: "Campaign map id is required" });
  }
  if (!map.title?.trim()) {
    issues.push({ severity: "error", code: "missing_title", message: "Campaign map title is required" });
  }
  if (!map.worldId?.trim()) {
    issues.push({ severity: "error", code: "missing_world", message: "Campaign map worldId is required" });
  }

  const world = worlds.find((w) => w.id === map.worldId);
  if (map.worldId && !world) {
    issues.push({
      severity: "error",
      code: "unknown_world",
      message: `World "${map.worldId}" not found in registry`,
    });
  }

  const seenIds = new Set<string>();
  const trackKeys = new Set<string>();

  for (const node of map.nodes) {
    if (!node.id?.trim()) {
      issues.push({ severity: "error", code: "empty_node_id", message: "Node has empty id" });
      continue;
    }
    if (seenIds.has(node.id)) {
      issues.push({
        severity: "error",
        code: "duplicate_node_id",
        message: `Duplicate node id "${node.id}"`,
        nodeId: node.id,
      });
    }
    seenIds.add(node.id);

    const trackKey = `${node.worldId}|${node.scenarioId}|${node.trackId}`;
    if (node.trackId && trackKeys.has(trackKey)) {
      issues.push({
        severity: "warning",
        code: "duplicate_track_node",
        message: `Track ${node.trackId} appears on more than one node`,
        nodeId: node.id,
      });
    }
    if (node.trackId) trackKeys.add(trackKey);

    if (node.type === "track" || !node.type) {
      const w = worlds.find((x) => x.id === node.worldId);
      const scenario = w?.scenarios.find((s) => s.id === node.scenarioId);
      const track = scenario?.tracks?.find((t) => t.id === node.trackId);
      if (!w || !scenario || !track) {
        issues.push({
          severity: "error",
          code: "missing_track_ref",
          message: `Node "${node.id}" references missing Track ${node.worldId}/${node.scenarioId}/${node.trackId}`,
          nodeId: node.id,
        });
      }
    }

    const conns = node.connections ?? [];
    const seenConn = new Set<string>();
    for (const cid of conns) {
      if (cid === node.id) {
        issues.push({
          severity: "error",
          code: "self_connection",
          message: `Node "${node.id}" connects to itself`,
          nodeId: node.id,
        });
      }
      if (seenConn.has(cid)) {
        issues.push({
          severity: "error",
          code: "duplicate_connection",
          message: `Duplicate connection ${node.id} → ${cid}`,
          nodeId: node.id,
        });
      }
      seenConn.add(cid);
      if (!map.nodes.some((n) => n.id === cid)) {
        issues.push({
          severity: "error",
          code: "dangling_connection",
          message: `Connection ${node.id} → ${cid} targets missing node`,
          nodeId: node.id,
        });
      }
    }
  }

  if (map.entryNodeId && !map.nodes.some((n) => n.id === map.entryNodeId)) {
    issues.push({
      severity: "error",
      code: "missing_entry_node",
      message: `entryNodeId "${map.entryNodeId}" not found`,
    });
  }

  // Simple connectivity: warn if graph has unreachable nodes from entry/first
  if (map.nodes.length > 1) {
    const startId = map.entryNodeId ?? map.nodes[0]?.id;
    if (startId) {
      const reachable = new Set<string>();
      const queue = [startId];
      const byId = new Map(map.nodes.map((n) => [n.id, n]));
      while (queue.length) {
        const id = queue.shift()!;
        if (reachable.has(id)) continue;
        reachable.add(id);
        for (const c of byId.get(id)?.connections ?? []) queue.push(c);
      }
      for (const n of map.nodes) {
        if (!reachable.has(n.id)) {
          issues.push({
            severity: "warning",
            code: "disconnected_node",
            message: `Node "${n.id}" is not reachable from entry`,
            nodeId: n.id,
          });
        }
      }
    }
  }

  return issues;
}
