import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/app/providers/store';

export function DashboardPage() {
  const navigate = useNavigate();
  const projects = useAppStore((s) => s.projects);
  const currentProject = useAppStore((s) => s.currentProject);
  const createProject = useAppStore((s) => s.createProject);
  const createWalkProject = useAppStore((s) => s.createWalkProject);
  const openProject = useAppStore((s) => s.openProject);
  const [newName, setNewName] = useState('');

  const activeNodes = currentProject?.nodes.filter((n) => !n.archivedAt) ?? [];
  const activeRels = currentProject?.relationships.filter((r) => !r.archivedAt) ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject(newName.trim());
    setNewName('');
    navigate('/explorer');
  };

  return (
    <div className="page dashboard">
      <h1>Dashboard</h1>
      <p className="lede">
        Local-first narrative knowledge graph and comic planning workspace.
        One source of truth for characters, events, issues, and pages.
      </p>

      <section className="card-grid">
        <article className="card">
          <h2>Current project</h2>
          {currentProject ? (
            <>
              <p><strong>{currentProject.project.name}</strong></p>
              <ul className="stats">
                <li>{activeNodes.length} nodes</li>
                <li>{activeRels.length} relationships</li>
                <li>{currentProject.issues.length} issues</li>
              </ul>
              <button type="button" onClick={() => navigate('/explorer')}>Open Explorer</button>
            </>
          ) : (
            <p>No project open. Create one or load The Walk seed below.</p>
          )}
        </article>

        <article className="card">
          <h2>Create project</h2>
          <div className="inline-form">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              aria-label="New project name"
            />
            <button type="button" onClick={() => void handleCreate()} disabled={!newName.trim()}>
              Create
            </button>
          </div>
          <button type="button" className="secondary" onClick={() => void createWalkProject().then(() => navigate('/explorer'))}>
            Create The Walk seed project
          </button>
        </article>

        <article className="card">
          <h2>Recent projects</h2>
          {projects.length === 0 ? (
            <p className="empty-state">No saved projects yet.</p>
          ) : (
            <ul className="project-list">
              {projects.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => void openProject(p.id).then(() => navigate('/explorer'))}>
                    {p.name}
                  </button>
                  <span className="meta">{new Date(p.updatedAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2>Quick start</h2>
          <ol>
            <li>Create <strong>The Walk</strong> seed (32 issues included)</li>
            <li>Browse <strong>Explorer</strong> and <strong>Character Tree</strong></li>
            <li>Open <strong>Issue Board</strong> → plan Issue 1 pages</li>
            <li>Export production brief from page planner</li>
          </ol>
          {currentProject && (
            <button type="button" onClick={() => navigate('/issues')}>Go to Issue Board</button>
          )}
        </article>

        <article className="card">
          <h2>Phase status</h2>
          <ul className="phase-list">
            <li className="done">Phase 0–1 — Foundation &amp; persistence</li>
            <li className="done">Phase 2 — Explorer &amp; inspector</li>
            <li className="done">Phase 3 — Seven master trees</li>
            <li className="partial">Phase 4 — Mermaid &amp; timeline (no 2D graph yet)</li>
            <li className="done">Phase 5–7 — Issue board, planner, page brief export</li>
            <li className="partial">Phase 8–10 — Validation UI, backup hardening</li>
          </ul>
          <p className="hint">See STATUS.md for exact completion details.</p>
        </article>
      </section>
    </div>
  );
}
