export function getWorkletUrlFromBase(basePath: string, origin = "https://example.com"): string {
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return new URL(`${base}synth-worklet.js`, origin).href;
}

export function hasAudibleStartupEvents(scheduledCount: number, masterGain: number): boolean {
  return scheduledCount > 0 && masterGain > 0;
}

export function shouldReportSilence(rms: number, runningMs: number, threshold = 0.0005): boolean {
  return runningMs > 2000 && rms < threshold;
}
