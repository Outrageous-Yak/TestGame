import { create } from 'zustand';
import type { Issue, Node, NodeType, Page, Project, ProjectExport, ReaderState, Relationship, ValidationFinding } from '@/domain/types';
import { projectService } from '@/application/services/projectService';
import {
  addPanelBeat,
  addReaderState,
  assignNodeToPage,
  deleteReaderState,
  ensureIssueSeries,
  reorderIssues as reorderIssuesSvc,
  unassignNodeFromPage,
  updateIssue as updateIssueSvc,
  updatePage as updatePageSvc,
  updatePanelBeat,
  updateReaderState,
} from '@/application/services/planningService';
import { historyService } from '@/application/services/historyService';
import { dismissFinding as dismissFindingSvc } from '@/application/services/validationService';
import {
  addSourceReference,
  deleteSourceReference,
  updateSourceReference,
} from '@/application/services/sourceReferenceService';
import {
  checkPendingRecovery,
  createNamedSnapshot,
  discardRecovery as discardRecoverySvc,
  listProjectSnapshots,
  restoreFromRecovery,
  restoreSnapshot as restoreSnapshotSvc,
} from '@/application/services/snapshotService';
import { applyRevealMove as applyRevealMoveSvc } from '@/application/services/planningService';
import { importNodesFromCsv, importRelationshipsFromCsv } from '@/application/services/csvImportService';
import type { CsvImportResult } from '@/application/services/csvImportService';
import { createWalkSeedProject } from '@/application/services/walkSeed';
import { searchNodes } from '@/domain/validation/rules';

interface AppState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  projects: Project[];
  currentProject: ProjectExport | null;
  selectedNodeId: string | null;
  searchQuery: string;
  typeFilter: NodeType | 'ALL';
  pendingRecovery: import('@/domain/types').Snapshot | null;
  initialize: () => Promise<void>;
  loadProjects: () => Promise<void>;
  openProject: (projectId: string) => Promise<void>;
  createProject: (name: string) => Promise<void>;
  createWalkProject: () => Promise<void>;
  createNode: (type: NodeType, title: string) => Promise<void>;
  updateNode: (nodeId: string, updates: Partial<Node>) => Promise<void>;
  createRelationship: (
    sourceId: string,
    targetId: string,
    type: Relationship['relationshipType'],
    options?: { issueStart?: number | null; issueEnd?: number | null },
  ) => Promise<void>;
  ensureIssues: () => Promise<void>;
  reorderIssues: (orderedIds: string[]) => Promise<void>;
  updateIssue: (issueId: string, updates: Partial<Issue>) => Promise<void>;
  updatePage: (pageId: string, updates: Partial<Page>) => Promise<void>;
  assignToPage: (pageId: string, nodeId: string) => Promise<void>;
  unassignFromPage: (pageId: string, nodeId: string) => Promise<void>;
  addPanelBeat: (pageId: string) => Promise<void>;
  updatePanelBeat: (beatId: string, updates: Parameters<typeof updatePanelBeat>[2]) => Promise<void>;
  addReaderState: (input: Pick<ReaderState, 'issueId' | 'recordType' | 'content' | 'nodeId' | 'sortOrder'>) => Promise<void>;
  updateReaderState: (stateId: string, updates: Partial<Pick<ReaderState, 'recordType' | 'content' | 'nodeId' | 'issueId' | 'sortOrder'>>) => Promise<void>;
  deleteReaderState: (stateId: string) => Promise<void>;
  dismissFinding: (finding: Pick<ValidationFinding, 'code' | 'message' | 'nodeIds'>, reason: string) => Promise<void>;
  addSourceReference: (nodeId: string, input: Parameters<typeof addSourceReference>[2]) => Promise<void>;
  updateSourceReference: (refId: string, updates: Parameters<typeof updateSourceReference>[2]) => Promise<void>;
  deleteSourceReference: (refId: string) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: NodeType | 'ALL') => void;
  getFilteredNodes: () => Node[];
  getSelectedNode: () => Node | null;
  exportCurrentProject: () => ProjectExport | null;
  importProjectData: (data: ProjectExport, mode?: 'replace' | 'merge') => Promise<void>;
  refreshProject: () => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  listSnapshots: () => Promise<import('@/domain/types').Snapshot[]>;
  createSnapshot: (name: string) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  importNodesCsv: (csv: string) => Promise<CsvImportResult | void>;
  importRelationshipsCsv: (csv: string) => Promise<CsvImportResult | void>;
  applyRevealMove: (nodeId: string, targetIssueNumber: number) => Promise<void>;
  acceptRecovery: () => Promise<void>;
  discardRecovery: () => Promise<void>;
}

