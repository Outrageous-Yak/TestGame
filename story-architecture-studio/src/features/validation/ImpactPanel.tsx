import { useMemo, useState } from 'react';
import { useAppStore } from '@/app/providers/store';
import { analyzeNodeImpact, simulateRevealMove } from '@/application/services/historyService';

export function ImpactPanel({ nodeId }: { nodeId: string }) {
  const currentProject = useAppStore((s) => s.currentProject);
  const applyRevealMove = useAppStore((s) => s.applyRevealMove);
  const [targetIssue, setTargetIssue] = useState('1');
  const [simulation, setSimulation] = useState<ReturnType<typeof simulateRevealMove>>(null);

  const report = useMemo(() => {
    if (!currentProject) return null;
    return analyzeNodeImpact(currentProject, nodeId);
  }, [currentProject, nodeId]);

  if (!report) return null;

  const issueOptions = currentProject?.issues.map((i) => i.number) ?? [];

  const handleSimulate = () => {
    if (!currentProject) return;
    const issueNum = Number.parseInt(targetIssue, 10);
    if (Number.isNaN(issueNum)) return;
    setSimulation(simulateRevealMove(currentProject, nodeId, issueNum));
  };

  const handleApply = () => {
    const issueNum = Number.parseInt(targetIssue, 10);
    if (Number.isNaN(issueNum)) return;
    void applyRevealMove(nodeId, issueNum).then(() => setSimulation(null));
  };

  return (
    <section>
      <h3>Impact analysis</h3>
      {report.warnings.length === 0 ? (
        <p className="hint">No significant dependencies detected.</p>
      ) : (
        <ul className="impact-warnings">
          {report.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
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

      <h4>Move across issues</h4>
      <div className="inline-form">
        <label>
          Target issue
          <select value={targetIssue} onChange={(e) => setTargetIssue(e.target.value)}>
            {issueOptions.map((n) => (
              <option key={n} value={n}>Issue {n}</option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary" onClick={handleSimulate}>Simulate move</button>
        {simulation && (
          <button type="button" onClick={handleApply} disabled={simulation.warnings.some((w) => w.includes('does not exist'))}>
            Apply move
          </button>
        )}
      </div>

      {simulation && (
        <div className="import-preview">
          <p>
            Move <strong>{simulation.nodeTitle}</strong>
            {simulation.fromIssue !== null ? ` from issue ${simulation.fromIssue}` : ''} → issue {simulation.targetIssue}
          </p>
          {simulation.pageChanges.length > 0 && (
            <ul className="merge-summary">
              {simulation.pageChanges.map((c, i) => (
                <li key={`${c.issueNumber}-${c.pageNumber}-${i}`}>
                  {c.action === 'remove' ? 'Remove from' : 'Add to'} issue {c.issueNumber}, page {c.pageNumber}
                </li>
              ))}
            </ul>
          )}
          {simulation.readerStateChanges.length > 0 && (
            <p className="hint">{simulation.readerStateChanges.length} reader knowledge record(s) would move</p>
          )}
          {simulation.warnings.length > 0 && (
            <ul className="impact-warnings">
              {simulation.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <p className="meta">
            Validation delta: +{simulation.newValidationCount} new, −{simulation.resolvedValidationCount} resolved
          </p>
        </div>
      )}
    </section>
  );
}
