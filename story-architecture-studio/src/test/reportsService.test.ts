import { describe, expect, it } from 'vitest';
import { generateEditorialReports } from '@/application/services/reportsService';
import type { Node, ProjectExport, Relationship } from '@/domain/types';
import { DEFAULT_PROJECT_SETTINGS, SCHEMA_VERSION } from '@/domain/types';

function node(id: string, title: string, type: Node['type'] = 'CHARACTER', importance: Node['importance'] = 'SECONDARY'): Node {
  return {
    id, projectId: 'p1', type, title, slug: title.toLowerCase(), summary: '', description: '',
    canonStatus: 'CANON', completionStatus: 'DRAFT', importance, sourceConfidence: 'EXPLICIT',
    colorTag: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    sortOrder: 0, propertiesJson: {}, archivedAt: null,
  };
}

function project(nodes: Node[], relationships: Relationship[] = []): ProjectExport {
  return {
    schemaVersion: SCHEMA_VERSION,
    project: {
      id: 'p1', name: 'Test', description: '', status: 'ACTIVE', schemaVersion: SCHEMA_VERSION,
      settings: DEFAULT_PROJECT_SETTINGS, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    },
    nodes, relationships, sourceReferences: [], arcs: [], issues: [], pages: [], panelBeats: [],
    readerStates: [], validationFindings: [], savedViews: [], settings: DEFAULT_PROJECT_SETTINGS,
  };
}

describe('editorial reports', () => {
  it('detects unused nodes', () => {
    const data = project([node('a', 'Orphan'), node('b', 'Linked')], []);
    const reports = generateEditorialReports(data);
    expect(reports.some((r) => r.id === 'unused-nodes')).toBe(true);
  });

  it('detects unresolved mysteries', () => {
    const data = project([node('m', 'Who?', 'MYSTERY')]);
    const reports = generateEditorialReports(data);
    expect(reports.some((r) => r.id === 'unresolved-mysteries')).toBe(true);
  });
});
