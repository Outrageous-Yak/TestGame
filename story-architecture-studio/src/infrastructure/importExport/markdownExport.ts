import type { ProjectExport } from '@/domain/types';
import { estimatePageDensity } from '@/domain/utils';

export function exportIssueBrief(data: ProjectExport, issueId: string): string {
  const issue = data.issues.find((i) => i.id === issueId);
  if (!issue) return '# Issue not found';

  const pages = data.pages
    .filter((p) => p.issueId === issueId)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
  const lines: string[] = [
    `# ${issue.title}`,
    '',
    `**Issue number:** ${issue.number}`,
    `**Status:** ${issue.status}`,
    '',
  ];

  if (issue.logline) lines.push(`**Logline:** ${issue.logline}`, '');
  if (issue.purpose) lines.push(`**Purpose:** ${issue.purpose}`, '');
  if (issue.cliffhanger) lines.push(`**Cliffhanger:** ${issue.cliffhanger}`, '');

  lines.push('## Pages', '');

  for (const page of pages) {
    const beats = data.panelBeats.filter((b) => b.pageId === page.id).sort((a, b) => a.order - b.order);
    const density = estimatePageDensity(page.panelCount, page.assignedNodeIds.length, beats.length);
    const assigned = page.assignedNodeIds.map((id) => nodeById.get(id)?.title ?? id);

    lines.push(`### Page ${page.pageNumber} — ${page.pageRole} (${density})`);
    if (page.storyPurpose) lines.push(`- **Story purpose:** ${page.storyPurpose}`);
    if (page.layoutNotes) lines.push(`- **Layout:** ${page.layoutNotes}`);
    if (assigned.length) lines.push(`- **Assigned:** ${assigned.join(', ')}`);
    if (page.panelCount !== null) lines.push(`- **Panels:** ${page.panelCount}`);

    if (beats.length) {
      lines.push('', '**Panel beats:**');
      for (const beat of beats) {
        lines.push(`1. **Shot:** ${beat.shot || '—'}`);
        if (beat.action) lines.push(`   - Action: ${beat.action}`);
        if (beat.dialogue) lines.push(`   - Dialogue: ${beat.dialogue}`);
        if (beat.caption) lines.push(`   - Caption: ${beat.caption}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
