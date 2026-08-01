import { useRef, useState } from 'react';
import { useAppStore } from '@/app/providers/store';
import { downloadJson, parseImportJson } from '@/infrastructure/importExport';
import { nodesToCsv, relationshipsToCsv } from '@/infrastructure/importExport';
import { previewMerge } from '@/application/services/historyService';
import type { ProjectExport } from '@/domain/types';

export function ImportExportPage() {
  const currentProject = useAppStore((s) => s.exportCurrentProject);
  const importProjectData = useAppStore((s) => s.importProjectData);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pendingImport, setPendingImport] = useState<ProjectExport | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [mergePreview, setMergePreview] = useState<ReturnType<typeof previewMerge> | null>(null);

  const data = currentProject();

  const handleFileSelect = async (file: File) => {
    const text = await file.text();
    const parsed = parseImportJson(text);
    setPendingImport(parsed);
    if (importMode === 'merge' && data) {
      setMergePreview(previewMerge(data, parsed));
    } else {
      setMergePreview(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    await importProjectData(pendingImport, importMode);
    setPendingImport(null);
    setMergePreview(null);
  };

  return (
    <div className="page">
      <h1>Import / Export</h1>
      <p className="lede">JSON is the canonical exchange format. Import validates before commit.</p>

      <section className="card">
        <h2>Export</h2>
        {!data ? (
          <p className="empty-state">Open a project to export.</p>
        ) : (
          <div className="button-row">
            <button type="button" onClick={() => data && downloadJson(data, `${data.project.name.replace(/\s+/g, '-').toLowerCase()}.json`)}>
              Export project JSON
            </button>
            <button type="button" className="secondary" onClick={handleExportCsv}>Export nodes CSV</button>
            <button type="button" className="secondary" onClick={handleExportRelCsv}>Export relationships CSV</button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Import</h2>
        <div className="inline-form">
          <label>
            Mode
            <select
              value={importMode}
              onChange={(e) => {
                const mode = e.target.value as 'replace' | 'merge';
                setImportMode(mode);
                if (mode === 'merge' && data && pendingImport) {
                  setMergePreview(previewMerge(data, pendingImport));
                } else {
                  setMergePreview(null);
                }
              }}
            >
              <option value="replace">Replace project</option>
              <option value="merge">Merge into current</option>
            </select>
          </label>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileSelect(file);
          }}
          aria-label="Import project JSON"
        />
        <p className="hint">
          Replace overwrites all data (snapshot created first). Merge adds new nodes/relationships and updates matching IDs.
        </p>

        {pendingImport && (
          <div className="import-preview card">
            <h3>Import preview</h3>
            <p><strong>{pendingImport.project.name}</strong> — {pendingImport.nodes.length} nodes, {pendingImport.relationships.length} relationships</p>
            {mergePreview && (
              <ul className="merge-summary">
                <li>{mergePreview.addedNodes.length} new nodes</li>
                <li>{mergePreview.updatedNodes.length} updated nodes</li>
                <li>{mergePreview.addedRelationships} new relationships</li>
                <li>{mergePreview.conflicts.length} conflicts</li>
                {mergePreview.rejected.map((r) => <li key={r} className="warning-text">{r}</li>)}
                {mergePreview.conflicts.map((c) => (
                  <li key={c.id} className="warning-text">Conflict: {c.title} — {c.reason}</li>
                ))}
              </ul>
            )}
            <div className="button-row">
              <button
                type="button"
                onClick={() => void handleConfirmImport()}
                disabled={mergePreview !== null && mergePreview.conflicts.length > 0}
              >
                Confirm {importMode}
              </button>
              <button type="button" className="secondary" onClick={() => { setPendingImport(null); setMergePreview(null); }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );

  function handleExportCsv() {
    if (!data) return;
    const nodesCsv = nodesToCsv(data);
    const blob = new Blob([nodesCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nodes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportRelCsv() {
    if (!data) return;
    const csv = relationshipsToCsv(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relationships.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}
