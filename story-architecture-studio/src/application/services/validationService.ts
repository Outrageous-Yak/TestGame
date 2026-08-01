import type { ProjectExport, ValidationFinding } from '@/domain/types';
import { detectBrokenLinks } from '@/domain/validation/rules';
import { estimatePageDensity, nowIso } from '@/domain/utils';
import { v4 as uuidv4 } from 'uuid';

export function runValidation(data: ProjectExport): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const now = nowIso();
  const projectId = data.project.id;

  for (const { message } of detectBrokenLinks(data.nodes, data.relationships)) {
    findings.push({
      id: uuidv4(),
      projectId,
      code: 'BROKEN_LINK',
      message,
      nodeIds: [],
      dismissed: false,
      dismissReason: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const slugs = new Map<string, string>();
  for (const node of data.nodes.filter((n) => !n.archivedAt)) {
    if (slugs.has(node.slug)) {
      findings.push({
        id: uuidv4(),
        projectId,
        code: 'DUPLICATE_SLUG',
        message: `Duplicate slug "${node.slug}"`,
        nodeIds: [node.id, slugs.get(node.slug)!],
        dismissed: false,
        dismissReason: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    slugs.set(node.slug, node.id);

    if (node.canonStatus === 'CANON' && node.sourceConfidence === 'EXPLICIT' && !node.summary && !node.description) {
      findings.push({
        id: uuidv4(),
        projectId,
        code: 'MISSING_SOURCE',
        message: `Canon node "${node.title}" lacks summary or source context`,
        nodeIds: [node.id],
        dismissed: false,
        dismissReason: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const issue of data.issues) {
    const pages = data.pages.filter((p) => p.issueId === issue.id);
    const page19 = pages.find((p) => p.pageNumber === 19);
    if (page19 && !page19.storyPurpose && page19.assignedNodeIds.length === 0) {
      findings.push({
        id: uuidv4(),
        projectId,
        code: 'EMPTY_ISSUE_END',
        message: `Issue ${issue.number} page 19 lacks ending content`,
        nodeIds: [page19.id],
        dismissed: false,
        dismissReason: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const page20 = pages.find((p) => p.pageNumber === 20);
    if (page20 && !page20.storyPurpose && page20.assignedNodeIds.length === 0) {
      findings.push({
        id: uuidv4(),
        projectId,
        code: 'EMPTY_EPILOGUE',
        message: `Issue ${issue.number} page 20 lacks epilogue purpose`,
        nodeIds: [page20.id],
        dismissed: false,
        dismissReason: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const page of pages) {
      const beats = data.panelBeats.filter((b) => b.pageId === page.id);
      const density = estimatePageDensity(page.panelCount, page.assignedNodeIds.length, beats.length);
      if (density === 'overloaded') {
        findings.push({
          id: uuidv4(),
          projectId,
          code: 'OVERLOADED_PAGE',
          message: `Issue ${issue.number} page ${page.pageNumber} is overloaded`,
          nodeIds: [page.id],
          dismissed: false,
          dismissReason: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  const mysteries = data.nodes.filter((n) => !n.archivedAt && n.type === 'MYSTERY');
  for (const mystery of mysteries) {
    const hasPayoff = data.relationships.some(
      (r) => !r.archivedAt && r.relationshipType === 'RESOLVES' && r.targetNodeId === mystery.id,
    );
    if (!hasPayoff) {
      findings.push({
        id: uuidv4(),
        projectId,
        code: 'UNRESOLVED_MYSTERY',
        message: `Mystery "${mystery.title}" has no resolution link`,
        nodeIds: [mystery.id],
        dismissed: false,
        dismissReason: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return findings;
}
