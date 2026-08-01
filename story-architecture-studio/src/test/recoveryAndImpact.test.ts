import { describe, expect, it, beforeEach } from 'vitest';
import { simulateRevealMove } from '@/application/services/historyService';
import { checkPendingRecovery, clearRecoverySnapshot, writeRecoverySnapshot } from '@/application/services/snapshotService';
import { ProjectService } from '@/application/services/projectService';
import type { Node, ProjectExport, Relationship } from '@/domain/types';
import { DEFAULT_PROJECT_SETTINGS, SCHEMA_VERSION } from '@/domain/types';

function node(id: string, title: string, type: Node['type'] = 'REVEAL'): Node {
  return {
    id, projectId: 'p1', type, title, slug: title.toLowerCase(), summary: '', description: '',
    canonStatus: 'CANON', completionStatus: 'DRAFT', importance: 'SECONDARY', sourceConfidence: 'EXPLICIT',
    colorTag: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    sortOrder: 0, propertiesJson: {}, archivedAt: null,
  };
}

function project(nodes: Node[], relationships: Relationship[] = [], issues = 2, pages = true): ProjectExport {
  const issueList = Array.from({ length: issues }, (_, i) => ({
    id: `issue-${i + 1}`,
    projectId: 'p1',
    nodeId: null,
    number: i + 1,
    title: `Issue ${i + 1}`,
    arcId: null,
    logline: '',
    purpose: '',
    cliffhanger: '',
    status: 'outline' as const,
    pageCount: 20,
    sortOrder: i + 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }));

  const pageList = pages
    ? issueList.flatMap((issue) =>
        Array.from({ length: 20 }, (_, i) => ({
          id: `page-${issue.number}-${i + 1}`,
          projectId: 'p1',
          issueId: issue.id,
          nodeId: null,
          pageNumber: i + 1,
          pageRole: 'story',
          storyPurpose: '',
          layoutNotes: '',
          panelCount: null,
          density: null,
          assignedNodeIds: issue.number === 1 && i + 1 === 5 ? [nodes[0]!.id] : [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        })),
      )
    : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    project: {
      id: 'p1', name: 'Test', description: '', status: 'ACTIVE', schemaVersion: SCHEMA_VERSION,
      settings: DEFAULT_PROJECT_SETTINGS, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    },
    nodes, relationships, sourceReferences: [], arcs: [], issues: issueList, pages: pageList, panelBeats: [],
    readerStates: [], validationFindings: [], savedViews: [], settings: DEFAULT_PROJECT_SETTINGS,
  };
}

describe('reveal move simulation', () => {
  it('simulates moving a reveal from issue 1 to issue 2', () => {
    const reveal = node('r1', 'The truth');
    const data = project([reveal]);
    const sim = simulateRevealMove(data, 'r1', 2);
    expect(sim?.fromIssue).toBe(1);
    expect(sim?.targetIssue).toBe(2);
    expect(sim?.pageChanges.some((c) => c.action === 'add' && c.issueNumber === 2)).toBe(true);
  });

  it('warns when foreshadowing occurs after reveal', () => {
    const reveal = node('r1', 'The truth');
    const rel: Relationship = {
      id: 'rel1', projectId: 'p1', sourceNodeId: 'x', targetNodeId: 'r1',
      relationshipType: 'FORESHADOWS', inverseDisplayLabel: null, startOrder: null, endOrder: null,
      issueStart: 3, issueEnd: null, confidence: 'EXPLICIT', canonStatus: 'CANON',
      sourceReference: null, notes: null, createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z', archivedAt: null,
    };
    const data = project([reveal, node('x', 'Hint', 'SCENE')], [rel]);
    const sim = simulateRevealMove(data, 'r1', 2);
    expect(sim?.warnings.some((w) => w.includes('Foreshadowing'))).toBe(true);
  });
});

describe('crash recovery', () => {
  let service: ProjectService;

  beforeEach(async () => {
    service = new ProjectService();
    await service.initialize();
  });

  it('detects and clears recovery snapshots', async () => {
    const created = await service.createProject('Recovery Test');
    const modified = { ...created, project: { ...created.project, description: 'recovered' } };
    await writeRecoverySnapshot(created.project.id, modified);
    const pending = await checkPendingRecovery(created.project.id);
    expect(pending).not.toBeNull();
    await clearRecoverySnapshot(created.project.id);
    expect(await checkPendingRecovery(created.project.id)).toBeNull();
  });
});
