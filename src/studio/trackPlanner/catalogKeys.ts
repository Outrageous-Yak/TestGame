/**
 * Canonical board-draft identity — shared across cloud/visibility ScenarioEntry variants.
 * Aligns with progression track identity (world + registered track id).
 */
export function boardDraftKey(worldId: string, trackId: string): string {
  return `${worldId}|${trackId}`;
}

/** Unique catalog browse entry (production registry row). */
export function catalogEntryKey(worldId: string, scenarioId: string, trackId: string): string {
  return `${worldId}|${scenarioId}|${trackId}`;
}
