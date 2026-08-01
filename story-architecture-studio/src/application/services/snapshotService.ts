import type { ProjectExport, Snapshot } from '@/domain/types';
import { getPersistenceAdapter } from '@/infrastructure/persistence/indexedDbAdapter';

export async function listProjectSnapshots(projectId: string): Promise<Snapshot[]> {
  const snapshots = await getPersistenceAdapter().listSnapshots(projectId);
  return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createNamedSnapshot(
  projectId: string,
  name: string,
): Promise<Snapshot> {
  const adapter = getPersistenceAdapter();
  const data = await adapter.loadProjectData(projectId);
  if (!data) throw new Error(`Project not found: ${projectId}`);
  return adapter.createSnapshot(projectId, name, 'manual', data);
}

export async function restoreSnapshot(projectId: string, snapshotId: string): Promise<ProjectExport> {
  const adapter = getPersistenceAdapter();
  const snapshots = await adapter.listSnapshots(projectId);
  const snapshot = snapshots.find((s) => s.id === snapshotId);
  if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);

  const data = JSON.parse(snapshot.dataJson) as ProjectExport;
  const current = await adapter.loadProjectData(projectId);
  if (current) {
    await adapter.createSnapshot(projectId, 'Pre-restore backup', 'restore', current);
  }
  await adapter.saveProject(data.project);
  await adapter.saveProjectData(data);
  return data;
}

export async function checkPendingRecovery(projectId: string): Promise<Snapshot | null> {
  const snapshots = await listProjectSnapshots(projectId);
  const recovery = snapshots.find((s) => s.reason === 'autosave-recovery');
  return recovery ?? null;
}
