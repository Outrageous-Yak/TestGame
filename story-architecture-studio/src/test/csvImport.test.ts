import { describe, expect, it, beforeEach } from 'vitest';
import { csvToRecords } from '@/infrastructure/importExport/csvParser';
import { importNodesFromCsv, importRelationshipsFromCsv } from '@/application/services/csvImportService';
import { ProjectService } from '@/application/services/projectService';

describe('csv parser', () => {
  it('parses quoted fields with commas', () => {
    const rows = csvToRecords('id,title,summary\n"a1","Hello, world","A ""quote"""');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe('Hello, world');
    expect(rows[0]!.summary).toBe('A "quote"');
  });
});

describe('csv import service', () => {
  let service: ProjectService;

  beforeEach(async () => {
    service = new ProjectService();
    await service.initialize();
  });

  it('imports and updates nodes from csv', async () => {
    const project = await service.createProject('CSV Test');
    const node = await service.createNode(project.project.id, { type: 'CHARACTER', title: 'Alice' });
    const alice = node.nodes.find((n) => n.title === 'Alice')!;

    const csv = `id,type,title,slug,canonStatus,summary\n${alice.id},CHARACTER,Alice Updated,alice-updated,CANON,New summary\n,CHARACTER,Bob,bob,CANON,A new character`;
    const result = await importNodesFromCsv(project.project.id, csv);
    expect(result.added).toBe(1);
    expect(result.updated).toBe(1);

    const data = await service.loadProjectExport(project.project.id);
    expect(data?.nodes.find((n) => n.title === 'Bob')).toBeTruthy();
    expect(data?.nodes.find((n) => n.id === alice.id)?.summary).toBe('New summary');
  });

  it('imports relationships when nodes exist', async () => {
    const project = await service.createProject('Rel CSV');
    const a = await service.createNode(project.project.id, { type: 'CHARACTER', title: 'A' });
    const b = await service.createNode(a.project.id, { type: 'CHARACTER', title: 'B' });
    const charA = a.nodes.find((n) => n.title === 'A')!;
    const charB = b.nodes.find((n) => n.title === 'B')!;

    const csv = `id,sourceNodeId,targetNodeId,relationshipType,notes\n,${charA.id},${charB.id},RELATED_TO,test link`;
    const result = await importRelationshipsFromCsv(b.project.id, csv);
    expect(result.added).toBe(1);

    const data = await service.loadProjectExport(b.project.id);
    expect(data?.relationships.some((r) => r.sourceNodeId === charA.id && r.targetNodeId === charB.id)).toBe(true);
  });
});
