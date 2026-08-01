import type { Node, Relationship, ProjectExport } from '../types';

export function getBacklinks(
  nodeId: string,
  relationships: Relationship[],
): { incoming: Relationship[]; outgoing: Relationship[] } {
  return {
    incoming: relationships.filter((r) => r.targetNodeId === nodeId && !r.archivedAt),
    outgoing: relationships.filter((r) => r.sourceNodeId === nodeId && !r.archivedAt),
  };
}

export function searchNodes(nodes: Node[], query: string): Node[] {
  const q = query.toLowerCase().trim();
  if (!q) return nodes.filter((n) => !n.archivedAt);

  return nodes.filter((n) => {
    if (n.archivedAt) return false;
    const props = JSON.stringify(n.propertiesJson).toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.slug.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      props.includes(q)
    );
  });
}

export function validateExport(data: ProjectExport): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(data.nodes.map((n) => n.id));

  for (const rel of data.relationships) {
    if (!nodeIds.has(rel.sourceNodeId)) {
      errors.push(`Broken link: relationship ${rel.id} references missing source ${rel.sourceNodeId}`);
    }
    if (!nodeIds.has(rel.targetNodeId)) {
      errors.push(`Broken link: relationship ${rel.id} references missing target ${rel.targetNodeId}`);
    }
  }

  const slugs = new Map<string, string>();
  for (const node of data.nodes) {
    if (slugs.has(node.slug)) {
      errors.push(`Duplicate slug: ${node.slug}`);
    }
    slugs.set(node.slug, node.id);
  }

  return errors;
}

export function detectBrokenLinks(
  nodes: Node[],
  relationships: Relationship[],
): Array<{ relationshipId: string; message: string }> {
  const activeNodeIds = new Set(nodes.filter((n) => !n.archivedAt).map((n) => n.id));
  const findings: Array<{ relationshipId: string; message: string }> = [];

  for (const rel of relationships) {
    if (rel.archivedAt) continue;
    if (!activeNodeIds.has(rel.sourceNodeId)) {
      findings.push({
        relationshipId: rel.id,
        message: `Relationship references missing source node ${rel.sourceNodeId}`,
      });
    }
    if (!activeNodeIds.has(rel.targetNodeId)) {
      findings.push({
        relationshipId: rel.id,
        message: `Relationship references missing target node ${rel.targetNodeId}`,
      });
    }
  }

  return findings;
}
