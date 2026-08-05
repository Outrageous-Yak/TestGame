import { toPublicUrl } from "../game/helpers";

export const SOUND_EFFECT_PATHS = {
  playerMove: "sounds/effects/player-move.mp3",
  portalLand: "sounds/effects/portal-land.mp3",
  goalLand: "sounds/effects/goal-land.mp3",
} as const;

export type SoundEffectId = keyof typeof SOUND_EFFECT_PATHS;

type SoundEffectsOptions = {
  volume?: number;
  enabled?: boolean;
};

const STORAGE_KEY = "testgame.soundEffects.enabled";

let audioContext: AudioContext | null = null;
let enabled = true;
let volume = 0.55;
const buffers = new Map<SoundEffectId, AudioBuffer>();
const loading = new Map<SoundEffectId, Promise<AudioBuffer | null>>();

function readStoredEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "0") return false;
    if (raw === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

function persistEnabled(next: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function configureSoundEffects(options: SoundEffectsOptions = {}) {
  if (typeof options.volume === "number") {
    volume = Math.max(0, Math.min(1, options.volume));
  }
  if (typeof options.enabled === "boolean") {
    enabled = options.enabled;
    persistEnabled(enabled);
  }
}

export function isSoundEffectsEnabled(): boolean {
  return enabled;
}

export function setSoundEffectsEnabled(next: boolean) {
  enabled = next;
  persistEnabled(next);
}

export function getSoundEffectsVolume(): number {
  return volume;
}

async function getAudioContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      return null;
    }
  }
  return audioContext;
}

async function loadBuffer(id: SoundEffectId): Promise<AudioBuffer | null> {
  if (buffers.has(id)) return buffers.get(id)!;

  const pending = loading.get(id);
  if (pending) return pending;

  const promise = (async () => {
    const ctx = await getAudioContext();
    if (!ctx) return null;

    const path = SOUND_EFFECT_PATHS[id];
    const res = await fetch(toPublicUrl(path));
    if (!res.ok) return null;

    const data = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data.slice(0));
    buffers.set(id, buffer);
    return buffer;
  })().finally(() => {
    loading.delete(id);
  });

  loading.set(id, promise);
  return promise;
}

export async function preloadSoundEffects(ids: SoundEffectId[] = Object.keys(SOUND_EFFECT_PATHS) as SoundEffectId[]) {
  configureSoundEffects({ enabled: readStoredEnabled() });
  await Promise.all(ids.map((id) => loadBuffer(id)));
}

export async function playSoundEffect(id: SoundEffectId, playbackRate = 1) {
  if (!enabled) return false;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const ctx = await getAudioContext();
  if (!ctx) return false;

  const buffer = await loadBuffer(id);
  if (!buffer) return false;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.playbackRate.value = playbackRate;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
  return true;
}

export function playPlayerMoveSound() {
  void playSoundEffect("playerMove");
}

export function playPortalLandSound() {
  void playSoundEffect("portalLand");
}

export function playGoalLandSound() {
  void playSoundEffect("goalLand");
}
