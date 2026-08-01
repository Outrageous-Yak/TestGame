import { useState } from 'react';
import { useAppStore } from '@/app/providers/store';
import { getSourceReferencesForNode } from '@/application/services/sourceReferenceService';

export function SourcePanel({ nodeId }: { nodeId: string }) {
  const currentProject = useAppStore((s) => s.currentProject);
  const addSourceReference = useAppStore((s) => s.addSourceReference);
  const updateSourceReference = useAppStore((s) => s.updateSourceReference);
  const deleteSourceReference = useAppStore((s) => s.deleteSourceReference);

  const [locator, setLocator] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [sourceBookId, setSourceBookId] = useState('');

  if (!currentProject) return null;

  const refs = getSourceReferencesForNode(currentProject, nodeId);
  const books = currentProject.nodes.filter((n) => !n.archivedAt && (n.type === 'BOOK' || n.type === 'CHAPTER'));
  const bookById = new Map(books.map((b) => [b.id, b]));

  const handleAdd = () => {
    if (!locator.trim() && !excerpt.trim()) return;
    void addSourceReference(nodeId, {
      sourceNodeId: sourceBookId || null,
      sourceLocator: locator.trim(),
      sourceExcerpt: excerpt.trim(),
    });
    setLocator('');
    setExcerpt('');
    setSourceBookId('');
  };

  return (
    <section>
      <h3>Source</h3>
      {refs.length === 0 ? (
        <p className="hint">No source references yet.</p>
      ) : (
        <ul className="source-ref-list">
          {refs.map((ref) => (
            <li key={ref.id} className="source-ref-card">
              {ref.sourceNodeId && (
                <span className="badge">{bookById.get(ref.sourceNodeId)?.title ?? 'Source'}</span>
              )}
              <input
                type="text"
                defaultValue={ref.sourceLocator ?? ''}
                placeholder="Locator (chapter, page, line)"
                onBlur={(e) => void updateSourceReference(ref.id, { sourceLocator: e.target.value })}
              />
              <textarea
                defaultValue={ref.sourceExcerpt ?? ''}
                placeholder="Quoted excerpt"
                rows={2}
                onBlur={(e) => void updateSourceReference(ref.id, { sourceExcerpt: e.target.value })}
              />
              <textarea
                defaultValue={ref.interpretationNote ?? ''}
                placeholder="Interpretation note"
                rows={2}
                onBlur={(e) => void updateSourceReference(ref.id, { interpretationNote: e.target.value })}
              />
              <textarea
                defaultValue={ref.adaptationNote ?? ''}
                placeholder="Adaptation note"
                rows={2}
                onBlur={(e) => void updateSourceReference(ref.id, { adaptationNote: e.target.value })}
              />
              <button type="button" className="secondary small" onClick={() => void deleteSourceReference(ref.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <h4>Add reference</h4>
      <div className="form-grid">
        <label>
          Source book/chapter
          <select value={sourceBookId} onChange={(e) => setSourceBookId(e.target.value)}>
            <option value="">None</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </label>
        <label>
          Locator
          <input type="text" value={locator} onChange={(e) => setLocator(e.target.value)} placeholder="Ch. 3, p. 42" />
        </label>
        <label className="full">
          Excerpt
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
        </label>
      </div>
      <button type="button" onClick={handleAdd} disabled={!locator.trim() && !excerpt.trim()}>
        Add source reference
      </button>
    </section>
  );
}
