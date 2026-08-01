import type { Node, ProjectExport, Relationship } from '@/domain/types';
import { NODE_TYPE_LABELS } from '@/domain/utils';

export type TreeKind =
  | 'story'
  | 'character'
  | 'reader'
  | 'world'
  | 'mythology'
  | 'creature'
  | 'adaptation';

export interface TreeNodeVm {
  id: string;
  nodeId: string | null;
  label: string;
  nodeType: string;
  summary: string;
  canonStatus: string;
  completionStatus: string;
  linkCount: number;
  children: TreeNodeVm[];
}

const TREE_LABELS: Record<TreeKind, string> = {
  story: 'Story Tree',
  character: 'Character Tree',
  reader: 'Reader Tree',
  world: 'World Tree',
  mythology: 'Mythology Tree',
  creature: 'Creature Tree',
  adaptation: 'Adaptation Tree',
};

export function getTreeLabel(kind: TreeKind): string {
  return TREE_LABELS[kind];
}

function activeNodes(data: ProjectExport): Node[] {
  return data.nodes.filter((n) => !n.archivedAt);
}

function activeRels(data: ProjectExport): Relationship[] {
  return data.relationships.filter((r) => !r.archivedAt);
}

function linkCount(nodeId: string, rels: Relationship[]): number {
  return rels.filter((r) => r.sourceNodeId === nodeId || r.targetNodeId === nodeId).length;
}

function nodeVm(node: Node, rels: Relationship[], children: TreeNodeVm[] = []): TreeNodeVm {
  return {
    id: node.id,
    nodeId: node.id,
    label: node.title,
    nodeType: NODE_TYPE_LABELS[node.type],
    summary: node.summary,
    canonStatus: node.canonStatus,
    completionStatus: node.completionStatus,
    linkCount: linkCount(node.id, rels),
    children,
  };
}

function childrenOf(
  parentId: string,
  rels: Relationship[],
  nodesById: Map<string, Node>,
  relTypes: Relationship['relationshipType'][],
  visited: Set<string>,
): TreeNodeVm[] {
  return rels
    .filter((r) => r.sourceNodeId === parentId && relTypes.includes(r.relationshipType))
    .map((r) => nodesById.get(r.targetNodeId))
    .filter((n): n is Node => !!n && !visited.has(n.id))
    .map((n) => {
      visited.add(n.id);
      return nodeVm(n, rels, childrenOf(n.id, rels, nodesById, relTypes, visited));
    });
}

function nodesByType(data: ProjectExport, types: Node['type'][]): TreeNodeVm[] {
  const rels = activeRels(data);
  return activeNodes(data)
    .filter((n) => types.includes(n.type))
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((n) => nodeVm(n, rels));
}

function buildCharacterTree(data: ProjectExport): TreeNodeVm[] {
  const rels = activeRels(data);
  const nodesById = new Map(activeNodes(data).map((n) => [n.id, n]));
  const roots = activeNodes(data).filter((n) => n.type === 'CHARACTER');

  return roots.map((char) => {
    const visited = new Set<string>([char.id]);
    const children = childrenOf(
      char.id,
      rels,
      nodesById,
      ['RELATED_TO', 'PARTICIPATES_IN', 'APPEARS_IN', 'LEADS_TO'],
      visited,
    );
    return nodeVm(char, rels, children);
  });
}

function buildWorldTree(data: ProjectExport): TreeNodeVm[] {
  const rels = activeRels(data);
  const nodesById = new Map(activeNodes(data).map((n) => [n.id, n]));
  const locations = activeNodes(data).filter((n) => n.type === 'LOCATION');
  const childTargets = new Set(
    rels.filter((r) => r.relationshipType === 'LOCATED_WITHIN').map((r) => r.targetNodeId),
  );
  const roots = locations.filter((l) => !childTargets.has(l.id));

  return roots.map((loc) => {
    const visited = new Set<string>([loc.id]);
    const children = childrenOf(loc.id, rels, nodesById, ['LOCATED_WITHIN', 'OCCURS_AT', 'APPEARS_IN'], visited);
    return nodeVm(loc, rels, children);
  });
}

