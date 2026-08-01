import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '@/app/providers/store';
import { NavLinks } from './NavLinks';
import { RecoveryModal } from '@/components/RecoveryModal';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('sas-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppShell() {
  const currentProject = useAppStore((s) => s.currentProject);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const canUndo = useAppStore((s) => s.canUndo);
  const canRedo = useAppStore((s) => s.canRedo);
  const pendingRecovery = useAppStore((s) => s.pendingRecovery);
  const acceptRecovery = useAppStore((s) => s.acceptRecovery);
  const discardRecovery = useAppStore((s) => s.discardRecovery);

  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('sas-theme', theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <button
            type="button"
            className="nav-toggle secondary small"
            onClick={() => setNavOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
          >
            ☰
          </button>
          <strong>Story Architecture Studio</strong>
          {currentProject && <span className="project-name">{currentProject.project.name}</span>}
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary small"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            title="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button type="button" className="secondary small header-undo" onClick={() => void undo()} disabled={!canUndo()} title="Undo">↶</button>
          <button type="button" className="secondary small header-undo" onClick={() => void redo()} disabled={!canRedo()} title="Redo">↷</button>
          {loading && <span className="status-pill">Saving…</span>}
          <span className="status-pill saved">Local · Autosaved</span>
        </div>
      </header>

      {navOpen && (
        <button
          type="button"
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="app-body">
        <nav className={`sidebar ${navOpen ? 'open' : ''}`} aria-label="Main navigation">
          <NavLinks onNavigate={() => setNavOpen(false)} />
        </nav>

        <main className="workspace">
          {error && <div className="error-banner" role="alert">{error}</div>}
          <Outlet />
        </main>
      </div>

      <footer className="app-footer">
        <span>v0.1</span>
        <span>
          {currentProject
            ? `${currentProject.nodes.filter((n) => !n.archivedAt).length} nodes · ${currentProject.issues.length} issues`
            : 'No project open'}
        </span>
      </footer>

      {pendingRecovery && (
        <RecoveryModal
          snapshot={pendingRecovery}
          onRestore={() => void acceptRecovery()}
          onDiscard={() => void discardRecovery()}
        />
      )}
    </div>
  );
}
