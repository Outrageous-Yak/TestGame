import type { ProjectExport } from '@/domain/types';

export function exportToJson(data: ProjectExport): string {
  return JSON.stringify(data, null, 2);
}

export function parseImportJson(json: string): ProjectExport {
  const parsed = JSON.parse(json) as ProjectExport;
  if (!parsed.schemaVersion || !parsed.project || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid project export format');
  }
  return parsed;
}

export function downloadJson(data: ProjectExport, filename: string): void {
  const blob = new Blob([exportToJson(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function nodesToCsv(data: ProjectExport): string {
  const headers = ['id', 'type', 'title', 'slug', 'canonStatus', 'summary'];
  const rows = data.nodes.map((n) =>
    [n.id, n.type, n.title, n.slug, n.canonStatus, n.summary.replace(/"/g, '""')]
      .map((v) => `"${v}"`)
      .join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export function relationshipsToCsv(data: ProjectExport): string {
  const headers = ['id', 'sourceNodeId', 'targetNodeId', 'relationshipType', 'notes'];
  const rows = data.relationships
    .filter((r) => !r.archivedAt)
    .map((r) =>
      [r.id, r.sourceNodeId, r.targetNodeId, r.relationshipType, (r.notes ?? '').replace(/"/g, '""')]
        .map((v) => `"${v}"`)
        .join(','),
    );
  return [headers.join(','), ...rows].join('\n');
}

export function generateMermaid(data: ProjectExport, nodeIds?: string[]): string {
  const activeRels = data.relationships.filter((r) => !r.archivedAt);
  const nodeMap = new Map(data.nodes.filter((n) => !n.archivedAt).map((n) => [n.id, n]));

  let rels = activeRels;
  if (nodeIds && nodeIds.length > 0) {
    const idSet = new Set(nodeIds);
    rels = activeRels.filter((r) => idSet.has(r.sourceNodeId) && idSet.has(r.targetNodeId));
  }

  const lines = ['flowchart TD'];
  const usedNodes = new Set<string>();

  for (const rel of rels) {
    const source = nodeMap.get(rel.sourceNodeId);
    const target = nodeMap.get(rel.targetNodeId);
    if (!source || !target) continue;

    const srcId = source.slug.toUpperCase().replace(/-/g, '_');
    const tgtId = target.slug.toUpperCase().replace(/-/g, '_');
    usedNodes.add(rel.sourceNodeId);
    usedNodes.add(rel.targetNodeId);

    const srcLabel = source.title.replace(/"/g, "'");
    const tgtLabel = target.title.replace(/"/g, "'");
    lines.push(`  ${srcId}["${srcLabel}"]`);
    lines.push(`  ${tgtId}["${tgtLabel}"]`);
    const edgeLabel = rel.relationshipType.toLowerCase().replace(/_/g, ' ');
    lines.push(`  ${srcId} -->|${edgeLabel}| ${tgtId}`);
  }

  if (usedNodes.size === 0) {
    lines.push('  empty["No relationships match current filter"]');
  }

  return [...new Set(lines)].join('\n');
}
