/**
 * Canonical player-progression identity for a registered production Track.
 *
 * Uses world + registry track id (NOT scenarioJson URL, NOT scenarioEntry id).
 * Model A: completion is shared across cloud/visibility ScenarioEntry variants
 * within the same World that share the same Track registry ids.
 */
export function progressionTrackKey(worldId: string, trackId: string): string {
  return `${worldId}::${trackId}`;
}

export function parseProgressionTrackKey(key: string): { worldId: string; trackId: string } | null {
  const idx = key.indexOf("::");
  if (idx <= 0 || idx >= key.length - 2) return null;
  return { worldId: key.slice(0, idx), trackId: key.slice(idx + 2) };
}
