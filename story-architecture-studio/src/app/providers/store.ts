import { create } from 'zustand';
import type { Issue, Node, NodeType, Page, Project, ProjectExport, Relationship } from '@/domain/types';
import { projectService } from '@/application/services/projectService';
import {
  addPanelBeat,
  assignNodeToPage,
  ensureIssueSeries,
  reorderIssues as reorderIssuesSvc,
  unassignNodeFromPage,
  updateIssue as updateIssueSvc,
  updatePage as updatePageSvc,
  updatePanelBeat,
} from '@/application/services/planningService';
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
  initialize: () => Promise<void>;
  loadProjects: () => Promise<void>;
  openProject: (projectId: string) => Promise<void>;
  createProject: (name: string) => Promise<void>;
  createWalkProject: () => Promise<void>;
  createNode: (type: NodeType, title: string) => Promise<void>;
  updateNode: (nodeId: string, updates: Partial<Node>) => Promise<void>;
  createRelationship: (sourceId: string, targetId: string, type: Relationship['relationshipType']) => Promise<void>;
  ensureIssues: () => Promise<void>;
  reorderIssues: (orderedIds: string[]) => Promise<void>;
  updateIssue: (issueId: string, updates: Partial<Issue>) => Promise<void>;
  updatePage: (pageId: string, updates: Partial<Page>) => Promise<void>;
  assignToPage: (pageId: string, nodeId: string) => Promise<void>;
  unassignFromPage: (pageId: string, nodeId: string) => Promise<void>;
  addPanelBeat: (pageId: string) => Promise<void>;
  updatePanelBeat: (beatId: string, updates: Parameters<typeof updatePanelBeat>[2]) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: NodeType | 'ALL') => void;
  getFilteredNodes: () => Node[];
  getSelectedNode: () => Node | null;
  exportCurrentProject: () => ProjectExport | null;
  importProjectData: (data: ProjectExport) => Promise<void>;
  refreshProject: () => Promise<void>;
}

async function withProject<T>(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  fn: (projectId: string) => Promise<T>,
): Promise<T | void> {
  const { currentProject } = get();
  if (!currentProject) return;
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
      set({ currentProject: data, selectedNodeId: null, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to open project', loading: false });
    }
  },

  createProject: async (name: string) => {
    set({ loading: true, error: null });
    try {
      const data = await projectService.createProject(name);
      await get().loadProjects();
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

  createRelationship: async (sourceId, targetId, type) => {
    await withProject(get, set, (id) =>
      projectService.createRelationship(id, { sourceNodeId: sourceId, targetNodeId: targetId, relationshipType: type }),
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

  importProjectData: async (data) => {
    set({ loading: true, error: null });
    try {
      const imported = await projectService.importProject(data, 'replace');
      await get().loadProjects();
      set({ currentProject: imported, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Import failed', loading: false });
    }
  },
}));
