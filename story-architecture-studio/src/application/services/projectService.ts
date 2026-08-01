import { v4 as uuidv4 } from 'uuid';
import type {
  CanonStatus,
  CompletionStatus,
  Importance,
  Node,
  NodeType,
  Project,
  ProjectExport,
  Relationship,
  RelationshipType,
  SourceConfidence,
} from '@/domain/types';
import {
  DEFAULT_PROJECT_SETTINGS,
  SCHEMA_VERSION,
} from '@/domain/types';
import { nowIso, slugify, uniqueSlug } from '@/domain/utils';
import { validateExport } from '@/domain/validation/rules';
import { applyMerge } from '@/application/services/historyService';
import { getPersistenceAdapter, initPersistenceAdapter } from '@/infrastructure/persistence';
import { persistProjectExport } from '@/infrastructure/persistence/persistHelper';

function emptyExport(project: Project): ProjectExport {
  return {
    schemaVersion: SCHEMA_VERSION,
    project,
    nodes: [],
    relationships: [],
    sourceReferences: [],
    arcs: [],
    issues: [],
    pages: [],
    panelBeats: [],
    readerStates: [],
    validationFindings: [],
    savedViews: [],
    settings: project.settings,
  };
}

export class ProjectService {
  private get adapter() {
    return getPersistenceAdapter();
  }

  async initialize(): Promise<void> {
    await initPersistenceAdapter();
    await this.adapter.initialize();
  }

  async listProjects(): Promise<Project[]> {
    return this.adapter.listProjects();
  }

  async getProject(id: string): Promise<Project | null> {
    return this.adapter.getProject(id);
  }

  async loadProjectExport(projectId: string): Promise<ProjectExport | null> {
    return this.adapter.loadProjectData(projectId);
  }

  async createProject(name: string, description = ''): Promise<ProjectExport> {
    const now = nowIso();
    const project: Project = {
      id: uuidv4(),
      name,
      description,
      status: 'ACTIVE',
      schemaVersion: SCHEMA_VERSION,
      settings: { ...DEFAULT_PROJECT_SETTINGS, pageRoles: { ...DEFAULT_PROJECT_SETTINGS.pageRoles } },
      createdAt: now,
      updatedAt: now,
    };
    const data = emptyExport(project);
    await this.adapter.saveProject(project);
    await this.adapter.saveProjectData(data);
    return data;
  }

  async updateProject(projectId: string, updates: Partial<Pick<Project, 'name' | 'description' | 'status' | 'settings'>>): Promise<ProjectExport> {
    const data = await this.requireProjectData(projectId);
    data.project = {
      ...data.project,
      ...updates,
      updatedAt: nowIso(),
    };
    await this.adapter.saveProject(data.project);
    await this.adapter.saveProjectData(data);
    return data;
  }

  async archiveProject(projectId: string): Promise<ProjectExport> {
    return this.updateProject(projectId, { status: 'ARCHIVED' });
  }

  async deleteProject(projectId: string, createSnapshotFirst = true): Promise<void> {
    if (createSnapshotFirst) {
      const data = await this.adapter.loadProjectData(projectId);
      if (data) {
        await this.adapter.createSnapshot(projectId, 'Pre-delete backup', 'delete', data);
      }
    }
    await this.adapter.deleteProject(projectId);
  }

