import { useState } from 'react';
import { useAppStore } from '@/app/providers/store';
import { NODE_TYPE_LABELS } from '@/domain/utils';
import type { Node, Relationship } from '@/domain/types';
import { ImpactPanel } from '@/features/validation/ImpactPanel';

interface InspectorPanelProps {
  node: Node | null;
  backlinks: { incoming: Relationship[]; outgoing: Relationship[] };
  allNodes: Node[];
}

export function InspectorPanel({ node, backlinks, allNodes }: InspectorPanelProps) {
  const updateNode = useAppStore((s) => s.updateNode);
  const createRelationship = useAppStore((s) => s.createRelationship);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState<Relationship['relationshipType']>('RELATED_TO');

  if (!node) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <p className="empty-state">Select a node to inspect its properties, links, and backlinks.</p>
      </aside>
    );
  }

  const nodeById = new Map(allNodes.map((n) => [n.id, n]));

  const handleSave = (field: keyof Node, value: string) => {
    void updateNode(node.id, { [field]: value });
  };

  const handleAddRelationship = () => {
    if (!relTarget) return;
    void createRelationship(node.id, relTarget, relType);
    setRelTarget('');
  };

  return (
    <aside className="inspector" aria-label="Inspector">
      <header>
        <h2>{node.title}</h2>
        <span className={`badge type-${node.type.toLowerCase()}`}>{NODE_TYPE_LABELS[node.type]}</span>
      </header>

      <section>
        <h3>Overview</h3>
        <label>
          Title
          <input
            type="text"
            defaultValue={node.title}
            onBlur={(e) => handleSave('title', e.target.value)}
          />
        </label>
        <label>
          Summary
          <textarea
            defaultValue={node.summary}
            onBlur={(e) => handleSave('summary', e.target.value)}
            rows={3}
          />
        </label>
        <label>
          Description
          <textarea
            defaultValue={node.description}
            onBlur={(e) => handleSave('description', e.target.value)}
            rows={4}
          />
        </label>
        <div className="meta-row">
          <span className={`badge canon-${node.canonStatus.toLowerCase()}`}>{node.canonStatus}</span>
          <span className="badge">{node.completionStatus}</span>
          <span className="badge">{node.importance}</span>
        </div>
      </section>

      <section>
        <h3>Relationships</h3>
        <div className="inline-form">
          <select value={relType} onChange={(e) => setRelType(e.target.value as Relationship['relationshipType'])}>
            <option value="RELATED_TO">Related to</option>
            <option value="APPEARS_IN">Appears in</option>
            <option value="PARTICIPATES_IN">Participates in</option>
            <option value="SUPPORTS_THEME">Supports theme</option>
            <option value="LEADS_TO">Leads to</option>
            <option value="FORESHADOWS">Foreshadows</option>
          </select>
          <select value={relTarget} onChange={(e) => setRelTarget(e.target.value)} aria-label="Target node">
            <option value="">Select target…</option>
            {allNodes.filter((n) => n.id !== node.id).map((n) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
          <button type="button" onClick={handleAddRelationship} disabled={!relTarget}>Link</button>
        </div>

        <h4>Outgoing ({backlinks.outgoing.length})</h4>
        <ul className="link-list">
          {backlinks.outgoing.map((rel) => (
            <li key={rel.id}>
              <span className="rel-type">{rel.relationshipType}</span>
              → {nodeById.get(rel.targetNodeId)?.title ?? rel.targetNodeId}
            </li>
          ))}
        </ul>

        <h4>Incoming ({backlinks.incoming.length})</h4>
        <ul className="link-list">
          {backlinks.incoming.map((rel) => (
            <li key={rel.id}>
              {nodeById.get(rel.sourceNodeId)?.title ?? rel.sourceNodeId}
              → <span className="rel-type">{rel.relationshipType}</span>
            </li>
          ))}
        </ul>
      </section>

      <ImpactPanel nodeId={node.id} />

      <section>
        <h3>Source</h3>
        <p className="hint">Source references and adaptation notes — Phase 2+</p>
      </section>
    </aside>
  );
}
