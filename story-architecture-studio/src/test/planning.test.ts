import { describe, expect, it, beforeEach } from 'vitest';
import { ProjectService } from '@/application/services/projectService';
import { ensureIssueSeries, assignNodeToPage } from '@/application/services/planningService';
import { buildTree } from '@/application/viewModels/treeBuilders';
import { runValidation } from '@/application/services/validationService';
import { exportIssueBrief } from '@/infrastructure/importExport/markdownExport';

describe('Planning vertical slice', () => {
  let service: ProjectService;
  let projectId: string;

  beforeEach(async () => {
    service = new ProjectService();
    await service.initialize();
    const data = await service.createProject('Slice Test');
    projectId = data.project.id;
  });

  it('creates 32 issues with 20 pages each', async () => {
    const data = await ensureIssueSeries(projectId, 32);
    expect(data.issues).toHaveLength(32);
    expect(data.pages).toHaveLength(32 * 20);
    const issue1Pages = data.pages.filter((p) => p.issueId === data.issues[0]!.id);
    expect(issue1Pages[0]!.pageRole).toBe('cover');
    expect(issue1Pages[19]!.pageRole).toBe('epilogue');
  });

  it('assigns scenes to pages and reflects in story tree', async () => {
    let data = await ensureIssueSeries(projectId, 1);
    const withScene = await service.createNode(projectId, { type: 'SCENE', title: 'Opening scene' });
    const sceneId = withScene.nodes.find((n) => n.title === 'Opening scene')!.id;
    const page3 = withScene.pages.find((p) => p.pageNumber === 3)!;
    data = await assignNodeToPage(projectId, page3.id, sceneId);

    const tree = buildTree(data, 'story');
    expect(tree[0]?.children.some((c) => c.label === 'Opening scene')).toBe(true);
  });

  it('exports markdown issue brief', async () => {
    const data = await ensureIssueSeries(projectId, 1);
    const brief = exportIssueBrief(data, data.issues[0]!.id);
    expect(brief).toContain('# Issue 1');
    expect(brief).toContain('Page 1');
    expect(brief).toContain('cover');
  });

  it('runs validation on empty issue endings', async () => {
    const data = await ensureIssueSeries(projectId, 1);
    const findings = runValidation(data);
    expect(findings.some((f) => f.code === 'EMPTY_ISSUE_END')).toBe(true);
    expect(findings.some((f) => f.code === 'EMPTY_EPILOGUE')).toBe(true);
  });
});
