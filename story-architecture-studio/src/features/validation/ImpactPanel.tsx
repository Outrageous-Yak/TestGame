import { useMemo } from 'react';
import { useAppStore } from '@/app/providers/store';
import { analyzeNodeImpact } from '@/application/services/historyService';

export function ImpactPanel({ nodeId }: { nodeId: string }) {
  const currentProject = useAppStore((s) => s.currentProject);

  const report = useMemo(() => {
    if (!currentProject) return null;
    return analyzeNodeImpact(currentProject, nodeId);
  }, [currentProject, nodeId]);

  if (!report) return null;

  if (report.warnings.length === 0) {
    return (
      <section>
        <h3>Impact analysis</h3>
        <p className="hint">No significant dependencies detected.</p>
      </section>
    );
  }

  return (
    <section>
      <h3>Impact analysis</h3>
      <ul className="impact-warnings">
        {report.warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      {report.dependentNodeTitles.length > 0 && (
        <p className="hint">Connected nodes: {report.dependentNodeTitles.join(', ')}</p>
      )}
      {report.pageAssignments.length > 0 && (
        <ul className="link-list">
          {report.pageAssignments.map((p) => (
            <li key={p.pageId}>Issue {p.issueNumber}, page {p.pageNumber}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
