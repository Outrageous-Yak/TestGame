import { useMemo } from 'react';
import { useAppStore } from '@/app/providers/store';
import { runValidation } from '@/application/services/validationService';

export function ValidationPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const selectNode = useAppStore((s) => s.selectNode);

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

  const byCode = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.code] = (acc[f.code] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page">
      <header className="page-header">
        <h1>Validation</h1>
        <span className="badge">{findings.length} findings</span>
      </header>

      {findings.length === 0 ? (
        <p className="empty-state">No validation issues detected.</p>
      ) : (
        <>
          <section className="card summary-chips">
            {Object.entries(byCode).map(([code, count]) => (
              <span key={code} className="badge warning">{code}: {count}</span>
            ))}
          </section>
          <ul className="finding-list">
            {findings.map((f) => (
              <li key={f.id} className="finding-card card">
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
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
