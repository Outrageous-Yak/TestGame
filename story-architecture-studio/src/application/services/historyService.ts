import type { Node, ProjectExport, Relationship } from '@/domain/types';

const MAX_HISTORY = 50;

export class HistoryService {
  private undoStack: ProjectExport[] = [];
  private redoStack: ProjectExport[] = [];

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Call before applying a mutation to capture the prior state. */
  pushBefore(state: ProjectExport): void {
    this.undoStack.push(structuredClone(state));
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(current: ProjectExport): ProjectExport | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(structuredClone(current));
    return prev;
  }

  redo(current: ProjectExport): ProjectExport | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(structuredClone(current));
    return next;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

export const historyService = new HistoryService();

export interface ImpactReport {
  nodeId: string;
  nodeTitle: string;
  relationshipCount: number;
  relationships: Relationship[];
  pageAssignments: Array<{ issueNumber: number; pageNumber: number; pageId: string }>;
  readerStateCount: number;
  dependentNodeTitles: string[];
  warnings: string[];
}

export function analyzeNodeImpact(data: ProjectExport, nodeId: string): ImpactReport | null {
  const node = data.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const relationships = data.relationships.filter(
    (r) => !r.archivedAt && (r.sourceNodeId === nodeId || r.targetNodeId === nodeId),
  );

  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const dependentIds = new Set<string>();
  for (const rel of relationships) {
    if (rel.sourceNodeId !== nodeId) dependentIds.add(rel.sourceNodeId);
    if (rel.targetNodeId !== nodeId) dependentIds.add(rel.targetNodeId);
  }

  const pageAssignments: ImpactReport['pageAssignments'] = [];
  for (const page of data.pages) {
    if (page.assignedNodeIds.includes(nodeId)) {
      const issue = data.issues.find((i) => i.id === page.issueId);
      pageAssignments.push({
        issueNumber: issue?.number ?? 0,
        pageNumber: page.pageNumber,
        pageId: page.id,
      });
    }
  }

  const readerStateCount = data.readerStates.filter((r) => r.nodeId === nodeId).length;

  const warnings: string[] = [];
  if (relationships.length > 0) {
    warnings.push(`${relationships.length} active relationship(s) will be affected`);
  }
  if (pageAssignments.length > 0) {
    warnings.push(`Assigned to ${pageAssignments.length} page(s) in issue planning`);
  }
  if (readerStateCount > 0) {
    warnings.push(`${readerStateCount} reader knowledge record(s) reference this node`);
  }

  const foreshadows = relationships.filter((r) =>
    r.relationshipType === 'FORESHADOWS' || r.relationshipType === 'PAYS_OFF',
  );
  if (foreshadows.length > 0) {
    warnings.push('Connected to foreshadowing or payoff chains');
  }

  return {
    nodeId,
    nodeTitle: node.title,
    relationshipCount: relationships.length,
    relationships,
    pageAssignments,
    readerStateCount,
    dependentNodeTitles: [...dependentIds].map((id) => nodeById.get(id)?.title ?? id),
    warnings,
  };
}

export interface MergePreview {
  addedNodes: Node[];
  updatedNodes: Array<{ id: string; title: string; field: string }>;
  conflicts: Array<{ id: string; title: string; reason: string }>;
  addedRelationships: number;
  addedIssues: number;
  addedPages: number;
  rejected: string[];
}

export function previewMerge(current: ProjectExport, incoming: ProjectExport): MergePreview {
  const preview: MergePreview = {
    addedNodes: [],
    updatedNodes: [],
    conflicts: [],
    addedRelationships: 0,
    addedIssues: 0,
    addedPages: 0,
    rejected: [],
  };

  if (incoming.schemaVersion !== current.schemaVersion) {
    preview.rejected.push(`Schema version mismatch: incoming v${incoming.schemaVersion} vs current v${current.schemaVersion}`);
  }

  const currentNodeIds = new Set(current.nodes.map((n) => n.id));
  const currentById = new Map(current.nodes.map((n) => [n.id, n]));

  for (const node of incoming.nodes) {
    if (!currentNodeIds.has(node.id)) {
      preview.addedNodes.push(node);
    } else {
      const existing = currentById.get(node.id)!;
      if (existing.title !== node.title) {
        preview.updatedNodes.push({ id: node.id, title: node.title, field: 'title' });
      }
      if (existing.type !== node.type) {
        preview.conflicts.push({ id: node.id, title: node.title, reason: `Type conflict: ${existing.type} vs ${node.type}` });
      }
    }
  }

  const currentRelIds = new Set(current.relationships.map((r) => r.id));
  preview.addedRelationships = incoming.relationships.filter((r) => !currentRelIds.has(r.id)).length;

  const currentIssueIds = new Set(current.issues.map((i) => i.id));
  preview.addedIssues = incoming.issues.filter((i) => !currentIssueIds.has(i.id)).length;

  const currentPageIds = new Set(current.pages.map((p) => p.id));
  preview.addedPages = incoming.pages.filter((p) => !currentPageIds.has(p.id)).length;

  return preview;
}

export function applyMerge(current: ProjectExport, incoming: ProjectExport): ProjectExport {
  const preview = previewMerge(current, incoming);
  if (preview.conflicts.length > 0) {
    throw new Error(`Merge blocked: ${preview.conflicts.length} conflict(s) must be resolved first`);
  }

  const nodeIds = new Set(current.nodes.map((n) => n.id));
  const relIds = new Set(current.relationships.map((r) => r.id));
  const issueIds = new Set(current.issues.map((i) => i.id));
  const pageIds = new Set(current.pages.map((p) => p.id));

  const merged: ProjectExport = structuredClone(current);

  for (const node of incoming.nodes) {
    if (!nodeIds.has(node.id)) {
      merged.nodes.push(node);
      nodeIds.add(node.id);
    } else {
      const idx = merged.nodes.findIndex((n) => n.id === node.id);
      if (idx >= 0) {
        merged.nodes[idx] = { ...merged.nodes[idx]!, ...node, projectId: current.project.id };
      }
    }
  }

  for (const rel of incoming.relationships) {
    if (!relIds.has(rel.id)) {
      merged.relationships.push({ ...rel, projectId: current.project.id });
      relIds.add(rel.id);
    }
  }

  for (const issue of incoming.issues) {
    if (!issueIds.has(issue.id)) {
      merged.issues.push({ ...issue, projectId: current.project.id });
      issueIds.add(issue.id);
    }
  }

  for (const page of incoming.pages) {
    if (!pageIds.has(page.id)) {
      merged.pages.push({ ...page, projectId: current.project.id, assignedNodeIds: page.assignedNodeIds ?? [] });
      pageIds.add(page.id);
    }
  }

  for (const state of incoming.readerStates) {
    if (!merged.readerStates.some((r) => r.id === state.id)) {
      merged.readerStates.push({ ...state, projectId: current.project.id });
    }
  }

  merged.project.updatedAt = new Date().toISOString();
  return merged;
}
