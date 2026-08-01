import { describe, expect, it } from 'vitest';
import { detectBrokenLinks, validateExport } from '@/domain/validation/rules';
import type { Node, ProjectExport, Relationship } from '@/domain/types';
import { DEFAULT_PROJECT_SETTINGS, SCHEMA_VERSION } from '@/domain/types';

function makeNode(id: string, title: string): Node {
  return {
    id,
    projectId: 'p1',
    type: 'CHARACTER',
    title,
    slug: title.toLowerCase(),
    summary: '',
    description: '',
    canonStatus: 'CANON',
    completionStatus: 'DRAFT',
    importance: 'PRIMARY',
    sourceConfidence: 'EXPLICIT',
    colorTag: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sortOrder: 0,
    propertiesJson: {},
    archivedAt: null,
  };
}

function makeRel(id: string, source: string, target: string): Relationship {
  return {
    id,
    projectId: 'p1',
    sourceNodeId: source,
    targetNodeId: target,
    relationshipType: 'RELATED_TO',
    inverseDisplayLabel: null,
    startOrder: null,
    endOrder: null,
    issueStart: null,
    issueEnd: null,
    confidence: 'EXPLICIT',
    canonStatus: 'CANON',
    sourceReference: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
  };
}

describe('validation rules', () => {
  it('detects broken links', () => {
    const nodes = [makeNode('a', 'Aerin')];
    const rels = [makeRel('r1', 'a', 'missing')];
    const findings = detectBrokenLinks(nodes, rels);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('missing target');
  });

  it('validates export integrity', () => {
    const data: ProjectExport = {
      schemaVersion: SCHEMA_VERSION,
      project: {
        id: 'p1',
        name: 'Test',
        description: '',
        status: 'ACTIVE',
        schemaVersion: SCHEMA_VERSION,
        settings: DEFAULT_PROJECT_SETTINGS,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      nodes: [makeNode('a', 'Aerin')],
      relationships: [makeRel('r1', 'a', 'b')],
      sourceReferences: [],
      arcs: [],
      issues: [],
      pages: [],
      panelBeats: [],
      readerStates: [],
      savedViews: [],
      settings: DEFAULT_PROJECT_SETTINGS,
    };
    const errors = validateExport(data);
    expect(errors.some((e) => e.includes('missing target'))).toBe(true);
  });
});
