import type { ProjectExport } from '@/domain/types';
import { getPersistenceAdapter } from '@/infrastructure/persistence';
import { clearRecoverySnapshot, writeRecoverySnapshot } from '@/application/services/snapshotService';

export async function persistProjectExport(data: ProjectExport): Promise<void> {
  await writeRecoverySnapshot(data.project.id, data);
  const adapter = getPersistenceAdapter();
  await adapter.saveProject(data.project);
  await adapter.saveProjectData(data);
  await clearRecoverySnapshot(data.project.id);
}