  async duplicateProject(projectId: string, newName: string): Promise<ProjectExport> {
    const source = await this.requireProjectData(projectId);
    const now = nowIso();
    const newProjectId = uuidv4();
    const project: Project = {
      ...source.project,
      id: newProjectId,
      name: newName,
      createdAt: now,
      updatedAt: now,
    };

    const idMap = new Map<string, string>();
    const remap = (id: string) => {
      if (!idMap.has(id)) idMap.set(id, uuidv4());
      return idMap.get(id)!;
    };

    const data: ProjectExport = {
      ...source,
      project,
      nodes: source.nodes.map((n) => ({ ...n, id: remap(n.id), projectId: newProjectId, createdAt: now, updatedAt: now })),
      relationships: source.relationships.map((r) => ({
        ...r,
        id: uuidv4(),
        projectId: newProjectId,
        sourceNodeId: remap(r.sourceNodeId),
        targetNodeId: remap(r.targetNodeId),
        createdAt: now,
        updatedAt: now,
      })),
      sourceReferences: source.sourceReferences.map((s) => ({
        ...s,
        id: uuidv4(),
        projectId: newProjectId,
        nodeId: remap(s.nodeId),
        sourceNodeId: s.sourceNodeId ? remap(s.sourceNodeId) : null,
        createdAt: now,
        updatedAt: now,
      })),
      arcs: source.arcs.map((a) => ({ ...a, id: uuidv4(), projectId: newProjectId, createdAt: now, updatedAt: now })),
      issues: source.issues.map((i) => ({ ...i, id: uuidv4(), projectId: newProjectId, createdAt: now, updatedAt: now })),
      pages: source.pages.map((p) => ({ ...p, id: uuidv4(), projectId: newProjectId, createdAt: now, updatedAt: now })),
      panelBeats: source.panelBeats.map((b) => ({ ...b, id: uuidv4(), projectId: newProjectId, createdAt: now, updatedAt: now })),
      readerStates: source.readerStates.map((r) => ({ ...r, id: uuidv4(), projectId: newProjectId, createdAt: now, updatedAt: now })),
    };

    await this.adapter.saveProject(project);
    await this.adapter.saveProjectData(data);
    return data;
  }

  async createNode(
    projectId: string,
    input: {
      type: NodeType;
      title: string;
      summary?: string;
      description?: string;
      canonStatus?: CanonStatus;
      completionStatus?: CompletionStatus;
      importance?: Importance;
      sourceConfidence?: SourceConfidence;
      propertiesJson?: Record<string, unknown>;
    },
  ): Promise<ProjectExport> {
    const data = await this.requireProjectData(projectId);
    const now = nowIso();
    const existingSlugs = new Set(data.nodes.map((n) => n.slug));
    const baseSlug = slugify(input.title);
    const slug = uniqueSlug(baseSlug, existingSlugs);

    const node: Node = {
      id: uuidv4(),
      projectId,
      type: input.type,
      title: input.title,
      slug,
      summary: input.summary ?? '',
      description: input.description ?? '',
      canonStatus: input.canonStatus ?? 'CANON',
      completionStatus: input.completionStatus ?? 'DRAFT',
      importance: input.importance ?? 'SECONDARY',
      sourceConfidence: input.sourceConfidence ?? 'EXPLICIT',
      colorTag: null,
      createdAt: now,
      updatedAt: now,
      sortOrder: data.nodes.length,
      propertiesJson: input.propertiesJson ?? {},
      archivedAt: null,
    };

    data.nodes.push(node);
    data.project.updatedAt = now;
    await this.persist(data);
    return data;
  }

  async updateNode(
    projectId: string,
    nodeId: string,
    updates: Partial<Pick<Node, 'title' | 'slug' | 'summary' | 'description' | 'canonStatus' | 'completionStatus' | 'importance' | 'sourceConfidence' | 'colorTag' | 'propertiesJson' | 'sortOrder'>>,
  ): Promise<ProjectExport> {
    const data = await this.requireProjectData(projectId);
    const index = data.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) throw new Error(`Node not found: ${nodeId}`);

    const node = data.nodes[index]!;
    const patch = { ...updates };
    if (patch.title && patch.title !== node.title) {
      const existingSlugs = new Set(data.nodes.filter((n) => n.id !== nodeId).map((n) => n.slug));
      const baseSlug = slugify(patch.title);
      patch.slug = uniqueSlug(baseSlug, existingSlugs);
    }

