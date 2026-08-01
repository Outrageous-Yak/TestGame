import { describe, expect, it, beforeEach } from 'vitest';
import { ProjectService } from '@/application/services/projectService';
import { validateExport } from '@/domain/validation/rules';
import { exportToJson, parseImportJson } from '@/infrastructure/importExport';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(async () => {
    service = new ProjectService();
    await service.initialize();
  });

  it('creates a project with empty graph', async () => {
    const data = await service.createProject('Test Project');
    expect(data.project.name).toBe('Test Project');
    expect(data.nodes).toHaveLength(0);
    expect(data.schemaVersion).toBe(1);
  });

  it('creates nodes and relationships that survive reload', async () => {
    const created = await service.createProject('Persistence Test');
    const withChar = await service.createNode(created.project.id, {
      type: 'CHARACTER',
      title: 'Aerin',
    });
    const withLoc = await service.createNode(withChar.project.id, {
      type: 'LOCATION',
      title: 'Azurefold',
    });

    const char = withLoc.nodes.find((n) => n.title === 'Aerin');
    const loc = withLoc.nodes.find((n) => n.title === 'Azurefold');
    expect(char).toBeDefined();
    expect(loc).toBeDefined();

    const linked = await service.createRelationship(withLoc.project.id, {
      sourceNodeId: char!.id,
      targetNodeId: loc!.id,
      relationshipType: 'APPEARS_IN',
    });

    const reloaded = await service.loadProjectExport(linked.project.id);
    expect(reloaded?.nodes).toHaveLength(2);
    expect(reloaded?.relationships.filter((r) => !r.archivedAt)).toHaveLength(1);
  });

  it('round-trips JSON export/import preserving IDs', async () => {
    const data = await service.createProject('Round Trip');
    const withNode = await service.createNode(data.project.id, {
      type: 'THEME',
      title: 'Memory',
    });

    const json = exportToJson(withNode);
    const parsed = parseImportJson(json);
    const errors = validateExport(parsed);
    expect(errors).toHaveLength(0);

    const nodeId = withNode.nodes[0]!.id;
    await service.importProject(parsed, 'replace');
    const reloaded = await service.loadProjectExport(withNode.project.id);
    expect(reloaded?.nodes[0]?.id).toBe(nodeId);
  });

  it('archives nodes with soft delete', async () => {
    const data = await service.createProject('Archive Test');
    const withNode = await service.createNode(data.project.id, {
      type: 'CHARACTER',
      title: 'Keth',
    });
    const nodeId = withNode.nodes[0]!.id;
    const archived = await service.archiveNode(withNode.project.id, nodeId);
    const node = archived.nodes.find((n) => n.id === nodeId);
    expect(node?.archivedAt).not.toBeNull();
  });
});
