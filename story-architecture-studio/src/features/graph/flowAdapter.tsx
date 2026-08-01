import { type NodeProps } from '@xyflow/react';
import type { Edge, Node as FlowNode } from '@xyflow/react';
import type { GraphEdgeVm, GraphNodeVm } from '@/application/viewModels/graphViewModel';

const CANON_COLORS: Record<string, string> = {
  CANON: '#2f5d50',
  ADAPTATION: '#3d6b8c',
  PROPOSED: '#8a6d1d',
  CONFLICTED: '#8b2e2e',
  RETIRED: '#6b6358',
};

export function StoryNode({ data }: NodeProps) {
  const d = data as { label: string; nodeType: string; canonStatus: string };
  return (
    <div className="flow-node-label">
      <div className="flow-node-title">{d.label}</div>
      <div className="flow-node-meta">
        <span>{d.nodeType}</span>
        <span>{d.canonStatus}</span>
      </div>
    </div>
  );
}

export const flowNodeTypes = { story: StoryNode };

export function toFlowNodes(vms: GraphNodeVm[]): FlowNode[] {
  return vms.map((n) => ({
    id: n.id,
    type: 'story',
    position: { x: n.x, y: n.y },
    data: { label: n.label, nodeType: n.nodeType, canonStatus: n.canonStatus },
    style: {
      borderColor: CANON_COLORS[n.canonStatus] ?? '#d9d2c7',
      borderWidth: 2,
      borderRadius: 8,
      padding: 8,
      fontSize: 12,
      background: '#fff',
      width: 180,
    },
  }));
}

export function toFlowEdges(vms: GraphEdgeVm[]): Edge[] {
  return vms.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    style: { stroke: '#6b6358' },
    labelStyle: { fontSize: 10, fill: '#6b6358' },
  }));
}
