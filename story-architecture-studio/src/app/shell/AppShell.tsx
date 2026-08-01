import { NavLink, Outlet } from 'react-router-dom';
import { useAppStore } from '@/app/providers/store';

export function AppShell() {
  const currentProject = useAppStore((s) => s.currentProject);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <strong>Story Architecture Studio</strong>
          {currentProject && <span className="project-name">{currentProject.project.name}</span>}
        </div>
        <div className="header-actions">
          {loading && <span className="status-pill">Saving…</span>}
          <span className="status-pill saved">Local · Autosaved</span>
        </div>
      </header>

      <div className="app-body">
        <nav className="sidebar" aria-label="Main navigation">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/explorer">Explorer</NavLink>
          <NavLink to="/mermaid">Mermaid</NavLink>
          <NavLink to="/import-export">Import / Export</NavLink>
          <div className="nav-section">Trees</div>
          <span className="nav-disabled" title="Phase 3">Story Tree</span>
          <span className="nav-disabled" title="Phase 3">Character Tree</span>
          <span className="nav-disabled" title="Phase 3">Reader Tree</span>
          <span className="nav-disabled" title="Phase 3">World Tree</span>
          <span className="nav-disabled" title="Phase 3">Mythology Tree</span>
          <span className="nav-disabled" title="Phase 3">Creature Tree</span>
          <span className="nav-disabled" title="Phase 3">Adaptation Tree</span>
          <div className="nav-section">Planning</div>
          <span className="nav-disabled" title="Phase 5">Issue Board</span>
          <span className="nav-disabled" title="Phase 6">Issue Planner</span>
          <span className="nav-disabled" title="Phase 4">Graph</span>
          <span className="nav-disabled" title="Phase 4">Timeline</span>
          <span className="nav-disabled" title="Phase 8">Validation</span>
        </nav>

        <main className="workspace">
          {error && <div className="error-banner" role="alert">{error}</div>}
          <Outlet />
        </main>
      </div>

      <footer className="app-footer">
        <span>v0.1 — Phase 0–2 foundation</span>
        <span>{currentProject ? `${currentProject.nodes.filter((n) => !n.archivedAt).length} nodes` : 'No project open'}</span>
      </footer>
    </div>
  );
}
