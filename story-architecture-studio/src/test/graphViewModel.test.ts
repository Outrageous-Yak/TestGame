import { describe, expect, it } from 'vitest';
import { buildGraphViewModel, findPath } from '@/application/viewModels/graphViewModel';
import type { Node, ProjectExport, Relationship } from '@/domain/types';
import { DEFAULT_PROJECT_SETTINGS, SCHEMA_VERSION } from '@/domain/types';

function node(id: string, title: string, type: Node['type'] = 'CHARACTER'): Node {
  return {
    id, projectId: 'p1', type, title, slug: title.toLowerCase(), summary: '', description: '',
    canonStatus: 'CANON', completionStatus: 'DRAFT', importance: 'PRIMARY', sourceConfidence: 'EXPLICIT',
    colorTag: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    sortOrder: 0, propertiesJson: {}, archivedAt: null,
  };
}

function rel(id: string, source: string, target: string): Relationship {
  return {
    id, projectId: 'p1', sourceNodeId: source, targetNodeId: target, relationshipType: 'RELATED_TO',
    inverseDisplayLabel: null, startOrder: null, endOrder: null, issueStart: null, issueEnd: null,
    confidence: 'EXPLICIT', canonStatus: 'CANON', sourceReference: null, notes: null,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', archivedAt: null,
  };
}

function project(nodes: Node[], relationships: Relationship[]): ProjectExport {
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

describe('graphViewModel', () => {
  it('builds neighborhood graph from focus node', () => {
    const data = project(
      [node('a', 'Aerin'), node('b', 'Keth'), node('c', 'Azurefold', 'LOCATION')],
      [rel('r1', 'a', 'b'), rel('r2', 'a', 'c')],
    );
    const graph = buildGraphViewModel(data, { focusNodeId: 'a', depth: 1 });
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c']);
    expect(graph.edges).toHaveLength(2);
  });

  it('finds path between nodes', () => {
    const data = project(
      [node('a', 'A'), node('b', 'B'), node('c', 'C')],
      [rel('r1', 'a', 'b'), rel('r2', 'b', 'c')],
    );
    expect(findPath(data, 'a', 'c')).toEqual(['a', 'b', 'c']);
    expect(findPath(data, 'a', 'missing')).toBeNull();
  });
});
