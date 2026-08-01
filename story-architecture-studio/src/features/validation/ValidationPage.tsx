import { useMemo, useState } from 'react';
import { useAppStore } from '@/app/providers/store';
import { runValidation } from '@/application/services/validationService';

export function ValidationPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const selectNode = useAppStore((s) => s.selectNode);
  const dismissFinding = useAppStore((s) => s.dismissFinding);
  const [dismissReason, setDismissReason] = useState<Record<string, string>>({});

  const findings = useMemo(
    () => (currentProject ? runValidation(currentProject) : []),
    [currentProject],
  );

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Validation</h1>
        <p className="empty-state">Open a project first.</p>
      </div>
    );
  }

  const dismissedCount = (currentProject.validationFindings ?? []).filter((f) => f.dismissed).length;

  const byCode = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.code] = (acc[f.code] ?? 0) + 1;
    return acc;
  }, {});

  const fingerprint = (code: string, nodeIds: string[]) => `${code}:${nodeIds.join(',')}`;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Validation</h1>
        <div className="meta-row">
          <span className="badge">{findings.length} active</span>
          {dismissedCount > 0 && <span className="badge">{dismissedCount} dismissed</span>}
        </div>
      </header>

      {findings.length === 0 ? (
        <p className="empty-state">No active validation issues{dismissedCount > 0 ? ` (${dismissedCount} dismissed)` : ''}.</p>
      ) : (
        <>
          <section className="card summary-chips">
            {Object.entries(byCode).map(([code, count]) => (
              <span key={code} className="badge warning">{code}: {count}</span>
            ))}
          </section>
          <ul className="finding-list">
            {findings.map((f) => {
              const fp = fingerprint(f.code, f.nodeIds);
              return (
                <li key={fp} className="finding-card card">
                  <span className="badge warning">{f.code}</span>
                  <p>{f.message}</p>
                  {f.nodeIds.length > 0 && (
                    <div className="button-row">
                      {f.nodeIds.map((id) => (
                        <button key={id} type="button" className="secondary small" onClick={() => selectNode(id)}>
                          Jump to node
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="inline-form dismiss-form">
                    <input
                      type="text"
                      placeholder="Dismiss reason (optional)"
                      value={dismissReason[fp] ?? ''}
                      onChange={(e) => setDismissReason((prev) => ({ ...prev, [fp]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => void dismissFinding(f, dismissReason[fp] ?? 'Dismissed by user')}
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
