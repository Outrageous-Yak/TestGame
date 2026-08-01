import { v4 as uuidv4 } from 'uuid';
import type { Node, NodeType, ProjectExport, Relationship, RelationshipType } from '@/domain/types';
import { nowIso, slugify, uniqueSlug } from '@/domain/utils';
import { csvToRecords } from '@/infrastructure/importExport/csvParser';
import { getPersistenceAdapter } from '@/infrastructure/persistence/indexedDbAdapter';

const NODE_TYPES = new Set<NodeType>([
  'BOOK', 'CHAPTER', 'CHARACTER', 'GROUP', 'EVENT', 'SCENE', 'LOCATION', 'CREATURE',
  'THEME', 'SYMBOL', 'MYTH', 'MYSTERY', 'REVEAL', 'ARC', 'ISSUE', 'PAGE', 'PANEL_BEAT',
  'SOURCE_EXCERPT', 'RULE', 'QUESTION',
]);

const REL_TYPES = new Set<RelationshipType>([
  'APPEARS_IN', 'PARTICIPATES_IN', 'OCCURS_AT', 'CAUSES', 'LEADS_TO', 'PRECEDES', 'KNOWS',
  'RELATED_TO', 'MEMBER_OF', 'BELIEVES', 'CONTRADICTS', 'FORESHADOWS', 'PAYS_OFF',
  'SUPPORTS_THEME', 'USES_SYMBOL', 'SOURCE_FOR', 'ADAPTED_AS', 'READER_LEARNS_IN',
  'READER_BELIEVES_UNTIL', 'LOCATED_WITHIN', 'VARIANT_OF', 'RESOLVES',
]);

export interface CsvImportResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

async function load(projectId: string): Promise<ProjectExport> {
  const data = await getPersistenceAdapter().loadProjectData(projectId);
  if (!data) throw new Error(`Project not found: ${projectId}`);
  return data;
}

async function save(data: ProjectExport): Promise<ProjectExport> {
  data.project.updatedAt = nowIso();
  await getPersistenceAdapter().saveProject(data.project);
  await getPersistenceAdapter().saveProjectData(data);
  return data;
}

export async function importNodesFromCsv(projectId: string, csv: string): Promise<CsvImportResult> {
  const data = await load(projectId);
  const records = csvToRecords(csv);
  const result: CsvImportResult = { added: 0, updated: 0, skipped: 0, errors: [] };
  const now = nowIso();
  const byId = new Map(data.nodes.map((n) => [n.id, n]));

  for (const [index, row] of records.entries()) {
    const title = row.title?.trim();
    if (!title) {
      result.errors.push(`Row ${index + 2}: missing title`);
      result.skipped++;
      continue;
    }

    const type = (row.type?.trim().toUpperCase() ?? 'CHARACTER') as NodeType;
    if (!NODE_TYPES.has(type)) {
      result.errors.push(`Row ${index + 2}: invalid type "${row.type}"`);
      result.skipped++;
      continue;
    }

    const existingId = row.id?.trim();
    const existing = existingId ? byId.get(existingId) : undefined;

    if (existing) {
      existing.title = title;
      if (row.slug?.trim()) existing.slug = row.slug.trim();
      if (row.summary !== undefined) existing.summary = row.summary;
      if (row.canonStatus?.trim()) existing.canonStatus = row.canonStatus.trim() as Node['canonStatus'];
      existing.updatedAt = now;
      result.updated++;
      continue;
    }

    const existingSlugs = new Set(data.nodes.map((n) => n.slug));
    const slug = row.slug?.trim() || uniqueSlug(slugify(title), existingSlugs);
    const node: Node = {
      id: existingId || uuidv4(),
      projectId,
      type,
      title,
      slug,
      summary: row.summary ?? '',
      description: '',
      canonStatus: (row.canonStatus?.trim() as Node['canonStatus']) || 'CANON',
      completionStatus: 'DRAFT',
      importance: 'SECONDARY',
      sourceConfidence: 'EXPLICIT',
      colorTag: null,
      createdAt: now,
      updatedAt: now,
      sortOrder: data.nodes.length,
      propertiesJson: {},
      archivedAt: null,
    };
    data.nodes.push(node);
    byId.set(node.id, node);
    result.added++;
  }

  await save(data);
  return result;
}

export async function importRelationshipsFromCsv(projectId: string, csv: string): Promise<CsvImportResult> {
  const data = await load(projectId);
  const records = csvToRecords(csv);
  const result: CsvImportResult = { added: 0, updated: 0, skipped: 0, errors: [] };
  const now = nowIso();
  const nodeIds = new Set(data.nodes.filter((n) => !n.archivedAt).map((n) => n.id));
  const byId = new Map(data.relationships.map((r) => [r.id, r]));

  for (const [index, row] of records.entries()) {
    const sourceNodeId = row.sourceNodeId?.trim();
    const targetNodeId = row.targetNodeId?.trim();
    const relationshipType = row.relationshipType?.trim().toUpperCase() as RelationshipType;

    if (!sourceNodeId || !targetNodeId) {
      result.errors.push(`Row ${index + 2}: missing source or target node id`);
      result.skipped++;
      continue;
    }
    if (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) {
      result.errors.push(`Row ${index + 2}: unknown node id in relationship`);
      result.skipped++;
      continue;
    }
    if (!REL_TYPES.has(relationshipType)) {
      result.errors.push(`Row ${index + 2}: invalid relationship type "${row.relationshipType}"`);
      result.skipped++;
      continue;
    }

    const existingId = row.id?.trim();
    const existing = existingId ? byId.get(existingId) : undefined;

    if (existing) {
      existing.sourceNodeId = sourceNodeId;
      existing.targetNodeId = targetNodeId;
      existing.relationshipType = relationshipType;
      if (row.notes !== undefined) existing.notes = row.notes;
      existing.updatedAt = now;
      result.updated++;
      continue;
    }

    const rel: Relationship = {
      id: existingId || uuidv4(),
      projectId,
      sourceNodeId,
      targetNodeId,
      relationshipType,
      inverseDisplayLabel: null,
      startOrder: null,
      endOrder: null,
      issueStart: null,
      issueEnd: null,
      confidence: 'EXPLICIT',
      canonStatus: 'CANON',
      sourceReference: null,
      notes: row.notes ?? null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    data.relationships.push(rel);
    byId.set(rel.id, rel);
    result.added++;
  }

  await save(data);
  return result;
}
