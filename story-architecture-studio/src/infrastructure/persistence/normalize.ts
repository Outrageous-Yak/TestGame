import type { ProjectExport } from '@/domain/types';

export function normalizeProjectExport(data: ProjectExport): ProjectExport {
  return {
    ...data,
    pages: data.pages.map((p) => ({
      ...p,
      assignedNodeIds: p.assignedNodeIds ?? [],
    })),
    validationFindings: data.validationFindings ?? [],
  };
}
