import { useRef } from 'react';
import { useAppStore } from '@/app/providers/store';
import { downloadJson, parseImportJson } from '@/infrastructure/importExport';
import { nodesToCsv, relationshipsToCsv } from '@/infrastructure/importExport';

export function ImportExportPage() {
  const currentProject = useAppStore((s) => s.exportCurrentProject);
  const importProjectData = useAppStore((s) => s.importProjectData);
  const fileRef = useRef<HTMLInputElement>(null);

  const data = currentProject();

  const handleExportJson = () => {
    if (!data) return;
    downloadJson(data, `${data.project.name.replace(/\s+/g, '-').toLowerCase()}.json`);
  };

  const handleExportCsv = () => {
    if (!data) return;
    const nodesCsv = nodesToCsv(data);
    const blob = new Blob([nodesCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nodes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const parsed = parseImportJson(text);
    await importProjectData(parsed);
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
            <button type="button" onClick={handleExportJson}>Export project JSON</button>
            <button type="button" className="secondary" onClick={handleExportCsv}>Export nodes CSV</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (!data) return;
                const csv = relationshipsToCsv(data);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'relationships.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export relationships CSV
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Import</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
          }}
          aria-label="Import project JSON"
        />
        <p className="hint">Import replaces the current project data after validation. A snapshot is created first.</p>
      </section>
    </div>
  );
}
