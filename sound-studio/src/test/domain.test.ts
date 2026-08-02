import { describe, expect, it } from 'vitest';
import { createProject, createEmptyCueSlots, DEFAULT_MIXER_LAYERS } from '@/domain/types';

describe('domain types', () => {
  it('creates a project with default mixer layers and cue slots', () => {
    const project = createProject('Test Game Audio');
    expect(project.name).toBe('Test Game Audio');
    expect(project.clips).toHaveLength(0);
    expect(project.mixerLayers).toHaveLength(DEFAULT_MIXER_LAYERS.length);
    expect(project.cueSlots).toHaveLength(12);
  });

  it('creates cue slots with unique ids', () => {
    const slots = createEmptyCueSlots();
    const ids = new Set(slots.map((s) => s.id));
    expect(ids.size).toBe(slots.length);
  });
});
