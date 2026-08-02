import { create } from 'zustand';
import { audioEngine } from '@/application/audioEngine';
import {
  createProject,
  type ClipCategory,
  type MixerLayer,
  type MixerLayerId,
  type SoundClip,
  type SoundProject,
} from '@/domain/types';
import {
  deleteClipBlob,
  deleteProject,
  getClipBlob,
  getProject,
  listProjects,
  saveClipBlob,
  saveProject,
} from '@/infrastructure/persistence';

async function getAudioDuration(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio(url);
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
      audio.addEventListener('error', () => reject(new Error('Failed to load audio')), { once: true });
    });
    return audio.duration;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function touchProject(project: SoundProject): SoundProject {
  return { ...project, updatedAt: new Date().toISOString() };
}

function applySoloLogic(layers: MixerLayer[]): void {
  const soloActive = layers.some((l) => l.solo && l.id !== 'master');
  for (const layer of layers) {
    if (layer.id === 'master') continue;
    const effectiveMuted = layer.muted || (soloActive && !layer.solo);
    audioEngine.setLayerVolume(layer.id, effectiveMuted ? 0 : layer.volume);
  }
  const master = layers.find((l) => l.id === 'master');
  if (master) {
    audioEngine.setMasterVolume(master.muted ? 0 : master.volume);
  }
}

interface AppState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  projects: SoundProject[];
  currentProject: SoundProject | null;
  playingLayers: Set<MixerLayerId>;

  initialize: () => Promise<void>;
  createNewProject: (name: string, description?: string) => Promise<void>;
  openProject: (id: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  updateProjectMeta: (name: string, description: string) => Promise<void>;

  importClip: (file: File, category: ClipCategory) => Promise<void>;
  deleteClip: (clipId: string) => Promise<void>;
  updateClip: (clipId: string, patch: Partial<Pick<SoundClip, 'name' | 'category' | 'tags'>>) => Promise<void>;

  setLayerVolume: (layerId: MixerLayerId, volume: number) => Promise<void>;
  toggleLayerMute: (layerId: MixerLayerId) => Promise<void>;
  toggleLayerSolo: (layerId: MixerLayerId) => Promise<void>;
  assignLayerClip: (layerId: MixerLayerId, clipId: string | null) => Promise<void>;
  toggleLayerLoop: (layerId: MixerLayerId) => Promise<void>;
  playLayer: (layerId: MixerLayerId) => Promise<void>;
  stopLayer: (layerId: MixerLayerId) => void;
  stopAll: () => void;

  assignCueClip: (cueId: string, clipId: string | null) => Promise<void>;
  updateCueLabel: (cueId: string, label: string) => Promise<void>;
  fireCue: (cueId: string) => Promise<void>;

  exportManifest: () => string;
}

async function persist(project: SoundProject): Promise<SoundProject> {
  const updated = touchProject(project);
  await saveProject(updated);
  return updated;
}

