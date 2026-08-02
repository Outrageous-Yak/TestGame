import { useState } from 'react';
import { useAppStore } from '@/app/providers/store';

export function DashboardPage() {
  const projects = useAppStore((s) => s.projects);
  const currentProject = useAppStore((s) => s.currentProject);
  const createNewProject = useAppStore((s) => s.createNewProject);
  const openProject = useAppStore((s) => s.openProject);
  const removeProject = useAppStore((s) => s.removeProject);
  const updateProjectMeta = useAppStore((s) => s.updateProjectMeta);

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = () => {
    const name = newName.trim() || 'Untitled Sound Project';
    void createNewProject(name, newDesc.trim());
    setNewName('');
    setNewDesc('');
  };

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">Manage sound projects for your game and story worlds.</p>
      </header>

      <section className="card">
        <h2>New project</h2>
        <div className="form-row">
          <input
            type="text"
            placeholder="Project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <button type="button" onClick={handleCreate}>Create</button>
        </div>
      </section>

      {currentProject && (
        <section className="card">
          <h2>Current project</h2>
          <div className="form-stack">
            <label>
              Name
              <input
                type="text"
                value={currentProject.name}
                onChange={(e) => void updateProjectMeta(e.target.value, currentProject.description)}
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={currentProject.description}
                onChange={(e) => void updateProjectMeta(currentProject.name, e.target.value)}
              />
            </label>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-value">{currentProject.clips.length}</span>
              <span className="stat-label">Clips</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {currentProject.mixerLayers.filter((l) => l.clipId).length}
              </span>
              <span className="stat-label">Mixer assignments</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {currentProject.cueSlots.filter((c) => c.clipId).length}
              </span>
              <span className="stat-label">Active cues</span>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <h2>All projects</h2>
        {projects.length === 0 ? (
          <p className="muted">No projects yet. Create one above.</p>
        ) : (
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id} className={currentProject?.id === p.id ? 'active' : ''}>
                <button type="button" className="project-open" onClick={() => void openProject(p.id)}>
                  <strong>{p.name}</strong>
                  <span className="muted">{p.clips.length} clips</span>
                </button>
                <button
                  type="button"
                  className="secondary small danger"
                  onClick={() => void removeProject(p.id)}
                  title="Delete project"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
