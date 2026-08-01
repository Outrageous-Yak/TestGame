import { useMemo } from 'react';
import { useAppStore } from '@/app/providers/store';
import { generateEditorialReports, nodeTitles } from '@/application/services/reportsService';

export function ReportsPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const selectNode = useAppStore((s) => s.selectNode);

  const reports = useMemo(
    () => (currentProject ? generateEditorialReports(currentProject) : []),
    [currentProject],
  );

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Editorial Reports</h1>
        <p className="empty-state">Open a project first.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Editorial Reports</h1>
        <span className="badge">{reports.length} reports</span>
      </header>
      <p className="lede">Analysis reports generated from canonical project data.</p>

      {reports.length === 0 ? (
        <p className="empty-state">No editorial issues detected.</p>
      ) : (
        <ul className="finding-list">
          {reports.map((report) => (
            <li key={report.id} className="finding-card card">
              <span className={`badge ${report.severity === 'warning' ? 'warning' : ''}`}>{report.severity}</span>
              <h3>{report.title}</h3>
              <p>{report.description}</p>
              {report.nodeIds.length > 0 && (
                <div className="chip-tray">
                  {nodeTitles(currentProject, report.nodeIds.slice(0, 12)).map((title, i) => (
                    <button
                      key={report.nodeIds[i]}
                      type="button"
                      className="chip"
                      onClick={() => selectNode(report.nodeIds[i] ?? null)}
                    >
                      {title}
                    </button>
                  ))}
                  {report.nodeIds.length > 12 && (
                    <span className="meta">+{report.nodeIds.length - 12} more</span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
