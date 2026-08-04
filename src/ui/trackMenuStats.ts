import { newGame, getMinMovesToGoal } from "../engine/api";
import { loadScenario } from "./game/helpers";

/** UI-accurate minimum moves from track start (same as in-game optimal at start). */
export async function computeTrackOptimalMoves(scenarioJson: string): Promise<number | null> {
  const scenario = await loadScenario(scenarioJson);
  const state = newGame(scenario);
  return getMinMovesToGoal(state);
}

export async function loadTrackOptimalMap(
  tracks: { id: string; scenarioJson: string }[]
): Promise<Record<string, number | null>> {
  const pairs = await Promise.all(
    tracks.map(async (t) => {
      try {
        const optimal = await computeTrackOptimalMoves(t.scenarioJson);
        return [t.id, optimal] as const;
      } catch {
        return [t.id, null] as const;
      }
    })
  );
  return Object.fromEntries(pairs);
}
