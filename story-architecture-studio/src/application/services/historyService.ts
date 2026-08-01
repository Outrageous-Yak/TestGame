import { runValidation } from '@/application/services/validationService';
import type { Node, ProjectExport, Relationship } from '@/domain/types';
import {
  getIssueByNumber,
  getPagesForIssue,
  inferNodeIssueNumber,
  inferRelationshipIssue,
} from '@/domain/issueInference';

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

export interface RevealMoveSimulation {
  nodeId: string;
  nodeTitle: string;
  fromIssue: number | null;
  targetIssue: number;
  warnings: string[];
  pageChanges: Array<{ issueNumber: number; pageNumber: number; action: 'remove' | 'add' }>;
  readerStateChanges: Array<{ id: string; fromIssueId: string | null; toIssueId: string | null }>;
  newValidationCount: number;
  resolvedValidationCount: number;
}

function mutateRevealMove(data: ProjectExport, nodeId: string, targetIssueNumber: number): RevealMoveSimulation {
  const node = data.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);

  const cloned = structuredClone(data);
  const fromIssue = inferNodeIssueNumber(cloned, nodeId);
  const targetIssue = getIssueByNumber(cloned, targetIssueNumber);
  const simulation: RevealMoveSimulation = {
    nodeId,
    nodeTitle: node.title,
    fromIssue,
    targetIssue: targetIssueNumber,
    warnings: [],
    pageChanges: [],
    readerStateChanges: [],
    newValidationCount: 0,
    resolvedValidationCount: 0,
  };

  if (!targetIssue) {
    simulation.warnings.push(`Issue ${targetIssueNumber} does not exist`);
    return simulation;
  }

  for (const page of cloned.pages) {
    if (page.assignedNodeIds.includes(nodeId)) {
      const issue = cloned.issues.find((i) => i.id === page.issueId);
      simulation.pageChanges.push({
        issueNumber: issue?.number ?? 0,
        pageNumber: page.pageNumber,
        action: 'remove',
      });
      page.assignedNodeIds = page.assignedNodeIds.filter((id) => id !== nodeId);
    }
  }

  const targetPages = getPagesForIssue(cloned, targetIssue.id);
  const landingPage = targetPages.find((p) => p.pageNumber >= 2 && p.pageNumber <= 18) ?? targetPages[0];
  if (landingPage) {
    landingPage.assignedNodeIds = [...landingPage.assignedNodeIds, nodeId];
    simulation.pageChanges.push({
      issueNumber: targetIssueNumber,
      pageNumber: landingPage.pageNumber,
      action: 'add',
    });
  } else {
    simulation.warnings.push('No landing page found in target issue');
  }

  for (const state of cloned.readerStates.filter((r) => r.nodeId === nodeId)) {
    const prevIssueId = state.issueId;
    state.issueId = targetIssue.id;
    simulation.readerStateChanges.push({ id: state.id, fromIssueId: prevIssueId, toIssueId: targetIssue.id });
  }

  const activeRels = cloned.relationships.filter((r) => !r.archivedAt);
  for (const rel of activeRels) {
    if (rel.sourceNodeId !== nodeId && rel.targetNodeId !== nodeId) continue;
    const relIssue = inferRelationshipIssue(cloned, rel, rel.relationshipType === 'PAYS_OFF');
    if (rel.relationshipType === 'FORESHADOWS' && relIssue !== null && relIssue >= targetIssueNumber) {
      simulation.warnings.push(`Foreshadowing would occur in issue ${relIssue}, at or after reveal in issue ${targetIssueNumber}`);
    }
    if (rel.relationshipType === 'PAYS_OFF' && relIssue !== null && relIssue <= targetIssueNumber) {
      simulation.warnings.push(`Payoff in issue ${relIssue} would land before or on reveal issue ${targetIssueNumber}`);
    }
    if (rel.relationshipType === 'RESOLVES' && rel.targetNodeId === nodeId && relIssue !== null && relIssue < targetIssueNumber) {
      simulation.warnings.push(`Mystery resolution in issue ${relIssue} precedes reveal placement in issue ${targetIssueNumber}`);
    }
  }

  const beforeFindings = runValidation(data);
  const afterFindings = runValidation(cloned);
  const beforeCodes = new Set(beforeFindings.map((f) => `${f.code}:${f.nodeIds.join(',')}`));
  const afterCodes = new Set(afterFindings.map((f) => `${f.code}:${f.nodeIds.join(',')}`));
  simulation.newValidationCount = [...afterCodes].filter((c) => !beforeCodes.has(c)).length;
  simulation.resolvedValidationCount = [...beforeCodes].filter((c) => !afterCodes.has(c)).length;

  if (fromIssue !== null && fromIssue === targetIssueNumber) {
    simulation.warnings.push('Node is already placed in the target issue');
  }

  return simulation;
}

export function simulateRevealMove(
  data: ProjectExport,
  nodeId: string,
  targetIssueNumber: number,
): RevealMoveSimulation | null {
  const node = data.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  if (!['REVEAL', 'MYSTERY', 'EVENT', 'SCENE'].includes(node.type)) {
    return {
      nodeId,
      nodeTitle: node.title,
      fromIssue: inferNodeIssueNumber(data, nodeId),
      targetIssue: targetIssueNumber,
      warnings: ['Simulation is optimized for reveals, mysteries, events, and scenes'],
      pageChanges: [],
      readerStateChanges: [],
      newValidationCount: 0,
      resolvedValidationCount: 0,
    };
  }
  return mutateRevealMove(data, nodeId, targetIssueNumber);
}

export function applyRevealMoveToExport(
  data: ProjectExport,
  nodeId: string,
  targetIssueNumber: number,
): ProjectExport {
  const simulation = mutateRevealMove(data, nodeId, targetIssueNumber);
  if (simulation.warnings.some((w) => w.includes('does not exist'))) {
    throw new Error(simulation.warnings[0]);
  }
  const cloned = structuredClone(data);
  const targetIssue = getIssueByNumber(cloned, targetIssueNumber);
  if (!targetIssue) throw new Error(`Issue ${targetIssueNumber} not found`);

  for (const page of cloned.pages) {
    page.assignedNodeIds = page.assignedNodeIds.filter((id) => id !== nodeId);
  }
  const targetPages = getPagesForIssue(cloned, targetIssue.id);
  const landingPage = targetPages.find((p) => p.pageNumber >= 2 && p.pageNumber <= 18) ?? targetPages[0];
  if (landingPage) {
    landingPage.assignedNodeIds = [...landingPage.assignedNodeIds, nodeId];
  }
  for (const state of cloned.readerStates.filter((r) => r.nodeId === nodeId)) {
    state.issueId = targetIssue.id;
  }
  cloned.project.updatedAt = new Date().toISOString();
  return cloned;
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
