import { toPublicUrl } from "../game/helpers";
import { getSoundEffectsVolume, isSoundEffectsEnabled } from "./soundEffects";

const THUNDER_PATH = "sounds/effects/thunder.mp3";
const THUNDER_TARGET_PEAK_DB = -16;
const THUNDER_FILE_PEAK_DB = -22;

let audioContext: AudioContext | null = null;
let thunderBuffer: AudioBuffer | null = null;
let thunderLoading: Promise<AudioBuffer | null> | null = null;

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

function thunderGain(): number {
  return 10 ** ((THUNDER_TARGET_PEAK_DB - THUNDER_FILE_PEAK_DB) / 20);
}

async function loadThunderBuffer(): Promise<AudioBuffer | null> {
  if (thunderBuffer) return thunderBuffer;
  if (thunderLoading) return thunderLoading;

  thunderLoading = (async () => {
    const ctx = await getAudioContext();
    if (!ctx) return null;
    const res = await fetch(toPublicUrl(THUNDER_PATH));
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    thunderBuffer = await ctx.decodeAudioData(data.slice(0));
    return thunderBuffer;
  })().finally(() => {
    thunderLoading = null;
  });

  return thunderLoading;
}

export async function preloadThunderSound() {
  await loadThunderBuffer();
}

export async function playThunderSound() {
  if (!isSoundEffectsEnabled()) return false;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const ctx = await getAudioContext();
  if (!ctx) return false;

  const buffer = await loadThunderBuffer();
  if (!buffer) return false;

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.playbackRate.value = 0.92 + Math.random() * 0.18;
  gain.gain.value = getSoundEffectsVolume() * thunderGain();
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
  return true;
}
