import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '@/app/providers/store';
import { getIssuePages, getUnassignedScenes } from '@/application/services/planningService';
import { estimatePageDensity } from '@/domain/utils';

export function IssuePlannerPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const currentProject = useAppStore((s) => s.currentProject);
  const assignToPage = useAppStore((s) => s.assignToPage);
  const unassignFromPage = useAppStore((s) => s.unassignFromPage);
  const updatePage = useAppStore((s) => s.updatePage);

  const issue = currentProject?.issues.find((i) => i.id === issueId);
  const pages = useMemo(
    () => (currentProject && issueId ? getIssuePages(currentProject, issueId) : []),
    [currentProject, issueId],
  );
  const unassigned = useMemo(
    () => (currentProject && issueId ? getUnassignedScenes(currentProject, issueId) : []),
    [currentProject, issueId],
  );

  const nodeById = useMemo(
    () => new Map((currentProject?.nodes ?? []).map((n) => [n.id, n])),
    [currentProject?.nodes],
  );

  if (!currentProject || !issue || !issueId) {
    return (
      <div className="page">
        <h1>Issue Planner</h1>
        <p className="empty-state">Issue not found.</p>
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData('text/node-id', nodeId);
  };

  const handleDrop = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    const nodeId = e.dataTransfer.getData('text/node-id');
    if (nodeId) void assignToPage(pageId, nodeId);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link to="/issues" className="back-link">← Issue Board</Link>
          <h1>Issue {issue.number}: {issue.title}</h1>
        </div>
        <Link to={`/issues/${issueId}/pages/${pages[0]?.id ?? ''}`} className="link-btn">
          Page details →
        </Link>
      </header>

      <section className="card unassigned-tray">
        <h2>Unassigned scenes &amp; events ({unassigned.length})</h2>
        <div className="chip-tray">
          {unassigned.length === 0 ? (
            <span className="hint">All scenes placed or none created yet.</span>
          ) : (
            unassigned.map((id) => {
              const node = nodeById.get(id);
              return (
                <span
                  key={id}
                  className="chip draggable"
                  draggable
                  onDragStart={(e) => handleDragStart(e, id)}
                >
                  {node?.title ?? id}
                </span>
              );
            })
          )}
        </div>
      </section>

      <div className="page-grid">
        {pages.map((page) => {
          const beats = currentProject.panelBeats.filter((b) => b.pageId === page.id);
          const density = estimatePageDensity(page.panelCount, page.assignedNodeIds.length, beats.length);
          return (
            <article
              key={page.id}
              className={`page-card card density-${density}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, page.id)}
            >
              <header>
                <strong>Page {page.pageNumber}</strong>
                <span className="badge">{page.pageRole}</span>
                <span className={`badge density-badge ${density}`}>{density}</span>
              </header>
              <input
                type="text"
                defaultValue={page.storyPurpose}
                placeholder="Story purpose"
                onBlur={(e) => void updatePage(page.id, { storyPurpose: e.target.value })}
              />
              <ul className="assigned-list">
                {page.assignedNodeIds.map((id) => (
                  <li key={id}>
                    {nodeById.get(id)?.title ?? id}
                    <button type="button" className="secondary small" onClick={() => void unassignFromPage(page.id, id)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <Link to={`/issues/${issueId}/pages/${page.id}`} className="link-btn small">Edit page →</Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
