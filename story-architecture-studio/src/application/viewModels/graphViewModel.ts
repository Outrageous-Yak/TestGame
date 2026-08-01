import type { CanonStatus, Node, NodeType, ProjectExport, Relationship } from '@/domain/types';
import { NODE_TYPE_LABELS } from '@/domain/utils';

export interface GraphViewOptions {
  focusNodeId?: string | null;
  depth?: number;
  typeFilter?: NodeType | 'ALL';
  canonFilter?: CanonStatus | 'ALL';
  maxNodes?: number;
}

export interface GraphNodeVm {
  id: string;
  label: string;
  nodeType: string;
  canonStatus: string;
  x: number;
  y: number;
}

export interface GraphEdgeVm {
  id: string;
  source: string;
  target: string;
  label: string;
}

function activeNodes(data: ProjectExport): Node[] {
  return data.nodes.filter((n) => !n.archivedAt);
}

function activeRels(data: ProjectExport): Relationship[] {
  return data.relationships.filter((r) => !r.archivedAt);
}

function filterNodes(nodes: Node[], options: GraphViewOptions): Node[] {
  return nodes.filter((n) => {
    if (options.typeFilter && options.typeFilter !== 'ALL' && n.type !== options.typeFilter) return false;
    if (options.canonFilter && options.canonFilter !== 'ALL' && n.canonStatus !== options.canonFilter) return false;
    return true;
  });
}

function collectNeighborhood(
  startId: string,
  rels: Relationship[],
  depth: number,
): Set<string> {
  const visited = new Set<string>([startId]);
  let frontier = [startId];

  for (let d = 0; d < depth; d += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const rel of rels) {
        const neighbor = rel.sourceNodeId === id ? rel.targetNodeId : rel.targetNodeId === id ? rel.sourceNodeId : null;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }

  return visited;
}

export function findPath(
  data: ProjectExport,
  fromId: string,
  toId: string,
): string[] | null {
  if (fromId === toId) return [fromId];
  const rels = activeRels(data);
  const queue: string[] = [fromId];
  const visited = new Set<string>([fromId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const rel of rels) {
      const neighbors: string[] = [];
      if (rel.sourceNodeId === current) neighbors.push(rel.targetNodeId);
      if (rel.targetNodeId === current) neighbors.push(rel.sourceNodeId);

      for (const n of neighbors) {
        if (visited.has(n)) continue;
        visited.add(n);
        parent.set(n, current);
        if (n === toId) {
          const path = [toId];
          let p: string | undefined = toId;
          while (p && p !== fromId) {
            p = parent.get(p);
            if (p) path.unshift(p);
          }
          return path;
        }
        queue.push(n);
      }
    }
  }

  return null;
}

export function buildGraphViewModel(
  data: ProjectExport,
  options: GraphViewOptions = {},
): { nodes: GraphNodeVm[]; edges: GraphEdgeVm[] } {
  const depth = options.depth ?? 2;
  const maxNodes = options.maxNodes ?? 80;
  const allNodes = activeNodes(data);
  const allRels = activeRels(data);

  let includedIds: Set<string>;

  if (options.focusNodeId) {
    includedIds = collectNeighborhood(options.focusNodeId, allRels, depth);
  } else {
    includedIds = new Set(
      filterNodes(allNodes, options)
        .slice(0, maxNodes)
        .map((n) => n.id),
    );
  }

  const nodes = allNodes
    .filter((n) => includedIds.has(n.id))
    .filter((n) => filterNodes([n], options).length > 0);

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = allRels
    .filter((r) => nodeIds.has(r.sourceNodeId) && nodeIds.has(r.targetNodeId))
    .map((r) => ({
      id: r.id,
      source: r.sourceNodeId,
      target: r.targetNodeId,
      label: r.relationshipType.toLowerCase().replace(/_/g, ' '),
    }));

  const count = nodes.length;
  const cols = Math.ceil(Math.sqrt(count)) || 1;

  const graphNodes: GraphNodeVm[] = nodes.map((n, i) => ({
    id: n.id,
    label: n.title,
    nodeType: NODE_TYPE_LABELS[n.type],
    canonStatus: n.canonStatus,
    x: (i % cols) * 220 + 40,
    y: Math.floor(i / cols) * 120 + 40,
  }));

  return { nodes: graphNodes, edges };
}
