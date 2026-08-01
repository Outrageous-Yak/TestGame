import { useMemo } from 'react';
import { useAppStore } from '@/app/providers/store';

export function TimelinePage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const selectNode = useAppStore((s) => s.selectNode);

  const events = useMemo(() => {
    if (!currentProject) return [];
    return currentProject.nodes
      .filter((n) => !n.archivedAt && (n.type === 'EVENT' || n.type === 'SCENE' || n.type === 'CHAPTER'))
      .map((n) => ({
        node: n,
        chronology: (n.propertiesJson.chronologyOrder as number) ?? (n.propertiesJson.chronology as number) ?? n.sortOrder ?? 0,
        storyOrder: (n.propertiesJson.readingOrder as number) ?? n.sortOrder ?? 0,
      }))
      .sort((a, b) => a.chronology - b.chronology);
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Timeline</h1>
        <p className="empty-state">Open a project first.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Timeline</h1>
      <p className="lede">Chronology order from node properties. Story order shown for comparison.</p>

      {events.length === 0 ? (
        <p className="empty-state">No events, scenes, or chapters with chronology data yet.</p>
      ) : (
        <ol className="timeline">
          {events.map(({ node, chronology, storyOrder }) => (
            <li key={node.id} className="timeline-item card">
              <div className="meta-row">
                <span className="badge">{node.type}</span>
                <span className="meta">Chronology: {chronology}</span>
                <span className="meta">Story order: {storyOrder}</span>
                <span className={`badge canon-${node.canonStatus.toLowerCase()}`}>{node.canonStatus}</span>
              </div>
              <button type="button" className="timeline-title" onClick={() => selectNode(node.id)}>
                {node.title}
              </button>
              {node.summary && <p>{node.summary}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
