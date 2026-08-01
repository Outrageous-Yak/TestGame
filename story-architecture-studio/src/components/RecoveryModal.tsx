import type { Snapshot } from '@/domain/types';

interface RecoveryModalProps {
  snapshot: Snapshot;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RecoveryModal({ snapshot, onRestore, onDiscard }: RecoveryModalProps) {
  return (
    <div className="recovery-overlay" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
      <div className="recovery-modal card">
        <h2 id="recovery-title">Recover unsaved work?</h2>
        <p>
          A recovery checkpoint from {new Date(snapshot.createdAt).toLocaleString()} was found.
          The app may have closed before the last save completed.
        </p>
        <div className="button-row">
          <button type="button" onClick={onRestore}>Restore recovered version</button>
          <button type="button" className="secondary" onClick={onDiscard}>Discard and keep current</button>
        </div>
      </div>
    </div>
  );
}
