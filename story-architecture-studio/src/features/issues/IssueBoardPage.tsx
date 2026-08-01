import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '@/app/providers/store';
import type { Issue } from '@/domain/types';

function SortableIssueCard({ issue }: { issue: Issue }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  const currentProject = useAppStore((s) => s.currentProject);

  const pageCount = currentProject?.pages.filter((p) => p.issueId === issue.id).length ?? 0;
  const filledPages = currentProject?.pages.filter(
    (p) => p.issueId === issue.id && (p.assignedNodeIds.length > 0 || p.storyPurpose),
  ).length ?? 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <article ref={setNodeRef} style={style} className="issue-card card">
      <button type="button" className="drag-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        ⠿
      </button>
      <div className="issue-card-body">
        <h3>#{issue.number} {issue.title}</h3>
        {issue.purpose && <p>{issue.purpose}</p>}
        <div className="meta-row">
          <span className="badge">{issue.status}</span>
          <span className="meta">{filledPages}/{pageCount} pages started</span>
        </div>
        <Link to={`/issues/${issue.id}/plan`} className="link-btn">Plan pages →</Link>
      </div>
    </article>
  );
}

export function IssueBoardPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const ensureIssues = useAppStore((s) => s.ensureIssues);
  const reorderIssues = useAppStore((s) => s.reorderIssues);
  const updateIssue = useAppStore((s) => s.updateIssue);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const issues = useMemo(
    () => [...(currentProject?.issues ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [currentProject?.issues],
  );

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Issue Board</h1>
        <p className="empty-state">Open a project first.</p>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = issues.findIndex((i) => i.id === active.id);
    const newIndex = issues.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(issues, oldIndex, newIndex);
    void reorderIssues(reordered.map((i) => i.id));
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Issue Board</h1>
        <button type="button" onClick={() => void ensureIssues()}>
          {issues.length ? 'Ensure all issues exist' : 'Create 32 issues'}
        </button>
      </header>

      {issues.length === 0 ? (
        <p className="empty-state">No issues yet. Click &quot;Create 32 issues&quot; to generate the series board.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="issue-board">
              {issues.map((issue) => (
                <div key={issue.id}>
                  <SortableIssueCard issue={issue} />
                  <div className="issue-inline-edit">
                    <input
                      type="text"
                      defaultValue={issue.title}
                      placeholder="Issue title"
                      onBlur={(e) => void updateIssue(issue.id, { title: e.target.value })}
                    />
                    <input
                      type="text"
                      defaultValue={issue.logline}
                      placeholder="Logline"
                      onBlur={(e) => void updateIssue(issue.id, { logline: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
