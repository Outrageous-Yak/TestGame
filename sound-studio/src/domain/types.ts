export type ClipCategory = 'ambient' | 'music' | 'sfx' | 'voice' | 'ui';

export type MixerLayerId = 'ambient' | 'music' | 'sfx' | 'master';

export interface SoundClip {
  id: string;
  name: string;
  category: ClipCategory;
  durationSec: number;
  mimeType: string;
  createdAt: string;
  tags: string[];
}

export interface MixerLayer {
  id: MixerLayerId;
  label: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  clipId: string | null;
  loop: boolean;
}

export interface CueSlot {
  id: string;
  label: string;
  clipId: string | null;
  color: string;
}

export interface SoundProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  clips: SoundClip[];
  mixerLayers: MixerLayer[];
  cueSlots: CueSlot[];
}

export interface ClipBlobRecord {
  clipId: string;
  projectId: string;
  blob: Blob;
}

export const DEFAULT_MIXER_LAYERS: MixerLayer[] = [
  { id: 'ambient', label: 'Ambient', volume: 0.7, muted: false, solo: false, clipId: null, loop: true },
  { id: 'music', label: 'Music', volume: 0.8, muted: false, solo: false, clipId: null, loop: true },
  { id: 'sfx', label: 'SFX', volume: 1, muted: false, solo: false, clipId: null, loop: false },
  { id: 'master', label: 'Master', volume: 0.85, muted: false, solo: false, clipId: null, loop: false },
];

export const CATEGORY_LABELS: Record<ClipCategory, string> = {
  ambient: 'Ambient',
  music: 'Music',
  sfx: 'SFX',
  voice: 'Voice',
  ui: 'UI',
};

export function createEmptyCueSlots(): CueSlot[] {
  const colors = ['#4a6fa5', '#6b4a8a', '#8a5a4a', '#4a8a6b', '#8a4a6b', '#5a8a4a'];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `cue-${i + 1}`,
    label: `Cue ${i + 1}`,
    clipId: null,
    color: colors[i % colors.length] ?? '#4a6fa5',
  }));
}

export function createProject(name: string, description = ''): SoundProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
    clips: [],
    mixerLayers: DEFAULT_MIXER_LAYERS.map((l) => ({ ...l })),
    cueSlots: createEmptyCueSlots(),
  };
}
