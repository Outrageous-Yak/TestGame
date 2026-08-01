import { create } from 'zustand';
import type { Node, NodeType, Project, ProjectExport, Relationship } from '@/domain/types';
import { projectService } from '@/application/services/projectService';
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
  selectNode: (nodeId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: NodeType | 'ALL') => void;
  getFilteredNodes: () => Node[];
  getSelectedNode: () => Node | null;
  exportCurrentProject: () => ProjectExport | null;
  importProjectData: (data: ProjectExport) => Promise<void>;
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
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loading: true, error: null });
    try {
      const data = await projectService.createNode(currentProject.project.id, { type, title });
      set({ currentProject: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create node', loading: false });
    }
  },

  updateNode: async (nodeId: string, updates: Partial<Node>) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loading: true, error: null });
    try {
      const data = await projectService.updateNode(currentProject.project.id, nodeId, updates);
      set({ currentProject: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update node', loading: false });
    }
  },

  createRelationship: async (sourceId, targetId, type) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ loading: true, error: null });
    try {
      const data = await projectService.createRelationship(currentProject.project.id, {
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        relationshipType: type,
      });
      set({ currentProject: data, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create relationship', loading: false });
    }
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
