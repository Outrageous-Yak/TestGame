import { v4 as uuidv4 } from 'uuid';
import type { ProjectExport, SourceReference } from '@/domain/types';
import { nowIso } from '@/domain/utils';
import { getPersistenceAdapter } from '@/infrastructure/persistence/indexedDbAdapter';

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

export async function addSourceReference(
  projectId: string,
  nodeId: string,
  input: {
    sourceNodeId?: string | null;
    sourceLocator?: string;
    sourceExcerpt?: string;
    interpretationNote?: string;
    adaptationNote?: string;
  },
): Promise<ProjectExport> {
  const data = await load(projectId);
  const now = nowIso();
  const ref: SourceReference = {
    id: uuidv4(),
    projectId,
    nodeId,
    sourceNodeId: input.sourceNodeId ?? null,
    sourceLocator: input.sourceLocator ?? null,
    sourceExcerpt: input.sourceExcerpt ?? null,
    interpretationNote: input.interpretationNote ?? null,
    adaptationNote: input.adaptationNote ?? null,
    createdBy: 'user',
    createdAt: now,
    updatedAt: now,
  };
  data.sourceReferences.push(ref);
  return save(data);
}

export async function updateSourceReference(
  projectId: string,
  refId: string,
  updates: Partial<Pick<SourceReference, 'sourceNodeId' | 'sourceLocator' | 'sourceExcerpt' | 'interpretationNote' | 'adaptationNote'>>,
): Promise<ProjectExport> {
  const data = await load(projectId);
  const idx = data.sourceReferences.findIndex((r) => r.id === refId);
  if (idx === -1) throw new Error(`Source reference not found: ${refId}`);
  data.sourceReferences[idx] = { ...data.sourceReferences[idx]!, ...updates, updatedAt: nowIso() };
  return save(data);
}

export async function deleteSourceReference(projectId: string, refId: string): Promise<ProjectExport> {
  const data = await load(projectId);
  data.sourceReferences = data.sourceReferences.filter((r) => r.id !== refId);
  return save(data);
}

export function getSourceReferencesForNode(data: ProjectExport, nodeId: string): SourceReference[] {
  return data.sourceReferences.filter((r) => r.nodeId === nodeId);
}
