import type { ProjectExport, ValidationFinding } from '@/domain/types';
import { detectBrokenLinks } from '@/domain/validation/rules';
import { estimatePageDensity, nowIso } from '@/domain/utils';
import { v4 as uuidv4 } from 'uuid';
import { getPersistenceAdapter } from '@/infrastructure/persistence';
import { persistProjectExport } from '@/infrastructure/persistence/persistHelper';
import { inferNodeIssueNumber, inferRelationshipIssue } from '@/domain/issueInference';

function findingFingerprint(code: string, nodeIds: string[]): string {
  return `${code}:${[...nodeIds].sort().join(',')}`;
}

function computeFreshFindings(data: ProjectExport): ValidationFinding[] {
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

  const linkedIds = new Set<string>();
  for (const rel of data.relationships.filter((r) => !r.archivedAt)) {
    linkedIds.add(rel.sourceNodeId);
    linkedIds.add(rel.targetNodeId);
  }
  for (const page of data.pages) {
    for (const id of page.assignedNodeIds) linkedIds.add(id);
  }
  const orphanedPrimary = data.nodes.filter(
    (n) => !n.archivedAt && n.type === 'CHARACTER' && n.importance === 'PRIMARY' && !linkedIds.has(n.id),
  );
  for (const char of orphanedPrimary) {
    findings.push({
      id: uuidv4(),
      projectId,
      code: 'ORPHANED_PRIMARY',
      message: `Primary character "${char.title}" has no relationships or page assignments`,
      nodeIds: [char.id],
      dismissed: false,
      dismissReason: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const titleGroups = new Map<string, string[]>();
  for (const node of data.nodes.filter((n) => !n.archivedAt)) {
    const key = `${node.type}:${node.title.toLowerCase()}`;
    const ids = titleGroups.get(key) ?? [];
    ids.push(node.id);
    titleGroups.set(key, ids);
  }
  for (const [, ids] of titleGroups) {
    if (ids.length > 1) {
      findings.push({
        id: uuidv4(),
        projectId,
        code: 'DUPLICATE_TITLE',
        message: `Duplicate title across ${ids.length} nodes of the same type`,
        nodeIds: ids,
        dismissed: false,
        dismissReason: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const activeRels = data.relationships.filter((r) => !r.archivedAt);
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));

  for (const rel of activeRels.filter((r) => r.relationshipType === 'PAYS_OFF')) {
    const hasForeshadow = activeRels.some(
      (r) => r.relationshipType === 'FORESHADOWS' && r.targetNodeId === rel.targetNodeId,
    );
    if (!hasForeshadow) {
      findings.push({
        id: uuidv4(),
        projectId,
        code: 'UNSEEDED_PAYOFF',
        message: `PAYS_OFF link to "${nodeById.get(rel.targetNodeId)?.title ?? rel.targetNodeId}" lacks foreshadowing`,
        nodeIds: [rel.sourceNodeId, rel.targetNodeId],
        dismissed: false,
        dismissReason: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const reveal of data.nodes.filter((n) => !n.archivedAt && (n.type === 'REVEAL' || n.type === 'MYSTERY'))) {
    const revealIssue = inferNodeIssueNumber(data, reveal.id);
    if (revealIssue === null) continue;
    for (const rel of activeRels.filter((r) => r.relationshipType === 'FORESHADOWS' && r.targetNodeId === reveal.id)) {
      const foreshadowIssue = inferRelationshipIssue(data, rel);
      if (foreshadowIssue !== null && foreshadowIssue >= revealIssue) {
        findings.push({
          id: uuidv4(),
          projectId,
          code: 'FORESHADOW_AFTER_REVEAL',
          message: `Foreshadowing for "${reveal.title}" occurs in issue ${foreshadowIssue}, not before reveal in issue ${revealIssue}`,
          nodeIds: [rel.sourceNodeId, reveal.id],
          dismissed: false,
          dismissReason: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    for (const rel of activeRels.filter((r) => r.relationshipType === 'PAYS_OFF' && r.targetNodeId === reveal.id)) {
      const payoffIssue = inferRelationshipIssue(data, rel, true);
      if (payoffIssue !== null && payoffIssue <= revealIssue) {
        findings.push({
          id: uuidv4(),
          projectId,
          code: 'PAYOFF_BEFORE_REVEAL',
          message: `Payoff for "${reveal.title}" in issue ${payoffIssue} lands before reveal in issue ${revealIssue}`,
          nodeIds: [rel.sourceNodeId, reveal.id],
          dismissed: false,
          dismissReason: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  for (const state of data.readerStates) {
    if (!state.nodeId) continue;
    const node = nodeById.get(state.nodeId);
    if (!node || node.archivedAt) {
      findings.push({
        id: uuidv4(),
        projectId,
        code: 'ORPHANED_READER_STATE',
        message: `Reader state references missing or archived node`,
        nodeIds: state.nodeId ? [state.nodeId] : [],
        dismissed: false,
        dismissReason: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return findings;
}

export function runValidation(data: ProjectExport): ValidationFinding[] {
  const fresh = computeFreshFindings(data);
  const dismissedMap = new Map(
    (data.validationFindings ?? [])
      .filter((f) => f.dismissed)
      .map((f) => [findingFingerprint(f.code, f.nodeIds), f]),
  );

  return fresh.filter((f) => {
    const key = findingFingerprint(f.code, f.nodeIds);
    return !dismissedMap.has(key);
  });
}

export async function dismissFinding(
  projectId: string,
  finding: Pick<ValidationFinding, 'code' | 'message' | 'nodeIds'>,
  reason: string,
): Promise<ProjectExport> {
  const data = await getPersistenceAdapter().loadProjectData(projectId);
  if (!data) throw new Error(`Project not found: ${projectId}`);

  const now = nowIso();
  const fingerprint = findingFingerprint(finding.code, finding.nodeIds);
  const existing = (data.validationFindings ?? []).filter(
    (f) => findingFingerprint(f.code, f.nodeIds) !== fingerprint,
  );

  existing.push({
    id: uuidv4(),
    projectId,
    code: finding.code,
    message: finding.message,
    nodeIds: finding.nodeIds,
    dismissed: true,
    dismissReason: reason,
    createdAt: now,
    updatedAt: now,
  });

  data.validationFindings = existing;
  data.project.updatedAt = now;
  await persistProjectExport(data);
  return data;
}