export const useAppStore = create<AppState>((set, get) => ({
  loading: true,
  saving: false,
  error: null,
  projects: [],
  currentProject: null,
  playingLayers: new Set(),

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await listProjects();
      set({ projects, loading: false });
      if (projects.length > 0) {
        const first = projects[0];
        if (first) await get().openProject(first.id);
      }
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load' });
    }
  },

  createNewProject: async (name, description = '') => {
    set({ saving: true, error: null });
    try {
      const project = createProject(name, description);
      await saveProject(project);
      const projects = await listProjects();
      set({ projects, currentProject: project, saving: false });
      audioEngine.stopAll();
      audioEngine.clearBufferCache();
    } catch (e) {
      set({ saving: false, error: e instanceof Error ? e.message : 'Failed to create project' });
    }
  },

  openProject: async (id) => {
    set({ loading: true, error: null });
    try {
      const project = await getProject(id);
      if (!project) throw new Error('Project not found');
      audioEngine.stopAll();
      audioEngine.clearBufferCache();
      applySoloLogic(project.mixerLayers);
      set({ currentProject: project, loading: false, playingLayers: new Set() });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to open project' });
    }
  },

  removeProject: async (id) => {
    set({ saving: true, error: null });
    try {
      await deleteProject(id);
      const projects = await listProjects();
      const current = get().currentProject;
      if (current?.id === id) {
        audioEngine.stopAll();
        set({ currentProject: null, playingLayers: new Set() });
        if (projects.length > 0) {
          const first = projects[0];
          if (first) await get().openProject(first.id);
        }
      }
      set({ projects, saving: false });
    } catch (e) {
      set({ saving: false, error: e instanceof Error ? e.message : 'Failed to delete project' });
    }
  },

  updateProjectMeta: async (name, description) => {
    const project = get().currentProject;
    if (!project) return;
    set({ saving: true });
    const updated = await persist({ ...project, name, description });
    set({ currentProject: updated, saving: false, projects: get().projects.map((p) => (p.id === updated.id ? updated : p)) });
  },

  importClip: async (file, category) => {
    const project = get().currentProject;
    if (!project) return;
    set({ saving: true, error: null });
    try {
      const durationSec = await getAudioDuration(file);
      const clip: SoundClip = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ''),
        category,
        durationSec,
        mimeType: file.type || 'audio/mpeg',
        createdAt: new Date().toISOString(),
        tags: [],
      };
      await saveClipBlob({ clipId: clip.id, projectId: project.id, blob: file });
      const updated = await persist({ ...project, clips: [...project.clips, clip] });
      set({
        currentProject: updated,
        saving: false,
        projects: get().projects.map((p) => (p.id === updated.id ? updated : p)),
      });
    } catch (e) {
      set({ saving: false, error: e instanceof Error ? e.message : 'Failed to import clip' });
    }
  },

  deleteClip: async (clipId) => {
    const project = get().currentProject;
    if (!project) return;
    set({ saving: true });
    await deleteClipBlob(clipId);
    audioEngine.clearBufferCache(clipId);
    const updated = await persist({
      ...project,
      clips: project.clips.filter((c) => c.id !== clipId),
      mixerLayers: project.mixerLayers.map((l) => (l.clipId === clipId ? { ...l, clipId: null } : l)),
      cueSlots: project.cueSlots.map((c) => (c.clipId === clipId ? { ...c, clipId: null } : c)),
    });
    set({
      currentProject: updated,
      saving: false,
      projects: get().projects.map((p) => (p.id === updated.id ? updated : p)),
    });
  },

  updateClip: async (clipId, patch) => {
    const project = get().currentProject;
    if (!project) return;
    set({ saving: true });
    const updated = await persist({
      ...project,
      clips: project.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
    });
    set({
      currentProject: updated,
      saving: false,
      projects: get().projects.map((p) => (p.id === updated.id ? updated : p)),
    });
  },

  setLayerVolume: async (layerId, volume) => {
    const project = get().currentProject;
    if (!project) return;
    const mixerLayers = project.mixerLayers.map((l) =>
      l.id === layerId ? { ...l, volume } : l,
    );
    applySoloLogic(mixerLayers);
    const updated = await persist({ ...project, mixerLayers });
    set({ currentProject: updated });
  },

  toggleLayerMute: async (layerId) => {
    const project = get().currentProject;
    if (!project) return;
    const mixerLayers = project.mixerLayers.map((l) =>
      l.id === layerId ? { ...l, muted: !l.muted } : l,
    );
    applySoloLogic(mixerLayers);
    const updated = await persist({ ...project, mixerLayers });
    set({ currentProject: updated });
  },

  toggleLayerSolo: async (layerId) => {
    const project = get().currentProject;
    if (!project) return;
    const mixerLayers = project.mixerLayers.map((l) =>
      l.id === layerId ? { ...l, solo: !l.solo } : l,
    );
    applySoloLogic(mixerLayers);
    const updated = await persist({ ...project, mixerLayers });
    set({ currentProject: updated });
  },

  assignLayerClip: async (layerId, clipId) => {
    const project = get().currentProject;
    if (!project) return;
    const mixerLayers = project.mixerLayers.map((l) =>
      l.id === layerId ? { ...l, clipId } : l,
    );
    const updated = await persist({ ...project, mixerLayers });
    set({ currentProject: updated });
  },

  toggleLayerLoop: async (layerId) => {
    const project = get().currentProject;
    if (!project) return;
    const mixerLayers = project.mixerLayers.map((l) =>
      l.id === layerId ? { ...l, loop: !l.loop } : l,
    );
    const updated = await persist({ ...project, mixerLayers });
    set({ currentProject: updated });
  },

  playLayer: async (layerId) => {
    const project = get().currentProject;
    if (!project) return;
    const layer = project.mixerLayers.find((l) => l.id === layerId);
    if (!layer?.clipId) return;
    const blob = await getClipBlob(layer.clipId);
    if (!blob) return;
    await audioEngine.playClip(layerId, layer.clipId, blob, { loop: layer.loop, volume: 1 });
    const playing = new Set(get().playingLayers);
    playing.add(layerId);
    set({ playingLayers: playing });
  },

  stopLayer: (layerId) => {
    audioEngine.stopLayer(layerId);
    const playing = new Set(get().playingLayers);
    playing.delete(layerId);
    set({ playingLayers: playing });
  },

  stopAll: () => {
    audioEngine.stopAll();
    set({ playingLayers: new Set() });
  },

  assignCueClip: async (cueId, clipId) => {
    const project = get().currentProject;
    if (!project) return;
    const cueSlots = project.cueSlots.map((c) => (c.id === cueId ? { ...c, clipId } : c));
    const updated = await persist({ ...project, cueSlots });
    set({ currentProject: updated });
  },

  updateCueLabel: async (cueId, label) => {
    const project = get().currentProject;
    if (!project) return;
    const cueSlots = project.cueSlots.map((c) => (c.id === cueId ? { ...c, label } : c));
    const updated = await persist({ ...project, cueSlots });
    set({ currentProject: updated });
  },

  fireCue: async (cueId) => {
    const project = get().currentProject;
    if (!project) return;
    const cue = project.cueSlots.find((c) => c.id === cueId);
    if (!cue?.clipId) return;
    const blob = await getClipBlob(cue.clipId);
    if (!blob) return;
    const sfxLayer = project.mixerLayers.find((l) => l.id === 'sfx');
    await audioEngine.playOneShot(blob, sfxLayer?.volume ?? 1);
  },

  exportManifest: () => {
    const project = get().currentProject;
    if (!project) return '{}';
    const manifest = {
      projectId: project.id,
      name: project.name,
      exportedAt: new Date().toISOString(),
      clips: project.clips.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        durationSec: c.durationSec,
        mimeType: c.mimeType,
        tags: c.tags,
        fileName: `${c.id}.audio`,
      })),
      mixer: project.mixerLayers.map((l) => ({
        id: l.id,
        volume: l.volume,
        muted: l.muted,
        clipId: l.clipId,
        loop: l.loop,
      })),
      cues: project.cueSlots
        .filter((c) => c.clipId)
        .map((c) => ({ id: c.id, label: c.label, clipId: c.clipId })),
    };
    return JSON.stringify(manifest, null, 2);
  },
}));
