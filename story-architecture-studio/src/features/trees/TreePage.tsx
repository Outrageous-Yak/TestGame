import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/app/providers/store';
import { buildTree, getTreeLabel, type TreeKind } from '@/application/viewModels/treeBuilders';
import { TreeView } from './TreeView';
import { generateMermaid } from '@/infrastructure/importExport';

const VALID_KINDS: TreeKind[] = ['story', 'character', 'reader', 'world', 'mythology', 'creature', 'adaptation'];

export function TreePage() {
  const { kind } = useParams<{ kind: string }>();
  const navigate = useNavigate();
  const currentProject = useAppStore((s) => s.currentProject);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const selectNode = useAppStore((s) => s.selectNode);

  const treeKind = VALID_KINDS.includes(kind as TreeKind) ? (kind as TreeKind) : 'story';
  const tree = useMemo(
    () => (currentProject ? buildTree(currentProject, treeKind) : []),
    [currentProject, treeKind],
  );

  const mermaid = useMemo(() => {
    if (!currentProject || !selectedNodeId) return '';
    return generateMermaid(currentProject, [selectedNodeId]);
  }, [currentProject, selectedNodeId]);

  if (!currentProject) {
    return (
      <div className="page">
        <h1>{getTreeLabel(treeKind)}</h1>
        <p className="empty-state">Open a project first.</p>
      </div>
    );
  }

  return (
    <div className="page tree-page">
      <header className="page-header">
        <h1>{getTreeLabel(treeKind)}</h1>
        <button type="button" className="secondary" onClick={() => navigate('/explorer')}>
          Open in Explorer
        </button>
      </header>
      <p className="lede">Generated from canonical nodes and relationships. No separate tree storage.</p>

      <div className="tree-layout">
        <section className="card tree-panel">
          <TreeView
            nodes={tree}
            selectedNodeId={selectedNodeId}
            onSelectNode={selectNode}
          />
        </section>
        {selectedNodeId && mermaid && (
          <section className="card">
            <h2>Branch Mermaid</h2>
            <pre className="mermaid-output">{mermaid}</pre>
          </section>
        )}
      </div>
    </div>
  );
}
