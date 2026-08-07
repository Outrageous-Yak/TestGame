/** Single shared Web Audio context for all game SFX and villain voice lines. */
let audioContext: AudioContext | null = null;

export async function getGameAudioContext(): Promise<AudioContext | null> {
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

/** Call from a user gesture (tap/click) so playback is allowed on mobile Safari. */
export async function unlockGameAudio(): Promise<boolean> {
  const ctx = await getGameAudioContext();
  return ctx?.state === "running";
}
