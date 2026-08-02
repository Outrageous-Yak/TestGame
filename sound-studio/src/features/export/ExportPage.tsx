import { useAppStore } from '@/app/providers/store';

export function ExportPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const exportManifest = useAppStore((s) => s.exportManifest);

  if (!currentProject) {
    return (
      <div className="page">
        <p className="muted">Create or open a project from the Dashboard.</p>
      </div>
    );
  }

  const manifest = exportManifest();

  const handleDownload = () => {
    const blob = new Blob([manifest], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.replace(/\s+/g, '_')}_sound_manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page export-page">
      <header className="page-header">
        <h1>Export</h1>
        <p className="muted">Download a JSON manifest for game integration. Audio blobs stay in local IndexedDB.</p>
      </header>

      <section className="card">
        <div className="form-row">
          <button type="button" onClick={handleDownload}>Download manifest</button>
        </div>
        <pre className="manifest-preview">{manifest}</pre>
      </section>
    </div>
  );
}
