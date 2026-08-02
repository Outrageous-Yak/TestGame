import type { CSSProperties } from 'react';
import { useAppStore } from '@/app/providers/store';

export function CueBoardPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const assignCueClip = useAppStore((s) => s.assignCueClip);
  const updateCueLabel = useAppStore((s) => s.updateCueLabel);
  const fireCue = useAppStore((s) => s.fireCue);

  if (!currentProject) {
    return (
      <div className="page">
        <p className="muted">Create or open a project from the Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="page cue-page">
      <header className="page-header">
        <h1>Cue Board</h1>
        <p className="muted">Trigger SFX cues for playtesting — click a pad to fire its assigned clip.</p>
      </header>

      <div className="cue-grid">
        {currentProject.cueSlots.map((cue) => {
          const clip = currentProject.clips.find((c) => c.id === cue.clipId);
          return (
            <div key={cue.id} className="cue-pad" style={{ '--cue-color': cue.color } as CSSProperties}>
              <button
                type="button"
                className="cue-fire"
                disabled={!cue.clipId}
                onClick={() => void fireCue(cue.id)}
                title={clip ? `Fire ${clip.name}` : 'No clip assigned'}
              >
                <span className="cue-label">{cue.label}</span>
                {clip && <span className="cue-clip-name">{clip.name}</span>}
              </button>
              <input
                className="cue-label-edit"
                type="text"
                value={cue.label}
                onChange={(e) => void updateCueLabel(cue.id, e.target.value)}
                aria-label="Cue label"
              />
              <select
                value={cue.clipId ?? ''}
                onChange={(e) => void assignCueClip(cue.id, e.target.value || null)}
                aria-label="Assign clip"
              >
                <option value="">— Clip —</option>
                {currentProject.clips.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
