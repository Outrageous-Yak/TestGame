import type { NodeType, ProjectExport } from '@/domain/types';
import { projectService } from '../services/projectService';
import { assignNodeToPage, ensureIssueSeries, addReaderState } from './planningService';

const WALK_CHARACTERS = [
  'Aerin', 'Keth', 'First Blue', 'Devin', 'Kaelen', 'Nadia',
];

const WALK_LOCATIONS = ['Azurefold', 'bridge'];

const WALK_CREATURES = [
  'Rhino', 'Sabertooth', 'Sentinel', 'Swamp Hag', 'Merlion', 'Whisperwyrm',
];

const WALK_THEMES = ['Blue lineage', 'memory', 'song', 'rift', 'Walk'];

const WALK_OTHER = ['First Mother'];

export async function createWalkSeedProject(): Promise<ProjectExport> {
  let data = await projectService.createProject(
    'The Walk',
    'Seven source books adapted into an estimated 32 comics. Canon is sacred; presentation may move, condense, merge, or visually replace prose.',
  );

  data = await projectService.updateProject(data.project.id, {
    settings: {
      defaultIssueCount: 32,
      defaultPageCount: 20,
      pageRoles: {
        '1': 'cover',
        '2': 'opening',
        '3-18': 'story',
        '19': 'ending',
        '20': 'epilogue',
      },
    },
  });

  const nodeIdByTitle = new Map<string, string>();

  for (let i = 1; i <= 7; i += 1) {
    data = await projectService.createNode(data.project.id, {
      type: 'BOOK',
      title: `Book ${i}`,
      summary: `Source book ${i} of The Walk`,
      propertiesJson: { bookNumber: i, readingOrder: i, chronologyOrder: i },
    });
    const book = data.nodes[data.nodes.length - 1]!;
    nodeIdByTitle.set(book.title, book.id);
  }

  const addNodes = async (titles: string[], type: NodeType) => {
    for (const title of titles) {
      data = await projectService.createNode(data.project.id, { type, title });
      const node = data.nodes[data.nodes.length - 1]!;
      nodeIdByTitle.set(title, node.id);
    }
  };

  await addNodes(WALK_CHARACTERS, 'CHARACTER');
  await addNodes(WALK_LOCATIONS, 'LOCATION');
  await addNodes(WALK_CREATURES, 'CREATURE');
  await addNodes(WALK_THEMES, 'THEME');
  await addNodes(WALK_OTHER, 'CHARACTER');

  // Sample vertical-slice content for Issue 1 planning
  data = await projectService.createNode(data.project.id, {
    type: 'SCENE',
    title: 'Aerin leaves Azurefold',
    summary: 'Opening journey beat for Issue 1',
    propertiesJson: { chronologyOrder: 1, readingOrder: 1 },
  });
  const sceneId = data.nodes[data.nodes.length - 1]!.id;

  data = await projectService.createNode(data.project.id, {
    type: 'EVENT',
    title: 'Encounter with Sabertooth',
    summary: 'First major threat on the Walk',
    propertiesJson: { chronologyOrder: 2 },
  });
  const eventId = data.nodes[data.nodes.length - 1]!.id;

  data = await projectService.createNode(data.project.id, {
    type: 'MYSTERY',
    title: 'What is the Blue lineage?',
    summary: 'Central myth question',
  });

  const aerinId = nodeIdByTitle.get('Aerin');
  const kethId = nodeIdByTitle.get('Keth');
  const azurefoldId = nodeIdByTitle.get('Azurefold');
  const sabertoothId = nodeIdByTitle.get('Sabertooth');
  const memoryId = nodeIdByTitle.get('memory');

  if (aerinId && azurefoldId) {
    data = await projectService.createRelationship(data.project.id, {
      sourceNodeId: aerinId,
      targetNodeId: azurefoldId,
      relationshipType: 'APPEARS_IN',
      notes: 'Aerin lives in Azurefold',
    });
  }

  if (aerinId && kethId) {
    data = await projectService.createRelationship(data.project.id, {
      sourceNodeId: aerinId,
      targetNodeId: kethId,
      relationshipType: 'RELATED_TO',
      notes: 'Walk companions',
    });
  }

  if (aerinId && sabertoothId) {
    data = await projectService.createRelationship(data.project.id, {
      sourceNodeId: aerinId,
      targetNodeId: sabertoothId,
      relationshipType: 'APPEARS_IN',
      notes: 'Encounter on the Walk',
    });
  }

  if (sabertoothId && memoryId) {
    data = await projectService.createRelationship(data.project.id, {
      sourceNodeId: sabertoothId,
      targetNodeId: memoryId,
      relationshipType: 'SUPPORTS_THEME',
    });
  }

  if (sceneId && eventId) {
    data = await projectService.createRelationship(data.project.id, {
      sourceNodeId: sceneId,
      targetNodeId: eventId,
      relationshipType: 'LEADS_TO',
    });
  }

  if (aerinId && sceneId) {
    data = await projectService.createRelationship(data.project.id, {
      sourceNodeId: aerinId,
      targetNodeId: sceneId,
      relationshipType: 'PARTICIPATES_IN',
    });
  }

  // Create 32 issues with 20 pages each
  data = await ensureIssueSeries(data.project.id, 32);

  const issue1 = data.issues.find((i) => i.number === 1);
  const page3 = data.pages.find((p) => p.issueId === issue1?.id && p.pageNumber === 3);
  if (page3) {
    data = await assignNodeToPage(data.project.id, page3.id, sceneId);
  }

  // Reader knowledge snapshot for Issue 1
  if (issue1 && aerinId) {
    data = await addReaderState(data.project.id, {
      issueId: issue1.id,
      recordType: 'QUESTION',
      content: 'Who is Aerin and why is she walking?',
      nodeId: aerinId,
      sortOrder: 1,
    });
  }

  return data;
}
