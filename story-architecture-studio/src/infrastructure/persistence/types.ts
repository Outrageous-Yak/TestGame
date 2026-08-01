import type {
  Arc,
  Issue,
  Node,
  Page,
  PanelBeat,
  Project,
  ProjectExport,
  ReaderState,
  Relationship,
  Snapshot,
  SourceReference,
  ValidationFinding,
} from '@/domain/types';

export interface ProjectRepository {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
}

export interface ProjectDataRepository {
  loadProjectData(projectId: string): Promise<ProjectExport | null>;
  saveProjectData(data: ProjectExport): Promise<void>;
  createSnapshot(projectId: string, name: string, reason: string, data: ProjectExport): Promise<Snapshot>;
  listSnapshots(projectId: string): Promise<Snapshot[]>;
}

export interface PersistenceAdapter extends ProjectRepository, ProjectDataRepository {
  initialize(): Promise<void>;
  getMigrationVersion(): Promise<number>;
  runMigrations(): Promise<void>;
}

export interface ProjectData {
  project: Project;
  nodes: Node[];
  relationships: Relationship[];
  sourceReferences: SourceReference[];
  arcs: Arc[];
  issues: Issue[];
  pages: Page[];
  panelBeats: PanelBeat[];
  readerStates: ReaderState[];
  validationFindings: ValidationFinding[];
}
