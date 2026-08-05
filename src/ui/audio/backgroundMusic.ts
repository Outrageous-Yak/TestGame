import { toPublicUrl } from "../game/helpers";
import { normalizedBgmGain } from "./audioLevels";
import { getSoundEffectsVolume, isSoundEffectsEnabled } from "./soundEffects";

const FADE_SECONDS = 2.5;

let audioContext: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loadedPath: string | null = null;
let loading: Promise<AudioBuffer | null> | null = null;
let activePath: string | null = null;
let stopping = false;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canPlay(): boolean {
  return isSoundEffectsEnabled() && !prefersReducedMotion();
}

function targetVolume(): number {
  return getSoundEffectsVolume() * normalizedBgmGain();
}

async function getAudioContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

async function loadBuffer(path: string): Promise<AudioBuffer | null> {
  if (buffer && loadedPath === path) return buffer;

  if (loading && loadedPath === path) return loading;

  loadedPath = path;
  loading = (async () => {
    const ctx = await getAudioContext();
    if (!ctx) return null;

    const res = await fetch(toPublicUrl(path));
    if (!res.ok) return null;

    const data = await res.arrayBuffer();
    buffer = await ctx.decodeAudioData(data.slice(0));
    return buffer;
  })().finally(() => {
    loading = null;
  });

  return loading;
}

function clearCurrentSource() {
  currentSource = null;
  currentGain = null;
}

function playLoopIteration() {
  if (stopping || !activePath || !buffer) return;
  if (!canPlay()) return;

  const ctx = audioContext;
  if (!ctx) return;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const duration = buffer.duration;
  const fade = Math.min(FADE_SECONDS, duration / 4);
  const vol = targetVolume();

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + fade);
  gain.gain.setValueAtTime(vol, now + Math.max(fade, duration - fade));
  gain.gain.linearRampToValueAtTime(0, now + duration);

  currentSource = source;
  currentGain = gain;

  source.onended = () => {
    clearCurrentSource();
    if (!stopping && activePath) playLoopIteration();
  };

  source.start(0);
}

export async function preloadBackgroundMusic(path: string) {
  await loadBuffer(path);
}

export async function startBackgroundMusic(path: string) {
  stopping = false;
  activePath = path;

  const loaded = await loadBuffer(path);
  if (!loaded || stopping || activePath !== path) return;
  if (!canPlay()) return;

  playLoopIteration();
}

export async function stopBackgroundMusic(fadeOutSeconds = 1.5) {
  stopping = true;
  activePath = null;

  const source = currentSource;
  const gain = currentGain;
  const ctx = audioContext;

  clearCurrentSource();

  if (!source) return;

  if (gain && ctx && fadeOutSeconds > 0) {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + fadeOutSeconds);
    window.setTimeout(() => {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }, fadeOutSeconds * 1000 + 80);
    return;
  }

  try {
    source.stop();
  } catch {
    /* already stopped */
  }
}

export function isBackgroundMusicPlaying(): boolean {
  return !!activePath && !stopping;
}
