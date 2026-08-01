import { useMemo, useState } from 'react';
import { useAppStore } from '@/app/providers/store';
import type { ReaderState } from '@/domain/types';

const RECORD_TYPES: ReaderState['recordType'][] = [
  'FACT', 'BELIEF', 'QUESTION', 'CLUE', 'MISDIRECTION', 'REVEAL', 'PAYOFF', 'EMOTIONAL_TARGET',
];

export function ReaderKnowledgePage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const addReaderState = useAppStore((s) => s.addReaderState);
  const updateReaderState = useAppStore((s) => s.updateReaderState);
  const deleteReaderState = useAppStore((s) => s.deleteReaderState);

  const [issueFilter, setIssueFilter] = useState<string>('ALL');
  const [newType, setNewType] = useState<ReaderState['recordType']>('QUESTION');
  const [newContent, setNewContent] = useState('');
  const [newIssueId, setNewIssueId] = useState('');

  const issues = useMemo(
    () => [...(currentProject?.issues ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [currentProject?.issues],
  );

  const states = useMemo(() => {
    if (!currentProject) return [];
    let list = [...currentProject.readerStates];
    if (issueFilter !== 'ALL') {
      list = list.filter((s) => s.issueId === issueFilter);
    }
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [currentProject, issueFilter]);

  const nodeById = useMemo(
    () => new Map((currentProject?.nodes ?? []).map((n) => [n.id, n])),
    [currentProject?.nodes],
  );

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Reader Knowledge</h1>
        <p className="empty-state">Open a project first.</p>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!newContent.trim() || !newIssueId) return;
    await addReaderState({
      issueId: newIssueId,
      recordType: newType,
      content: newContent.trim(),
      nodeId: null,
      sortOrder: states.length + 1,
    });
    setNewContent('');
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Reader Knowledge</h1>
        <select value={issueFilter} onChange={(e) => setIssueFilter(e.target.value)} aria-label="Filter by issue">
          <option value="ALL">All issues</option>
          {issues.map((i) => (
            <option key={i.id} value={i.id}>Issue {i.number}: {i.title}</option>
          ))}
        </select>
      </header>

      <p className="lede">Track what the intended reader knows, believes, wonders, and feels at each issue.</p>

      <section className="card">
        <h2>Add reader state</h2>
        <div className="form-grid">
          <label>
            Issue
            <select value={newIssueId} onChange={(e) => setNewIssueId(e.target.value)}>
              <option value="">Select issue…</option>
              {issues.map((i) => (
                <option key={i.id} value={i.id}>Issue {i.number}</option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={newType} onChange={(e) => setNewType(e.target.value as ReaderState['recordType'])}>
              {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="full">
            Content
            <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={2} placeholder="What does the reader know/believe/wonder?" />
          </label>
        </div>
        <button type="button" onClick={() => void handleAdd()} disabled={!newContent.trim() || !newIssueId}>Add</button>
      </section>

      <section className="card">
        <h2>Records ({states.length})</h2>
        {states.length === 0 ? (
          <p className="empty-state">No reader knowledge records for this filter.</p>
        ) : (
          <ul className="reader-list">
            {states.map((state) => {
              const issue = issues.find((i) => i.id === state.issueId);
              return (
                <li key={state.id} className="reader-card">
                  <div className="meta-row">
                    <span className="badge">{state.recordType}</span>
                    {issue && <span className="meta">Issue {issue.number}</span>}
                    {state.nodeId && <span className="meta">→ {nodeById.get(state.nodeId)?.title}</span>}
                  </div>
                  <textarea
                    defaultValue={state.content}
                    rows={2}
                    onBlur={(e) => void updateReaderState(state.id, { content: e.target.value })}
                  />
                  <div className="button-row">
                    <select
                      defaultValue={state.recordType}
                      onChange={(e) => void updateReaderState(state.id, { recordType: e.target.value as ReaderState['recordType'] })}
                    >
                      {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button type="button" className="secondary small" onClick={() => void deleteReaderState(state.id)}>Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
