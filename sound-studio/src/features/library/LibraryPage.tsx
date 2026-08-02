import { useRef } from 'react';
import { useAppStore } from '@/app/providers/store';
import { CATEGORY_LABELS, type ClipCategory } from '@/domain/types';

const CATEGORIES: ClipCategory[] = ['ambient', 'music', 'sfx', 'voice', 'ui'];

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function LibraryPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const importClip = useAppStore((s) => s.importClip);
  const deleteClip = useAppStore((s) => s.deleteClip);
  const updateClip = useAppStore((s) => s.updateClip);
  const fileRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  if (!currentProject) {
    return (
      <div className="page">
        <p className="muted">Create or open a project from the Dashboard.</p>
      </div>
    );
  }

  const handleImport = async (files: FileList | null) => {
    if (!files?.length) return;
    const category = (categoryRef.current?.value ?? 'sfx') as ClipCategory;
    for (const file of Array.from(files)) {
      await importClip(file, category);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="page library-page">
      <header className="page-header">
        <h1>Library</h1>
        <p className="muted">Import and organize audio clips for this project.</p>
      </header>

      <section className="card import-card">
        <h2>Import audio</h2>
        <div className="form-row">
          <select ref={categoryRef} defaultValue="sfx" aria-label="Clip category">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={(e) => void handleImport(e.target.files)}
          />
        </div>
        <p className="hint">Supports MP3, WAV, OGG, and other browser-decodable formats.</p>
      </section>

      <section className="card">
        <h2>Clips ({currentProject.clips.length})</h2>
        {currentProject.clips.length === 0 ? (
          <p className="muted">No clips imported yet.</p>
        ) : (
          <div className="clip-table">
            {currentProject.clips.map((clip) => (
              <div key={clip.id} className="clip-row">
                <input
                  className="clip-name"
                  type="text"
                  value={clip.name}
                  onChange={(e) => void updateClip(clip.id, { name: e.target.value })}
                />
                <select
                  value={clip.category}
                  onChange={(e) => void updateClip(clip.id, { category: e.target.value as ClipCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <span className="clip-duration">{formatDuration(clip.durationSec)}</span>
                <button
                  type="button"
                  className="secondary small danger"
                  onClick={() => void deleteClip(clip.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
