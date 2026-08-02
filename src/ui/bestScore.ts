const PREFIX = "hexgame-best:";

export function bestScoreKey(scenarioId: string, trackId?: string | null): string {
  return PREFIX + scenarioId + (trackId ? ":" + trackId : "");
}

export function getBestScore(scenarioId: string, trackId?: string | null): number | null {
  try {
    const raw = localStorage.getItem(bestScoreKey(scenarioId, trackId));
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Persist a new best if `moves` beats the stored score. Returns the best score after update. */
export function saveBestScore(
  scenarioId: string,
  moves: number,
  trackId?: string | null
): number {
  const prev = getBestScore(scenarioId, trackId);
  if (prev != null && moves >= prev) return prev;
  try {
    localStorage.setItem(bestScoreKey(scenarioId, trackId), String(moves));
  } catch {
    // ignore quota / private mode
  }
  return moves;
}
