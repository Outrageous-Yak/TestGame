import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '@/app/providers/store';
import { downloadMarkdown, exportIssueBrief } from '@/infrastructure/importExport/markdownExport';

export function PagePlannerPage() {
  const { issueId, pageId } = useParams<{ issueId: string; pageId: string }>();
  const currentProject = useAppStore((s) => s.currentProject);
  const updatePage = useAppStore((s) => s.updatePage);
  const addPanelBeat = useAppStore((s) => s.addPanelBeat);
  const updatePanelBeat = useAppStore((s) => s.updatePanelBeat);

  const issue = currentProject?.issues.find((i) => i.id === issueId);
  const page = currentProject?.pages.find((p) => p.id === pageId);
  const beats = useMemo(
    () => (currentProject?.panelBeats ?? []).filter((b) => b.pageId === pageId).sort((a, b) => a.order - b.order),
    [currentProject?.panelBeats, pageId],
  );

  const nodeById = useMemo(
    () => new Map((currentProject?.nodes ?? []).map((n) => [n.id, n])),
    [currentProject?.nodes],
  );

  if (!currentProject || !issue || !page || !issueId || !pageId) {
    return (
      <div className="page">
        <h1>Page Planner</h1>
        <p className="empty-state">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link to={`/issues/${issueId}/plan`} className="back-link">← Issue planner</Link>
          <h1>Issue {issue.number} · Page {page.pageNumber}</h1>
        </div>
        <button
          type="button"
          onClick={() => downloadMarkdown(exportIssueBrief(currentProject, issueId), `issue-${issue.number}-brief.md`)}
        >
          Export issue brief
        </button>
      </header>

      <section className="card">
        <h2>Page metadata</h2>
        <div className="form-grid">
          <label>
            Role
            <input
              type="text"
              defaultValue={page.pageRole}
              onBlur={(e) => void updatePage(page.id, { pageRole: e.target.value })}
            />
          </label>
          <label>
            Panel count
            <input
              type="number"
              min={0}
              defaultValue={page.panelCount ?? ''}
              onBlur={(e) => void updatePage(page.id, { panelCount: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label className="full">
            Story purpose
            <textarea
              defaultValue={page.storyPurpose}
              rows={2}
              onBlur={(e) => void updatePage(page.id, { storyPurpose: e.target.value })}
            />
          </label>
          <label className="full">
            Layout notes
            <textarea
              defaultValue={page.layoutNotes}
              rows={3}
              onBlur={(e) => void updatePage(page.id, { layoutNotes: e.target.value })}
            />
          </label>
        </div>
        {page.assignedNodeIds.length > 0 && (
          <p><strong>Cast / scenes:</strong> {page.assignedNodeIds.map((id) => nodeById.get(id)?.title ?? id).join(', ')}</p>
        )}
      </section>

      <section className="card">
        <header className="section-header">
          <h2>Panel beats</h2>
          <button type="button" onClick={() => void addPanelBeat(page.id)}>Add beat</button>
        </header>
        {beats.length === 0 ? (
          <p className="empty-state">No panel beats yet.</p>
        ) : (
          <div className="beat-list">
            {beats.map((beat) => (
              <article key={beat.id} className="beat-card">
                <strong>Panel {beat.order}</strong>
                <label>Shot <input type="text" defaultValue={beat.shot} onBlur={(e) => void updatePanelBeat(beat.id, { shot: e.target.value })} /></label>
                <label>Action <textarea defaultValue={beat.action} rows={2} onBlur={(e) => void updatePanelBeat(beat.id, { action: e.target.value })} /></label>
                <label>Dialogue <textarea defaultValue={beat.dialogue} rows={2} onBlur={(e) => void updatePanelBeat(beat.id, { dialogue: e.target.value })} /></label>
                <label>Caption <textarea defaultValue={beat.caption} rows={2} onBlur={(e) => void updatePanelBeat(beat.id, { caption: e.target.value })} /></label>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
