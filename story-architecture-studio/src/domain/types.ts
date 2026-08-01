export const SCHEMA_VERSION = 1;

export type CanonStatus = 'CANON' | 'ADAPTATION' | 'PROPOSED' | 'CONFLICTED' | 'RETIRED';
export type CompletionStatus = 'DRAFT' | 'REVIEW' | 'LOCKED';
export type Importance = 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | 'REFERENCE';
export type SourceConfidence = 'EXPLICIT' | 'INFERRED' | 'PROPOSED';

export type NodeType =
  | 'BOOK'
  | 'CHAPTER'
  | 'CHARACTER'
  | 'GROUP'
  | 'EVENT'
  | 'SCENE'
  | 'LOCATION'
  | 'CREATURE'
  | 'THEME'
  | 'SYMBOL'
  | 'MYTH'
  | 'MYSTERY'
  | 'REVEAL'
  | 'ARC'
  | 'ISSUE'
  | 'PAGE'
  | 'PANEL_BEAT'
  | 'SOURCE_EXCERPT'
  | 'RULE'
  | 'QUESTION';

export type RelationshipType =
  | 'APPEARS_IN'
  | 'PARTICIPATES_IN'
  | 'OCCURS_AT'
  | 'CAUSES'
  | 'LEADS_TO'
  | 'PRECEDES'
  | 'KNOWS'
  | 'RELATED_TO'
  | 'MEMBER_OF'
  | 'BELIEVES'
  | 'CONTRADICTS'
  | 'FORESHADOWS'
  | 'PAYS_OFF'
  | 'SUPPORTS_THEME'
  | 'USES_SYMBOL'
  | 'SOURCE_FOR'
  | 'ADAPTED_AS'
  | 'READER_LEARNS_IN'
  | 'READER_BELIEVES_UNTIL'
  | 'LOCATED_WITHIN'
  | 'VARIANT_OF'
  | 'RESOLVES';

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  schemaVersion: number;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  defaultIssueCount: number;
  defaultPageCount: number;
  pageRoles: Record<string, string>;
}

export interface Node {
  id: string;
  projectId: string;
  type: NodeType;
  title: string;
  slug: string;
  summary: string;
  description: string;
  canonStatus: CanonStatus;
  completionStatus: CompletionStatus;
  importance: Importance;
  sourceConfidence: SourceConfidence;
  colorTag: string | null;
  createdAt: string;
  updatedAt: string;
  sortOrder: number | null;
  propertiesJson: Record<string, unknown>;
  archivedAt: string | null;
}

export interface Relationship {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType;
  inverseDisplayLabel: string | null;
  startOrder: number | null;
  endOrder: number | null;
  issueStart: number | null;
  issueEnd: number | null;
  confidence: SourceConfidence;
  canonStatus: CanonStatus;
  sourceReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface SourceReference {
  id: string;
  projectId: string;
  nodeId: string;
  sourceNodeId: string | null;
  sourceLocator: string | null;
  sourceExcerpt: string | null;
  interpretationNote: string | null;
  adaptationNote: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Arc {
  id: string;
  projectId: string;
  title: string;
  purpose: string;
  themeNodeIds: string[];
  issueStart: number | null;
  issueEnd: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  nodeId: string | null;
  number: number;
  title: string;
  arcId: string | null;
  logline: string;
  purpose: string;
  cliffhanger: string;
  status: string;
  pageCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  projectId: string;
  issueId: string;
  nodeId: string | null;
  pageNumber: number;
  pageRole: string;
  storyPurpose: string;
  layoutNotes: string;
  panelCount: number | null;
  density: string | null;
  assignedNodeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PanelBeat {
  id: string;
  projectId: string;
  pageId: string;
  order: number;
  shot: string;
  action: string;
  dialogue: string;
  caption: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReaderState {
  id: string;
  projectId: string;
  issueId: string | null;
  recordType: 'FACT' | 'BELIEF' | 'QUESTION' | 'CLUE' | 'MISDIRECTION' | 'REVEAL' | 'PAYOFF' | 'EMOTIONAL_TARGET';
  content: string;
  nodeId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationFinding {
  id: string;
  projectId: string;
  code: string;
  message: string;
  nodeIds: string[];
  dismissed: boolean;
  dismissReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Snapshot {
  id: string;
  projectId: string;
  name: string;
  reason: string;
  dataJson: string;
  createdAt: string;
}

export interface ProjectExport {
  schemaVersion: number;
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
  savedViews: unknown[];
  settings: ProjectSettings;
}

export const DEFAULT_PAGE_ROLES: Record<string, string> = {
  '1': 'cover',
  '2': 'opening',
  '3-18': 'story',
  '19': 'ending',
  '20': 'epilogue',
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  defaultIssueCount: 32,
  defaultPageCount: 20,
  pageRoles: DEFAULT_PAGE_ROLES,
};
