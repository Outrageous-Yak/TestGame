import type { VillainKey } from "../types";
import { toPublicUrl } from "../game/helpers";
import {
  configureSoundEffects,
  getSoundEffectsVolume,
  isSoundEffectsEnabled,
} from "./soundEffects";
import { getGameAudioContext } from "./gameAudioContext";

export const VILLAIN_VOICE_PATHS: Partial<Record<VillainKey, string>> = {
  bad1: "sounds/villains/lollipop-cop.mp3",
};

export const VILLAIN_DISPLAY_NAMES: Partial<Record<VillainKey, string>> = {
  bad1: "Lollipop Cop",
};

const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();

async function loadPath(path: string): Promise<AudioBuffer | null> {
  if (buffers.has(path)) return buffers.get(path)!;

  const pending = loading.get(path);
  if (pending) return pending;

  const promise = (async () => {
    const ctx = await getGameAudioContext();
    if (!ctx) return null;

    const res = await fetch(toPublicUrl(path));
    if (!res.ok) return null;

    const data = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(data.slice(0));
    buffers.set(path, buffer);
    return buffer;
  })().finally(() => {
    loading.delete(path);
  });

  loading.set(path, promise);
  return promise;
}

export function villainDisplayName(key: VillainKey): string {
  return VILLAIN_DISPLAY_NAMES[key] ?? key;
}

export async function preloadVillainVoices(keys: VillainKey[] = Object.keys(VILLAIN_VOICE_PATHS) as VillainKey[]) {
  configureSoundEffects({});
  await Promise.all(
    keys.map(async (key) => {
      const path = VILLAIN_VOICE_PATHS[key];
      if (path) await loadPath(path);
    })
  );
}

export async function playVillainVoice(key: VillainKey): Promise<boolean> {
  if (!isSoundEffectsEnabled()) return false;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const path = VILLAIN_VOICE_PATHS[key];
  if (!path) return false;

  const ctx = await getGameAudioContext();
  if (!ctx) return false;

  const buffer = await loadPath(path);
  if (!buffer) return false;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = getSoundEffectsVolume() * 0.85;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
  return true;
}
