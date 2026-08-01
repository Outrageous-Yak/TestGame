import type { ProjectExport } from '@/domain/types';

/** Infer the earliest issue number where a node appears on a page. */
export function inferNodeIssueNumber(data: ProjectExport, nodeId: string): number | null {
  let minIssue: number | null = null;
  for (const page of data.pages) {
    if (!page.assignedNodeIds.includes(nodeId)) continue;
    const issue = data.issues.find((i) => i.id === page.issueId);
    if (!issue) continue;
    if (minIssue === null || issue.number < minIssue) minIssue = issue.number;
  }
  return minIssue;
}

/** Infer issue number for a relationship from explicit fields or page assignments. */
export function inferRelationshipIssue(
  data: ProjectExport,
  rel: { sourceNodeId: string; targetNodeId: string; issueStart: number | null; issueEnd: number | null },
  useEnd = false,
): number | null {
  const explicit = useEnd ? rel.issueEnd : rel.issueStart;
  if (explicit !== null) return explicit;
  const nodeId = useEnd ? rel.targetNodeId : rel.sourceNodeId;
  return inferNodeIssueNumber(data, nodeId);
}

export function getIssueByNumber(data: ProjectExport, issueNumber: number) {
  return data.issues.find((i) => i.number === issueNumber) ?? null;
}

export function getPagesForIssue(data: ProjectExport, issueId: string) {
  return data.pages.filter((p) => p.issueId === issueId).sort((a, b) => a.pageNumber - b.pageNumber);
}
