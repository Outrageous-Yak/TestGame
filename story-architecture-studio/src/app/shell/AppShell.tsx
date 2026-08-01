import { NavLink, Outlet } from 'react-router-dom';
import { useAppStore } from '@/app/providers/store';

export function AppShell() {
  const currentProject = useAppStore((s) => s.currentProject);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const canUndo = useAppStore((s) => s.canUndo);
  const canRedo = useAppStore((s) => s.canRedo);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <strong>Story Architecture Studio</strong>
          {currentProject && <span className="project-name">{currentProject.project.name}</span>}
        </div>
        <div className="header-actions">
          <button type="button" className="secondary small" onClick={() => void undo()} disabled={!canUndo()} title="Undo">↶ Undo</button>
          <button type="button" className="secondary small" onClick={() => void redo()} disabled={!canRedo()} title="Redo">↷ Redo</button>
          {loading && <span className="status-pill">Saving…</span>}
          <span className="status-pill saved">Local · Autosaved</span>
        </div>
      </header>

      <div className="app-body">
        <nav className="sidebar" aria-label="Main navigation">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/explorer">Explorer</NavLink>
          <NavLink to="/graph">Graph</NavLink>
          <NavLink to="/issues">Issue Board</NavLink>
          <NavLink to="/reader-knowledge">Reader Knowledge</NavLink>
          <NavLink to="/timeline">Timeline</NavLink>
          <NavLink to="/mermaid">Mermaid</NavLink>
          <NavLink to="/validation">Validation</NavLink>
          <NavLink to="/snapshots">Snapshots</NavLink>
          <NavLink to="/import-export">Import / Export</NavLink>
          <div className="nav-section">Trees</div>
          <NavLink to="/trees/story">Story Tree</NavLink>
          <NavLink to="/trees/character">Character Tree</NavLink>
          <NavLink to="/trees/reader">Reader Tree</NavLink>
          <NavLink to="/trees/world">World Tree</NavLink>
          <NavLink to="/trees/mythology">Mythology Tree</NavLink>
          <NavLink to="/trees/creature">Creature Tree</NavLink>
          <NavLink to="/trees/adaptation">Adaptation Tree</NavLink>
        </nav>

        <main className="workspace">
          {error && <div className="error-banner" role="alert">{error}</div>}
          <Outlet />
        </main>
      </div>

      <footer className="app-footer">
        <span>v0.1 — Phase 8–9</span>
        <span>
          {currentProject
            ? `${currentProject.nodes.filter((n) => !n.archivedAt).length} nodes · ${currentProject.issues.length} issues`
            : 'No project open'}
        </span>
      </footer>
    </div>
  );
}
