import { v4 as uuidv4 } from 'uuid';
import type { Issue, Page, PanelBeat, ProjectExport, ReaderState } from '@/domain/types';
import { defaultPageRole, nowIso } from '@/domain/utils';
import { getPersistenceAdapter } from '@/infrastructure/persistence/indexedDbAdapter';

async function load(projectId: string): Promise<ProjectExport> {
  const data = await getPersistenceAdapter().loadProjectData(projectId);
  if (!data) throw new Error(`Project not found: ${projectId}`);
  return data;
}

async function save(data: ProjectExport): Promise<ProjectExport> {
  data.project.updatedAt = nowIso();
  await getPersistenceAdapter().saveProject(data.project);
  await getPersistenceAdapter().saveProjectData(data);
  return data;
}

export async function ensureIssueSeries(projectId: string, count?: number): Promise<ProjectExport> {
  const data = await load(projectId);
  const target = count ?? data.project.settings.defaultIssueCount;
  const now = nowIso();

  if (data.issues.length >= target) return data;

  for (let n = data.issues.length + 1; n <= target; n += 1) {
    const issue: Issue = {
      id: uuidv4(),
      projectId,
      nodeId: null,
      number: n,
      title: `Issue ${n}`,
      arcId: null,
      logline: '',
      purpose: '',
      cliffhanger: '',
      status: 'outline',
      pageCount: data.project.settings.defaultPageCount,
      sortOrder: n,
      createdAt: now,
      updatedAt: now,
    };
    data.issues.push(issue);

    for (let p = 1; p <= issue.pageCount; p += 1) {
      const page: Page = {
        id: uuidv4(),
        projectId,
        issueId: issue.id,
        nodeId: null,
        pageNumber: p,
        pageRole: defaultPageRole(p),
        storyPurpose: '',
        layoutNotes: '',
        panelCount: p === 1 || p === 20 ? 0 : null,
        density: null,
        assignedNodeIds: [],
        createdAt: now,
        updatedAt: now,
      };
      data.pages.push(page);
    }
  }

  return save(data);
}

export async function updateIssue(
  projectId: string,
  issueId: string,
  updates: Partial<Pick<Issue, 'title' | 'logline' | 'purpose' | 'cliffhanger' | 'status' | 'arcId'>>,
): Promise<ProjectExport> {
  const data = await load(projectId);
  const idx = data.issues.findIndex((i) => i.id === issueId);
  if (idx === -1) throw new Error(`Issue not found: ${issueId}`);
  data.issues[idx] = { ...data.issues[idx]!, ...updates, updatedAt: nowIso() };
  return save(data);
}

export async function reorderIssues(projectId: string, orderedIssueIds: string[]): Promise<ProjectExport> {
  const data = await load(projectId);
  const byId = new Map(data.issues.map((i) => [i.id, i]));
  orderedIssueIds.forEach((id, index) => {
    const issue = byId.get(id);
    if (issue) {
      issue.sortOrder = index + 1;
      issue.number = index + 1;
      issue.updatedAt = nowIso();
    }
  });
  data.issues.sort((a, b) => a.sortOrder - b.sortOrder);
  return save(data);
}

export async function updatePage(
  projectId: string,
  pageId: string,
  updates: Partial<Pick<Page, 'pageRole' | 'storyPurpose' | 'layoutNotes' | 'panelCount' | 'density' | 'assignedNodeIds'>>,
): Promise<ProjectExport> {
  const data = await load(projectId);
  const idx = data.pages.findIndex((p) => p.id === pageId);
  if (idx === -1) throw new Error(`Page not found: ${pageId}`);
  data.pages[idx] = { ...data.pages[idx]!, ...updates, updatedAt: nowIso() };
  return save(data);
}

export async function assignNodeToPage(
  projectId: string,
  pageId: string,
  nodeId: string,
): Promise<ProjectExport> {
  const data = await load(projectId);
  const page = data.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Page not found: ${pageId}`);
  if (!page.assignedNodeIds.includes(nodeId)) {
    page.assignedNodeIds = [...page.assignedNodeIds, nodeId];
    page.updatedAt = nowIso();
  }
  // Remove from other pages in same issue
  for (const p of data.pages) {
    if (p.issueId === page.issueId && p.id !== pageId) {
      p.assignedNodeIds = p.assignedNodeIds.filter((id) => id !== nodeId);
    }
  }
  return save(data);
}

export async function unassignNodeFromPage(
  projectId: string,
  pageId: string,
  nodeId: string,
): Promise<ProjectExport> {
  const data = await load(projectId);
  const page = data.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Page not found: ${pageId}`);
  page.assignedNodeIds = page.assignedNodeIds.filter((id) => id !== nodeId);
  page.updatedAt = nowIso();
  return save(data);
}

export async function addPanelBeat(
  projectId: string,
  pageId: string,
  input: Partial<Pick<PanelBeat, 'shot' | 'action' | 'dialogue' | 'caption'>>,
): Promise<ProjectExport> {
  const data = await load(projectId);
  const now = nowIso();
  const existing = data.panelBeats.filter((b) => b.pageId === pageId);
  const beat: PanelBeat = {
    id: uuidv4(),
    projectId,
    pageId,
    order: existing.length + 1,
    shot: input.shot ?? '',
    action: input.action ?? '',
    dialogue: input.dialogue ?? '',
    caption: input.caption ?? '',
    createdAt: now,
    updatedAt: now,
  };
  data.panelBeats.push(beat);
  return save(data);
}

export async function updatePanelBeat(
  projectId: string,
  beatId: string,
  updates: Partial<Pick<PanelBeat, 'shot' | 'action' | 'dialogue' | 'caption' | 'order'>>,
): Promise<ProjectExport> {
  const data = await load(projectId);
  const idx = data.panelBeats.findIndex((b) => b.id === beatId);
  if (idx === -1) throw new Error(`Panel beat not found: ${beatId}`);
  data.panelBeats[idx] = { ...data.panelBeats[idx]!, ...updates, updatedAt: nowIso() };
  return save(data);
}

export async function addReaderState(
  projectId: string,
  input: Pick<ReaderState, 'issueId' | 'recordType' | 'content' | 'nodeId' | 'sortOrder'>,
): Promise<ProjectExport> {
  const data = await load(projectId);
  const now = nowIso();
  const state: ReaderState = {
    id: uuidv4(),
    projectId,
    issueId: input.issueId,
    recordType: input.recordType,
    content: input.content,
    nodeId: input.nodeId,
    sortOrder: input.sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  data.readerStates.push(state);
  return save(data);
}

export function getIssuePages(data: ProjectExport, issueId: string): Page[] {
  return data.pages
    .filter((p) => p.issueId === issueId)
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

export function getUnassignedScenes(data: ProjectExport, issueId: string): string[] {
  const issuePages = getIssuePages(data, issueId);
  const assigned = new Set(issuePages.flatMap((p) => p.assignedNodeIds));
  return data.nodes
    .filter((n) => !n.archivedAt && (n.type === 'SCENE' || n.type === 'EVENT') && !assigned.has(n.id))
    .map((n) => n.id);
}
