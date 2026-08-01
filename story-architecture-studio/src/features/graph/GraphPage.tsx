import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  type Edge,
  type Node as FlowNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '@/app/providers/store';
import { buildGraphViewModel, findPath } from '@/application/viewModels/graphViewModel';
import { flowNodeTypes, toFlowEdges, toFlowNodes } from './flowAdapter';
import { NODE_TYPE_LABELS } from '@/domain/utils';
import type { CanonStatus, NodeType } from '@/domain/types';

const NODE_TYPES = Object.keys(NODE_TYPE_LABELS) as NodeType[];
const CANON_STATUSES: CanonStatus[] = ['CANON', 'ADAPTATION', 'PROPOSED', 'CONFLICTED', 'RETIRED'];

export function GraphPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);

  const [depth, setDepth] = useState(2);
  const [typeFilter, setTypeFilter] = useState<NodeType | 'ALL'>('ALL');
  const [canonFilter, setCanonFilter] = useState<CanonStatus | 'ALL'>('ALL');
  const [pathFrom, setPathFrom] = useState('');
  const [pathTo, setPathTo] = useState('');
  const [pathSearched, setPathSearched] = useState(false);
  const [pathResult, setPathResult] = useState<string[] | null>(null);

  const graphVm = useMemo(() => {
    if (!currentProject) return { nodes: [], edges: [] };
    return buildGraphViewModel(currentProject, {
      focusNodeId: selectedNodeId,
      depth,
      typeFilter,
      canonFilter,
    });
  }, [currentProject, selectedNodeId, depth, typeFilter, canonFilter]);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(toFlowNodes(graphVm.nodes));
    setEdges(toFlowEdges(graphVm.edges));
  }, [graphVm, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const nodeById = useMemo(
    () => new Map((currentProject?.nodes ?? []).map((n) => [n.id, n])),
    [currentProject?.nodes],
  );

  const handleFindPath = () => {
    if (!currentProject || !pathFrom || !pathTo) return;
    const path = findPath(currentProject, pathFrom, pathTo);
    setPathResult(path);
    setPathSearched(true);
    if (path?.[0]) selectNode(path[0]);
  };

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Graph</h1>
        <p className="empty-state">Open a project first.</p>
      </div>
    );
  }

  const activeNodeOptions = currentProject.nodes.filter((n) => !n.archivedAt);

  return (
    <div className="page graph-page">
      <header className="page-header">
        <h1>Relationship Graph</h1>
        <div className="toolbar">
          <label>
            Depth
            <input type="number" min={1} max={4} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
          </label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as NodeType | 'ALL')}>
            <option value="ALL">All types</option>
            {NODE_TYPES.map((t) => <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>)}
          </select>
          <select value={canonFilter} onChange={(e) => setCanonFilter(e.target.value as CanonStatus | 'ALL')}>
            <option value="ALL">All canon</option>
            {CANON_STATUSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </header>

      {selectedNodeId && (
        <p className="hint">Focused on: {nodeById.get(selectedNodeId)?.title ?? selectedNodeId}. Click a node to refocus.</p>
      )}

      {graphVm.nodes.length === 0 ? (
        <p className="empty-state">No nodes match the current filters.</p>
      ) : (
        <div className="graph-canvas card">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={flowNodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      )}

      <section className="card path-finder">
        <h2>Path between nodes</h2>
        <div className="inline-form">
          <select value={pathFrom} onChange={(e) => { setPathFrom(e.target.value); setPathSearched(false); }} aria-label="From node">
            <option value="">From…</option>
            {activeNodeOptions.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
          <select value={pathTo} onChange={(e) => { setPathTo(e.target.value); setPathSearched(false); }} aria-label="To node">
            <option value="">To…</option>
            {activeNodeOptions.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
          <button type="button" onClick={handleFindPath} disabled={!pathFrom || !pathTo}>Find path</button>
        </div>
        {pathSearched && pathResult && pathResult.length > 0 && (
          <p>Path: {pathResult.map((id) => nodeById.get(id)?.title ?? id).join(' → ')}</p>
        )}
        {pathSearched && !pathResult && (
          <p className="hint">No path found between those nodes.</p>
        )}
      </section>
    </div>
  );
}
