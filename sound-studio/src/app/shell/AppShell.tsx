import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '@/app/providers/store';
import { NavLinks } from './NavLinks';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('ss-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppShell() {
  const currentProject = useAppStore((s) => s.currentProject);
  const loading = useAppStore((s) => s.loading);
  const saving = useAppStore((s) => s.saving);
  const error = useAppStore((s) => s.error);
  const stopAll = useAppStore((s) => s.stopAll);

  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ss-theme', theme);
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
          <strong>Sound Studio</strong>
          {currentProject && <span className="project-name">{currentProject.name}</span>}
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
          <button type="button" className="secondary small" onClick={() => stopAll()} title="Stop all playback">
            ⏹ Stop
          </button>
          {saving && <span className="status-pill">Saving…</span>}
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
          {loading && !currentProject ? (
            <div className="loading-state">Loading projects…</div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      <footer className="app-footer">
        <span>v1.0</span>
        <span>
          {currentProject
            ? `${currentProject.clips.length} clips · ${currentProject.cueSlots.filter((c) => c.clipId).length} cues`
            : 'No project open'}
        </span>
      </footer>
    </div>
  );
}
