import type { ProjectExport } from '@/domain/types';

export interface EditorialReport {
  id: string;
  title: string;
  description: string;
  nodeIds: string[];
  severity: 'info' | 'warning';
}

export function generateEditorialReports(data: ProjectExport): EditorialReport[] {
  const reports: EditorialReport[] = [];
  const activeNodes = data.nodes.filter((n) => !n.archivedAt);
  const activeRels = data.relationships.filter((r) => !r.archivedAt);

  const linkedNodeIds = new Set<string>();
  for (const rel of activeRels) {
    linkedNodeIds.add(rel.sourceNodeId);
    linkedNodeIds.add(rel.targetNodeId);
  }
  for (const page of data.pages) {
    for (const id of page.assignedNodeIds) linkedNodeIds.add(id);
  }

  const unused = activeNodes.filter((n) => !linkedNodeIds.has(n.id) && !['BOOK', 'CHAPTER'].includes(n.type));
  if (unused.length > 0) {
    reports.push({
      id: 'unused-nodes',
      title: 'Unused nodes',
      description: `${unused.length} node(s) have no relationships or page assignments`,
      nodeIds: unused.map((n) => n.id),
      severity: 'info',
    });
  }

  const mysteries = activeNodes.filter((n) => n.type === 'MYSTERY');
  const unresolved = mysteries.filter((m) =>
    !activeRels.some((r) => r.relationshipType === 'RESOLVES' && r.targetNodeId === m.id),
  );
  if (unresolved.length > 0) {
    reports.push({
      id: 'unresolved-mysteries',
      title: 'Mysteries without payoff',
      description: `${unresolved.length} mystery node(s) lack a RESOLVES link`,
      nodeIds: unresolved.map((n) => n.id),
      severity: 'warning',
    });
  }

  const payoffs = activeRels.filter((r) => r.relationshipType === 'PAYS_OFF');
  const unseeded = payoffs.filter((p) =>
    !activeRels.some((r) => r.relationshipType === 'FORESHADOWS' && r.targetNodeId === p.targetNodeId),
  );
  if (unseeded.length > 0) {
    reports.push({
      id: 'unseeded-payoffs',
      title: 'Unseeded payoffs',
      description: `${unseeded.length} PAYS_OFF link(s) lack foreshadowing setup`,
      nodeIds: [...new Set(unseeded.flatMap((r) => [r.sourceNodeId, r.targetNodeId]))],
      severity: 'warning',
    });
  }

  const adaptedNodes = new Set(
    activeRels.filter((r) => r.relationshipType === 'ADAPTED_AS').map((r) => r.sourceNodeId),
  );
  const sourceEvents = activeNodes.filter((n) =>
    (n.type === 'EVENT' || n.type === 'SCENE') && n.canonStatus === 'CANON' && !adaptedNodes.has(n.id),
  );
  if (sourceEvents.length > 0 && data.issues.length > 0) {
    reports.push({
      id: 'source-not-adapted',
      title: 'Canon scenes not placed',
      description: `${sourceEvents.length} canon scene/event(s) not linked via ADAPTED_AS`,
      nodeIds: sourceEvents.slice(0, 20).map((n) => n.id),
      severity: 'info',
    });
  }

  const primaryChars = activeNodes.filter((n) => n.type === 'CHARACTER' && n.importance === 'PRIMARY');
  for (const issue of data.issues) {
    const issuePages = data.pages.filter((p) => p.issueId === issue.id);
    const assigned = new Set(issuePages.flatMap((p) => p.assignedNodeIds));
    const missing = primaryChars.filter((c) => !assigned.has(c.id));
    if (missing.length > 0 && issuePages.some((p) => p.assignedNodeIds.length > 0)) {
      reports.push({
        id: `char-gap-${issue.id}`,
        title: `Issue ${issue.number}: primary characters absent`,
        description: `${missing.length} primary character(s) not on any page`,
        nodeIds: missing.map((n) => n.id),
        severity: 'info',
      });
    }
  }

  return reports;
}

export function nodeTitles(data: ProjectExport, ids: string[]): string[] {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  return ids.map((id) => byId.get(id)?.title ?? id);
}