function buildAdaptationTree(data: ProjectExport): TreeNodeVm[] {
  const rels = activeRels(data);
  const nodesById = new Map(activeNodes(data).map((n) => [n.id, n]));
  const books = activeNodes(data).filter((n) => n.type === 'BOOK').sort((a, b) => {
    const an = (a.propertiesJson.bookNumber as number) ?? 0;
    const bn = (b.propertiesJson.bookNumber as number) ?? 0;
    return an - bn;
  });

  return books.map((book) => {
    const visited = new Set<string>([book.id]);
    const children = childrenOf(book.id, rels, nodesById, ['SOURCE_FOR', 'ADAPTED_AS', 'LEADS_TO'], visited);
    return nodeVm(book, rels, children);
  });
}

function buildStoryTree(data: ProjectExport): TreeNodeVm[] {
  const rels = activeRels(data);
  const issues = [...data.issues].sort((a, b) => a.sortOrder - b.sortOrder);

  return issues.map((issue) => {
    const issuePages = data.pages.filter((p) => p.issueId === issue.id);
    const assignedIds = new Set(issuePages.flatMap((p) => p.assignedNodeIds));
    const sceneNodes = activeNodes(data).filter((n) => assignedIds.has(n.id));

    const children: TreeNodeVm[] = sceneNodes.map((scene) => {
      const nodesById = new Map(activeNodes(data).map((n) => [n.id, n]));
      const visited = new Set<string>([scene.id]);
      const eventChildren = childrenOf(scene.id, rels, nodesById, ['LEADS_TO', 'CAUSES', 'PARTICIPATES_IN'], visited);
      return nodeVm(scene, rels, eventChildren);
    });

    return {
      id: issue.id,
      nodeId: issue.nodeId,
      label: `#${issue.number} ${issue.title}`,
      nodeType: 'Issue',
      summary: issue.logline || issue.purpose,
      canonStatus: 'ADAPTATION',
      completionStatus: issue.status,
      linkCount: children.length,
      children,
    };
  });
}

function buildReaderTree(data: ProjectExport): TreeNodeVm[] {
  return [...data.issues]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((issue) => {
      const states = data.readerStates.filter((r) => r.issueId === issue.id);
      const children: TreeNodeVm[] = states.map((s) => ({
        id: s.id,
        nodeId: s.nodeId,
        label: s.content || s.recordType,
        nodeType: s.recordType,
        summary: s.content,
        canonStatus: 'ADAPTATION',
        completionStatus: 'DRAFT',
        linkCount: 0,
        children: [],
      }));
      return {
        id: issue.id,
        nodeId: null,
        label: `Issue ${issue.number}: ${issue.title}`,
        nodeType: 'Issue',
        summary: issue.purpose,
        canonStatus: 'ADAPTATION',
        completionStatus: issue.status,
        linkCount: children.length,
        children,
      };
    });
}

export function buildTree(data: ProjectExport, kind: TreeKind): TreeNodeVm[] {
  switch (kind) {
    case 'story':
      return buildStoryTree(data);
    case 'character':
      return buildCharacterTree(data);
    case 'reader':
      return buildReaderTree(data);
    case 'world':
      return buildWorldTree(data);
    case 'mythology':
      return nodesByType(data, ['MYTH', 'SYMBOL', 'REVEAL', 'MYSTERY']);
    case 'creature':
      return nodesByType(data, ['CREATURE']);
    case 'adaptation':
      return buildAdaptationTree(data);
    default:
      return [];
  }
}

export function flattenTree(nodes: TreeNodeVm[]): TreeNodeVm[] {
  const result: TreeNodeVm[] = [];
  const walk = (list: TreeNodeVm[]) => {
    for (const n of list) {
      result.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return result;
}
