import { useState } from 'react';
import type { TreeNodeVm } from '@/application/viewModels/treeBuilders';

interface TreeViewProps {
  nodes: TreeNodeVm[];
  onSelectNode?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
}

function TreeBranch({
  node,
  depth,
  onSelectNode,
  selectedNodeId,
  focusId,
}: {
  node: TreeNodeVm;
  depth: number;
  onSelectNode?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  focusId: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isFocused = focusId === node.id;
  const hidden = focusId !== null && !isFocused && !isUnderFocus(node, focusId);

  if (hidden) return null;

  return (
    <li className="tree-branch">
      <div className={`tree-row depth-${depth} ${selectedNodeId === node.nodeId ? 'selected' : ''}`}>
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="tree-toggle spacer" />
        )}
        <button
          type="button"
          className="tree-node-btn"
          onClick={() => onSelectNode?.(node.nodeId)}
        >
          <span className="badge">{node.nodeType}</span>
          <span className="tree-label">{node.label}</span>
          <span className={`badge canon-${node.canonStatus.toLowerCase()}`}>{node.canonStatus}</span>
          {node.linkCount > 0 && <span className="meta">{node.linkCount} links</span>}
        </button>
        <button
          type="button"
          className="tree-focus-btn secondary"
          title="Focus branch"
          onClick={() => onSelectNode?.(node.nodeId)}
        >
          Focus
        </button>
      </div>
      {node.summary && <p className="tree-summary">{node.summary}</p>}
      {hasChildren && expanded && (
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelectNode={onSelectNode}
              selectedNodeId={selectedNodeId}
              focusId={focusId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function isUnderFocus(node: TreeNodeVm, focusId: string): boolean {
  if (node.id === focusId) return true;
  return node.children.some((c) => isUnderFocus(c, focusId));
}

export function TreeView({ nodes, onSelectNode, selectedNodeId }: TreeViewProps) {
  const [focusId, setFocusId] = useState<string | null>(null);

  if (nodes.length === 0) {
    return <p className="empty-state">No nodes match this tree view. Add nodes and relationships in Explorer.</p>;
  }

  return (
    <div className="tree-view">
      <div className="tree-toolbar">
        <button type="button" className="secondary" onClick={() => setFocusId(null)} disabled={!focusId}>
          Clear focus
        </button>
      </div>
      <ul className="tree-root">
        {nodes.map((node) => (
          <TreeBranch
            key={node.id}
            node={node}
            depth={0}
            onSelectNode={(id) => {
              if (id) setFocusId(node.id);
              onSelectNode?.(id);
            }}
            selectedNodeId={selectedNodeId}
            focusId={focusId}
          />
        ))}
      </ul>
    </div>
  );
}
