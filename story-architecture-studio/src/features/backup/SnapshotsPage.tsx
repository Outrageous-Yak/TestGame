import { useEffect, useState } from 'react';
import { useAppStore } from '@/app/providers/store';
import type { Snapshot } from '@/domain/types';

export function SnapshotsPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const listSnapshots = useAppStore((s) => s.listSnapshots);
  const createSnapshot = useAppStore((s) => s.createSnapshot);
  const restoreSnapshot = useAppStore((s) => s.restoreSnapshot);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!currentProject) return;
    void listSnapshots().then(setSnapshots);
  }, [currentProject, listSnapshots]);

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Snapshots &amp; Recovery</h1>
        <p className="empty-state">Open a project first.</p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createSnapshot(name.trim());
    setName('');
    setSnapshots(await listSnapshots());
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Snapshots &amp; Recovery</h1>
      </header>
      <p className="lede">Named snapshots and automatic backups before import, delete, and restore operations.</p>

      <section className="card">
        <h2>Create snapshot</h2>
        <div className="inline-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Snapshot name"
            aria-label="Snapshot name"
          />
          <button type="button" onClick={() => void handleCreate()} disabled={!name.trim()}>
            Save snapshot
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Saved snapshots ({snapshots.length})</h2>
        {snapshots.length === 0 ? (
          <p className="empty-state">No snapshots yet. Snapshots are also created automatically before imports and restores.</p>
        ) : (
          <ul className="snapshot-list">
            {snapshots.map((s) => (
              <li key={s.id} className="snapshot-card">
                <div>
                  <strong>{s.name}</strong>
                  <span className="badge">{s.reason}</span>
                  <p className="meta">{new Date(s.createdAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void restoreSnapshot(s.id).then(() => listSnapshots().then(setSnapshots))}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
