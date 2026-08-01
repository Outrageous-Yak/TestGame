import { describe, expect, it } from 'vitest';
import { HistoryService, analyzeNodeImpact, applyMerge, previewMerge } from '@/application/services/historyService';
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

describe('HistoryService', () => {
  it('undoes and redoes project state', () => {
    const history = new HistoryService();
    const state1 = project([node('a', 'A')], []);
    const state2 = project([node('a', 'A'), node('b', 'B')], [rel('r1', 'a', 'b')]);

    history.pushBefore(state1);
    const undone = history.undo(state2);
    expect(undone?.nodes).toHaveLength(1);

    const redone = history.redo(state1);
    expect(redone?.nodes).toHaveLength(2);
  });
});

describe('merge import', () => {
  it('previews and applies merge', () => {
    const current = project([node('a', 'Aerin')], []);
    const incoming = project([node('a', 'Aerin'), node('b', 'Keth')], [rel('r1', 'a', 'b')]);

    const preview = previewMerge(current, incoming);
    expect(preview.addedNodes).toHaveLength(1);
    expect(preview.addedRelationships).toBe(1);

    const merged = applyMerge(current, incoming);
    expect(merged.nodes).toHaveLength(2);
    expect(merged.relationships).toHaveLength(1);
  });

  it('blocks merge on type conflicts', () => {
    const current = project([node('a', 'Aerin', 'CHARACTER')], []);
    const incoming = project([node('a', 'Aerin', 'LOCATION')], []);
    const preview = previewMerge(current, incoming);
    expect(preview.conflicts).toHaveLength(1);
    expect(() => applyMerge(current, incoming)).toThrow();
  });
});

describe('impact analysis', () => {
  it('reports relationship dependencies', () => {
    const data = project([node('a', 'Aerin'), node('b', 'Keth')], [rel('r1', 'a', 'b')]);
    const report = analyzeNodeImpact(data, 'a');
    expect(report?.relationshipCount).toBe(1);
    expect(report?.warnings.length).toBeGreaterThan(0);
    expect(report?.dependentNodeTitles).toContain('Keth');
  });
});
