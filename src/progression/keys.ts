/**
 * Progression identity keys.
 *
 * Model A (cloud variants): completion is keyed by world + registered track id only.
 * ScenarioEntry visibility variants share the same underlying Track registry entries.
 * Best scores remain per scenarioEntryId + trackId (see bestScore.ts).
 */

export function progressionTrackKey(worldId: string, trackId: string): string {
  return `${worldId}|${trackId}`;
}

export function parseProgressionTrackKey(key: string): { worldId: string; trackId: string } | null {
  const sep = key.indexOf("|");
  if (sep <= 0 || sep >= key.length - 1) return null;
  return {
    worldId: key.slice(0, sep),
    trackId: key.slice(sep + 1),
  };
}
