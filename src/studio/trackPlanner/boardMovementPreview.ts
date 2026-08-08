import { newGame } from "../../engine/api";
import type { GameState } from "../../engine/types";
import { applyLayerRowMovement, getRuntimeMovement } from "../../engine/rowMovement";
import { authoredTrackToScenario } from "./serialization/scenarioBridge";
import type { PlannerTrack } from "./types";

/** Temporary runtime state for Board movement preview — does not mutate authored track. */
export function buildMovementPreviewState(track: PlannerTrack, previewSteps: number): GameState | null {
  if (previewSteps <= 0) return null;
  try {
    const scenario = authoredTrackToScenario(track);
    const state = newGame(scenario);
    const movement = getRuntimeMovement(scenario);
    const maxLayer = scenario.layers ?? 7;

    for (let step = 0; step < previewSteps; step++) {
      for (let layer = 1; layer <= maxLayer; layer++) {
        if (state.movementActiveLayers.has(layer)) {
          applyLayerRowMovement(state, layer, movement);
        }
      }
      state.turn += 1;
    }
    return state;
  } catch {
    return null;
  }
}
