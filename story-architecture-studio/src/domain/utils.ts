import type { NodeType } from './types';

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

export function uniqueSlug(base: string, existing: Set<string>): string {
  let slug = base;
  let counter = 2;
  while (existing.has(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  BOOK: 'Book',
  CHAPTER: 'Chapter',
  CHARACTER: 'Character',
  GROUP: 'Group',
  EVENT: 'Event',
  SCENE: 'Scene',
  LOCATION: 'Location',
  CREATURE: 'Creature',
  THEME: 'Theme',
  SYMBOL: 'Symbol',
  MYTH: 'Myth',
  MYSTERY: 'Mystery',
  REVEAL: 'Reveal',
  ARC: 'Arc',
  ISSUE: 'Issue',
  PAGE: 'Page',
  PANEL_BEAT: 'Panel Beat',
  SOURCE_EXCERPT: 'Source Excerpt',
  RULE: 'Rule',
  QUESTION: 'Question',
};

export const CANON_STATUS_LABELS = {
  CANON: 'Canon',
  ADAPTATION: 'Adaptation',
  PROPOSED: 'Proposed',
  CONFLICTED: 'Conflicted',
  RETIRED: 'Retired',
} as const;

export function defaultPageRole(pageNumber: number): string {
  if (pageNumber === 1) return 'cover';
  if (pageNumber === 2) return 'opening';
  if (pageNumber === 19) return 'ending';
  if (pageNumber === 20) return 'epilogue';
  return 'story';
}

export function estimatePageDensity(panelCount: number | null, assignedCount: number, beatCount: number): string {
  const score = (panelCount ?? 0) + assignedCount * 2 + beatCount;
  if (score === 0) return 'light';
  if (score <= 4) return 'balanced';
  if (score <= 8) return 'dense';
  return 'overloaded';
}