    data.nodes[index] = {
      ...node,
      ...patch,
      updatedAt: nowIso(),
    };
    data.project.updatedAt = nowIso();
    await this.persist(data);
    return data;
  }

  async archiveNode(projectId: string, nodeId: string): Promise<ProjectExport> {
    const data = await this.requireProjectData(projectId);
    const index = data.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) throw new Error(`Node not found: ${nodeId}`);
    data.nodes[index] = { ...data.nodes[index]!, archivedAt: nowIso(), updatedAt: nowIso() };
    data.project.updatedAt = nowIso();
    await this.persist(data);
    return data;
  }

  async createRelationship(
    projectId: string,
    input: {
      sourceNodeId: string;
      targetNodeId: string;
      relationshipType: RelationshipType;
      notes?: string;
      inverseDisplayLabel?: string;
      canonStatus?: CanonStatus;
      confidence?: SourceConfidence;
      issueStart?: number | null;
      issueEnd?: number | null;
    },
  ): Promise<ProjectExport> {
    const data = await this.requireProjectData(projectId);
    const nodeIds = new Set(data.nodes.filter((n) => !n.archivedAt).map((n) => n.id));
    if (!nodeIds.has(input.sourceNodeId) || !nodeIds.has(input.targetNodeId)) {
      throw new Error('Cannot create relationship with missing or archived node');
    }

    const now = nowIso();
    const relationship: Relationship = {
      id: uuidv4(),
      projectId,
      sourceNodeId: input.sourceNodeId,
      targetNodeId: input.targetNodeId,
      relationshipType: input.relationshipType,
      inverseDisplayLabel: input.inverseDisplayLabel ?? null,
      startOrder: null,
      endOrder: null,
      issueStart: input.issueStart ?? null,
      issueEnd: input.issueEnd ?? null,
      confidence: input.confidence ?? 'EXPLICIT',
      canonStatus: input.canonStatus ?? 'CANON',
      sourceReference: null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    data.relationships.push(relationship);
    data.project.updatedAt = now;
    await this.persist(data);
    return data;
  }

  async deleteRelationship(projectId: string, relationshipId: string): Promise<ProjectExport> {
    const data = await this.requireProjectData(projectId);
    const index = data.relationships.findIndex((r) => r.id === relationshipId);
    if (index === -1) throw new Error(`Relationship not found: ${relationshipId}`);
    data.relationships[index] = { ...data.relationships[index]!, archivedAt: nowIso(), updatedAt: nowIso() };
    data.project.updatedAt = nowIso();
    await this.persist(data);
    return data;
  }

  async exportProject(projectId: string): Promise<ProjectExport> {
    return this.requireProjectData(projectId);
  }

  async importProject(
    data: ProjectExport,
    mode: 'replace' | 'merge' = 'replace',
    targetProjectId?: string,
  ): Promise<ProjectExport> {
    const errors = validateExport(data);
    if (errors.length > 0) {
      throw new Error(`Import validation failed:\n${errors.join('\n')}`);
    }

    if (mode === 'replace') {
      const projectId = targetProjectId ?? data.project.id;
      const replaceData = targetProjectId
        ? { ...data, project: { ...data.project, id: projectId } }
        : data;
      await this.adapter.createSnapshot(
        projectId,
        'Pre-import backup',
        'import',
        await this.requireProjectData(projectId).catch(() => replaceData),
      );
      await this.adapter.saveProject(replaceData.project);
      await this.adapter.saveProjectData(replaceData);
      return replaceData;
    }

    if (mode === 'merge') {
      const projectId = targetProjectId ?? data.project.id;
      const current = await this.requireProjectData(projectId);
      await this.adapter.createSnapshot(current.project.id, 'Pre-merge backup', 'import', current);
      const incoming: ProjectExport = {
        ...data,
        project: { ...data.project, id: projectId },
        nodes: data.nodes.map((n) => ({ ...n, projectId })),
        relationships: data.relationships.map((r) => ({ ...r, projectId })),
      };
      const merged = applyMerge(current, incoming);
      await this.persist(merged);
      return merged;
    }

    throw new Error(`Unknown import mode: ${mode}`);
  }

  async saveProjectExport(data: ProjectExport): Promise<ProjectExport> {
    await this.persist(data);
    return data;
  }

  async createManualSnapshot(projectId: string, name: string): Promise<void> {
    const data = await this.requireProjectData(projectId);
    await this.adapter.createSnapshot(projectId, name, 'manual', data);
  }

  private async requireProjectData(projectId: string): Promise<ProjectExport> {
    const data = await this.adapter.loadProjectData(projectId);
    if (!data) throw new Error(`Project data not found: ${projectId}`);
    return data;
  }

  private async persist(data: ProjectExport): Promise<void> {
    await persistProjectExport(data);
  }
}

export const projectService = new ProjectService();