async function withProject<T>(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  fn: (projectId: string) => Promise<T>,
): Promise<T | void> {
  const { currentProject } = get();
  if (!currentProject) return;
  historyService.pushBefore(currentProject);
  set({ loading: true, error: null });
  try {
    const result = await fn(currentProject.project.id);
    const data = await projectService.loadProjectExport(currentProject.project.id);
    set({ currentProject: data, loading: false });
    return result;
  } catch (err) {
    set({ error: err instanceof Error ? err.message : 'Operation failed', loading: false });
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  loading: false,
  error: null,
  projects: [],
  currentProject: null,
  selectedNodeId: null,
  searchQuery: '',
  typeFilter: 'ALL',
  pendingRecovery: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      await projectService.initialize();
      const projects = await projectService.listProjects();
      set({ initialized: true, projects, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Initialization failed', loading: false });
    }
  },

  loadProjects: async () => {
    const projects = await projectService.listProjects();
    set({ projects });
  },

  refreshProject: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const data = await projectService.loadProjectExport(currentProject.project.id);
    set({ currentProject: data });
  },

  openProject: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const data = await projectService.loadProjectExport(projectId);
      historyService.clear();
      const recovery = await checkPendingRecovery(projectId);
      set({
        currentProject: data,
        selectedNodeId: null,
        loading: false,
        pendingRecovery: recovery,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to open project', loading: false });
    }
  },

  createProject: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const data = await projectService.createProject(name);
      await get().loadProjects();
      historyService.clear();
      set({ currentProject: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create project', loading: false });
    }
  },

  createWalkProject: async () => {
    set({ loading: true, error: null });
    try {
      const data = await createWalkSeedProject();
      await get().loadProjects();
      historyService.clear();
      set({ currentProject: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create Walk project', loading: false });
    }
  },

  createNode: async (type: NodeType, title: string) => {
    await withProject(get, set, (id) => projectService.createNode(id, { type, title }));
  },

  updateNode: async (nodeId: string, updates: Partial<Node>) => {
    await withProject(get, set, (id) => projectService.updateNode(id, nodeId, updates));
  },

  createRelationship: async (sourceId, targetId, type, options) => {
    await withProject(get, set, (id) =>
      projectService.createRelationship(id, {
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        relationshipType: type,
        issueStart: options?.issueStart,
        issueEnd: options?.issueEnd,
      }),
    );
  },

  ensureIssues: async () => {
    await withProject(get, set, (id) => ensureIssueSeries(id));
  },

  reorderIssues: async (orderedIds) => {
    await withProject(get, set, (id) => reorderIssuesSvc(id, orderedIds));
  },

  updateIssue: async (issueId, updates) => {
    await withProject(get, set, (id) =>
      updateIssueSvc(id, issueId, {
        title: updates.title,
        logline: updates.logline,
        purpose: updates.purpose,
        cliffhanger: updates.cliffhanger,
        status: updates.status,
        arcId: updates.arcId,
      }),
    );
  },

  updatePage: async (pageId, updates) => {
    await withProject(get, set, (id) => updatePageSvc(id, pageId, updates));
  },

  assignToPage: async (pageId, nodeId) => {
    await withProject(get, set, (id) => assignNodeToPage(id, pageId, nodeId));
  },

  unassignFromPage: async (pageId, nodeId) => {
    await withProject(get, set, (id) => unassignNodeFromPage(id, pageId, nodeId));
  },

  addPanelBeat: async (pageId) => {
    await withProject(get, set, (id) => addPanelBeat(id, pageId, {}));
  },

  updatePanelBeat: async (beatId, updates) => {
    await withProject(get, set, (id) => updatePanelBeat(id, beatId, updates));
  },

  addReaderState: async (input) => {
    await withProject(get, set, (id) => addReaderState(id, input));
  },

  updateReaderState: async (stateId, updates) => {
    await withProject(get, set, (id) => updateReaderState(id, stateId, updates));
  },

  deleteReaderState: async (stateId) => {
    await withProject(get, set, (id) => deleteReaderState(id, stateId));
  },

  dismissFinding: async (finding, reason) => {
    await withProject(get, set, (id) => dismissFindingSvc(id, finding, reason));
  },

  addSourceReference: async (nodeId, input) => {
    await withProject(get, set, (id) => addSourceReference(id, nodeId, input));
  },

  updateSourceReference: async (refId, updates) => {
    await withProject(get, set, (id) => updateSourceReference(id, refId, updates));
  },

  deleteSourceReference: async (refId) => {
    await withProject(get, set, (id) => deleteSourceReference(id, refId));
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTypeFilter: (type) => set({ typeFilter: type }),

  getFilteredNodes: () => {
    const { currentProject, searchQuery, typeFilter } = get();
    if (!currentProject) return [];
    let nodes = searchNodes(currentProject.nodes, searchQuery);
    if (typeFilter !== 'ALL') {
      nodes = nodes.filter((n) => n.type === typeFilter);
    }
    return nodes.sort((a, b) => a.title.localeCompare(b.title));
  },

  getSelectedNode: () => {
    const { currentProject, selectedNodeId } = get();
    if (!currentProject || !selectedNodeId) return null;
    return currentProject.nodes.find((n) => n.id === selectedNodeId) ?? null;
  },

  exportCurrentProject: () => get().currentProject,

  importProjectData: async (data, mode = 'replace') => {
    const { currentProject } = get();
    if (currentProject) historyService.pushBefore(currentProject);
    set({ loading: true, error: null });
    try {
      const projectId = currentProject?.project.id;
      const imported = await projectService.importProject(data, mode, projectId);
      await get().loadProjects();
      set({ currentProject: imported, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Import failed', loading: false });
    }
  },

  undo: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const prev = historyService.undo(currentProject);
    if (!prev) return;
    set({ loading: true });
    try {
      const data = await projectService.saveProjectExport(prev);
      set({ currentProject: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Undo failed', loading: false });
    }
  },

  redo: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const next = historyService.redo(currentProject);
    if (!next) return;
    set({ loading: true });
    try {
      const data = await projectService.saveProjectExport(next);
      set({ currentProject: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Redo failed', loading: false });
    }
  },

  canUndo: () => historyService.canUndo(),
  canRedo: () => historyService.canRedo(),

  listSnapshots: async () => {
    const { currentProject } = get();
    if (!currentProject) return [];
    return listProjectSnapshots(currentProject.project.id);
  },

  createSnapshot: async (name) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await createNamedSnapshot(currentProject.project.id, name);
  },

  restoreSnapshot: async (snapshotId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    if (currentProject) historyService.pushBefore(currentProject);
    set({ loading: true, error: null });
    try {
      const data = await restoreSnapshotSvc(currentProject.project.id, snapshotId);
      set({ currentProject: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Restore failed', loading: false });
    }
  },

  importNodesCsv: async (csv) => {
    const { currentProject } = get();
    if (!currentProject) return;
    return withProject(get, set, (id) => importNodesFromCsv(id, csv));
  },

  importRelationshipsCsv: async (csv) => {
    const { currentProject } = get();
    if (!currentProject) return;
    return withProject(get, set, (id) => importRelationshipsFromCsv(id, csv));
  },

  applyRevealMove: async (nodeId, targetIssueNumber) => {
    await withProject(get, set, (id) => applyRevealMoveSvc(id, nodeId, targetIssueNumber));
  },

  acceptRecovery: async () => {
    const { currentProject, pendingRecovery } = get();
    if (!currentProject || !pendingRecovery) return;
    set({ loading: true, error: null });
    try {
      const data = await restoreFromRecovery(currentProject.project.id);
      set({ currentProject: data, pendingRecovery: null, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Recovery failed', loading: false });
    }
  },

  discardRecovery: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    await discardRecoverySvc(currentProject.project.id);
    set({ pendingRecovery: null });
  },
}));
