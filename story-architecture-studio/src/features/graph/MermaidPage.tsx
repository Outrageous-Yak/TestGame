import { useMemo } from 'react';
import { useAppStore } from '@/app/providers/store';
import { generateMermaid } from '@/infrastructure/importExport';

export function MermaidPage() {
  const currentProject = useAppStore((s) => s.currentProject);

  const mermaidSource = useMemo(() => {
    if (!currentProject) return '';
    return generateMermaid(currentProject);
  }, [currentProject]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mermaidSource);
  };

  if (!currentProject) {
    return (
      <div className="page">
        <h1>Mermaid</h1>
        <p className="empty-state">Open a project to generate a diagram.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Mermaid Diagram</h1>
        <button type="button" onClick={() => void handleCopy()}>Copy source</button>
      </header>
      <p className="lede">Generated from canonical relationships. Trees and filters arrive in Phase 4.</p>
      <pre className="mermaid-output" aria-label="Mermaid diagram source">{mermaidSource}</pre>
    </div>
  );
}
