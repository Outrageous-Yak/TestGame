import { useMemo, useState } from 'react';
import { useAppStore } from '@/app/providers/store';
import { NODE_TYPE_LABELS } from '@/domain/utils';
import type { NodeType } from '@/domain/types';
import { InspectorPanel } from '@/components/InspectorPanel';
import { getBacklinks } from '@/domain/validation/rules';

const NODE_TYPES = Object.keys(NODE_TYPE_LABELS) as NodeType[];

export function ExplorerPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const getFilteredNodes = useAppStore((s) => s.getFilteredNodes);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const setTypeFilter = useAppStore((s) => s.setTypeFilter);
  const createNode = useAppStore((s) => s.createNode);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<NodeType>('CHARACTER');

  const nodes = getFilteredNodes();
  const selectedNode = useAppStore((s) => s.getSelectedNode());

  const backlinks = useMemo(() => {
    if (!currentProject || !selectedNodeId) return { incoming: [], outgoing: [] };
    return getBacklinks(selectedNodeId, currentProject.relationships);
  }, [currentProject, selectedNodeId]);

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Explorer</h1>
        <p className="empty-state">Open or create a project from the Dashboard first.</p>
      </div>
    );
  }

  const handleCreateNode = async () => {
    if (!newTitle.trim()) return;
    await createNode(newType, newTitle.trim());
    setNewTitle('');
  };

  return (
    <div className="page explorer-layout">
      <div className="explorer-main">
        <header className="page-header">
          <h1>Explorer</h1>
          <div className="toolbar">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes…"
              aria-label="Search nodes"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as NodeType | 'ALL')}
              aria-label="Filter by node type"
            >
              <option value="ALL">All types</option>
              {NODE_TYPES.map((t) => (
                <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </header>

        <section className="create-node card">
          <h2>New node</h2>
          <div className="inline-form">
            <select value={newType} onChange={(e) => setNewType(e.target.value as NodeType)} aria-label="Node type">
              {NODE_TYPES.map((t) => (
                <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              aria-label="Node title"
            />
            <button type="button" onClick={() => void handleCreateNode()} disabled={!newTitle.trim()}>
              Add
            </button>
          </div>
        </section>

        <section className="node-list card">
          <h2>Nodes ({nodes.length})</h2>
          {nodes.length === 0 ? (
            <p className="empty-state">No nodes match the current filters.</p>
          ) : (
            <ul>
              {nodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className={selectedNodeId === node.id ? 'selected' : ''}
                    onClick={() => selectNode(node.id)}
                  >
                    <span className={`badge type-${node.type.toLowerCase()}`}>{NODE_TYPE_LABELS[node.type]}</span>
                    <span className="node-title">{node.title}</span>
                    <span className={`badge canon-${node.canonStatus.toLowerCase()}`}>{node.canonStatus}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <InspectorPanel
        node={selectedNode}
        backlinks={backlinks}
        allNodes={currentProject.nodes.filter((n) => !n.archivedAt)}
      />
    </div>
  );
}
