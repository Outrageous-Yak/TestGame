import type { GameState, Pos } from "../../../engine/types";
import { posId } from "../../../engine/board";
import { newGame } from "../../../engine/api";
import { activateLayerMovement } from "../../../engine/endTurn";
import { passTurn } from "../../../engine/endTurn";
import { tryMove } from "../../../engine/api";
import { neighborIdsSameLayer } from "../../../engine/neighbors";
import { buildBoardPreviewScenario } from "../boardMovementPreview";
import { authoredTrackToScenario } from "../serialization/scenarioBridge";
import type { PlannerTrack, TrackFeature } from "../types";
import { cloneTrack } from "../state/authoringState";
import { visibilityOverlaysToRuntimeExport, visibilityStateLabel } from "../visibility/visibilityRuntimeMapping";

/** Deep-ish structural snapshot for draft immutability tests (JSON-safe fields). */
export function snapshotTrackDraft(track: PlannerTrack): string {
  return JSON.stringify(cloneTrack(track));
}

/** Temporary GameState for Layer Playtest — never mutates the authored track. */
export function freshLayerPlaytestState(track: PlannerTrack): GameState {
  try {
    const scenario = authoredTrackToScenario(track);
    return newGame(scenario);
  } catch {
    const preview = buildBoardPreviewScenario(track);
    if (!preview) {
      throw new Error("Cannot build Layer Playtest state — board has no placeable hexes");
    }
    return newGame(preview);
  }
}

export function layerFromHexId(hexId: string | null | undefined): number | null {
  if (!hexId) return null;
  const m = /^L(\d+)/.exec(hexId);
  return m ? Number(m[1]) : null;
}

export function activatePlayerLayerMovement(state: GameState): GameState {
  const layer = layerFromHexId(state.playerHexId);
  if (layer != null) activateLayerMovement(state, layer);
  return state;
}

export function placePlaytestPlayer(state: GameState, hexId: string): GameState {
  const hex = state.hexesById.get(hexId);
  if (!hex || hex.missing) return state;
  state.playerHexId = hexId;
  activateLayerMovement(state, hex.pos.layer);
  return state;
}

export function playtestPassTurn(state: GameState): GameState {
  activatePlayerLayerMovement(state);
  passTurn(state);
  return state;
}

export function playtestTryMove(state: GameState, targetId: string) {
  return tryMove(state, targetId);
}

export function playtestReachableIds(state: GameState): string[] {
  return neighborIdsSameLayer(state, state.playerHexId);
}

export function featureAtLogicalHex(track: PlannerTrack, hexId: string): TrackFeature | null {
  for (const f of track.features) {
    if (f.kind === "portal") {
      if (posId(f.source) === hexId) return f;
    } else if ("position" in f && posId(f.position) === hexId) {
      return f;
    }
  }
  return null;
}

export type PlaytestCardFeedback = {
  kind: "none" | "red" | "deferred" | "encounter";
  message: string;
};

export function cardFeedbackAtPlayer(track: PlannerTrack, state: GameState): PlaytestCardFeedback {
  const feat = featureAtLogicalHex(track, state.playerHexId);
  if (!feat) return { kind: "none", message: "" };
  if (feat.kind === "card") {
    if (feat.cardType === "RED") {
      const consumed = state.consumedEncounterIds?.has(feat.id) ?? false;
      if (consumed) {
        return { kind: "red", message: "RED encounter already resolved this attempt (one-shot)" };
      }
      return {
        kind: "red",
        message: "Entered RED encounter hex — foundation modal in gameplay (Continue consumes)",
      };
    }
    if (feat.cardType === "RANDOM") {
      return { kind: "deferred", message: "? RANDOM — authoring only; runtime resolution deferred" };
    }
    if (feat.cardType === "HIDDEN") {
      return {
        kind: "deferred",
        message: `? Fixed → ${feat.resolvedType ?? "?"} (exports resolved color; concealment deferred)`,
      };
    }
    return {
      kind: "deferred",
      message: `${feat.cardType} card — gameplay effect deferred`,
    };
  }
  if (feat.kind === "encounter" || feat.kind === "villain") {
    return { kind: "encounter", message: "Entered encounter/villain hex" };
  }
  return { kind: "none", message: "" };
}

export function isGoalReached(state: GameState): boolean {
  const goalId = posId(state.scenario.goal);
  return state.playerHexId === goalId;
}

/** Read-only visibility label for playtest chrome (no custom-mask / moving overlay runtime). */
export function playtestVisibilitySummary(track: PlannerTrack): string {
  const overlay = track.visibility?.[0];
  if (!overlay || overlay.state === "REGULAR") return "Visibility: Regular";
  const runtime = visibilityOverlaysToRuntimeExport(track.visibility);
  const bits = [visibilityStateLabel(overlay.state)];
  if (runtime.cloudMode) bits.push(`cloud=${runtime.cloudMode}`);
  if (runtime.visibilityMode) bits.push(`mode=${runtime.visibilityMode}`);
  return `Visibility: ${bits.join(" · ")} (FULL_BOARD presentation only)`;
}

export function logicalPosFromHexId(state: GameState, hexId: string): Pos | null {
  return state.hexesById.get(hexId)?.pos ?? null;
}
