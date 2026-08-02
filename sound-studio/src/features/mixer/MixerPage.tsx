import { useAppStore } from '@/app/providers/store';
import { CATEGORY_LABELS } from '@/domain/types';

export function MixerPage() {
  const currentProject = useAppStore((s) => s.currentProject);
  const playingLayers = useAppStore((s) => s.playingLayers);
  const setLayerVolume = useAppStore((s) => s.setLayerVolume);
  const toggleLayerMute = useAppStore((s) => s.toggleLayerMute);
  const toggleLayerSolo = useAppStore((s) => s.toggleLayerSolo);
  const assignLayerClip = useAppStore((s) => s.assignLayerClip);
  const toggleLayerLoop = useAppStore((s) => s.toggleLayerLoop);
  const playLayer = useAppStore((s) => s.playLayer);
  const stopLayer = useAppStore((s) => s.stopLayer);

  if (!currentProject) {
    return (
      <div className="page">
        <p className="muted">Create or open a project from the Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="page mixer-page">
      <header className="page-header">
        <h1>Mixer</h1>
        <p className="muted">Layer ambient, music, and SFX with volume, mute, and solo controls.</p>
      </header>

      <div className="mixer-strip">
        {currentProject.mixerLayers.map((layer) => {
          const isPlaying = playingLayers.has(layer.id);
          const assignedClip = currentProject.clips.find((c) => c.id === layer.clipId);
          return (
            <section key={layer.id} className={`mixer-channel ${isPlaying ? 'playing' : ''}`}>
              <h3>{layer.label}</h3>

              <label className="channel-select">
                Clip
                <select
                  value={layer.clipId ?? ''}
                  onChange={(e) => void assignLayerClip(layer.id, e.target.value || null)}
                >
                  <option value="">— None —</option>
                  {currentProject.clips.map((clip) => (
                    <option key={clip.id} value={clip.id}>
                      {clip.name} ({CATEGORY_LABELS[clip.category]})
                    </option>
                  ))}
                </select>
              </label>

              {assignedClip && (
                <p className="clip-meta muted">{assignedClip.name}</p>
              )}

              <div className="volume-control">
                <label>
                  Volume
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={layer.volume}
                    onChange={(e) => void setLayerVolume(layer.id, Number(e.target.value))}
                  />
                </label>
                <span className="volume-readout">{Math.round(layer.volume * 100)}%</span>
              </div>

              <div className="channel-buttons">
                <button
                  type="button"
                  className={layer.muted ? 'active-toggle' : 'secondary small'}
                  onClick={() => void toggleLayerMute(layer.id)}
                >
                  M
                </button>
                {layer.id !== 'master' && (
                  <button
                    type="button"
                    className={layer.solo ? 'active-toggle' : 'secondary small'}
                    onClick={() => void toggleLayerSolo(layer.id)}
                  >
                    S
                  </button>
                )}
                {layer.id !== 'master' && (
                  <button
                    type="button"
                    className={layer.loop ? 'active-toggle' : 'secondary small'}
                    onClick={() => void toggleLayerLoop(layer.id)}
                  >
                    Loop
                  </button>
                )}
                {layer.id !== 'master' && layer.clipId && (
                  isPlaying ? (
                    <button type="button" className="secondary small" onClick={() => stopLayer(layer.id)}>
                      Stop
                    </button>
                  ) : (
                    <button type="button" onClick={() => void playLayer(layer.id)}>
                      Play
                    </button>
                  )
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
