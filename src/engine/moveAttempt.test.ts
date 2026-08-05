import { describe, expect, it, vi } from "vitest";
import { newGame } from "./api";
import { attemptMoveToSlot } from "./moveAttempt";
import * as endTurnModule from "./endTurn";
import { neighborIdsSameLayer } from "./neighbors";
import { shiftingLayersInMovement, getRuntimeMovement, applyLayerRowMovement } from "./rowMovement";
import { attachRuntimeMovement } from "./rowMovement/attachRuntimeMovement";
import { transformScenarioLayer } from "./layerTransform";
import type { LayerTransformId } from "./layerTransform/types";
import type { Scenario } from "./types";
import { SEVEN_LEFT_SIX_RIGHT_ROWS } from "./rowMovement/legacyMovementMigration";
import { posId } from "./board";
import { findSlot, hexIdAtSlot } from "./layout";

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "move_attempt_test",
    name: "Move Attempt Test",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 1, row: 3, col: 4 },
    missing: [],
    blocked: [],
    movement: {
      "1": "NONE",
      "2": { rows: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((r) => [String(r), SEVEN_LEFT_SIX_RIGHT_ROWS[r as 0]])) },
      "3": "NONE",
      "4": "NONE",
      "5": "NONE",
      "6": "NONE",
      "7": "NONE",
    },
    transitions: [],
    revealOnEnterGuaranteedUp: false,
    ...overrides,
  };
}

describe("attemptMoveToSlot", () => {
  it("moves to a reachable hex and consumes exactly one turn", () => {
    const state = newGame(baseScenario());
    const before = state.playerHexId;
    const turn0 = state.turn;

    const outcome = attemptMoveToSlot(state, { layer: 1, row: 3, col: 2 });

    expect(outcome.result).toBe("MOVED");
    expect(state.playerHexId).not.toBe(before);
    expect(state.turn).toBe(turn0 + 1);
    expect(state.moveHistory?.at(-1)?.type).toBe("MOVE");
  });

  it("does not move player for unreachable hex but consumes one turn", () => {
    const state = newGame(baseScenario());
    const before = state.playerHexId;
    const turn0 = state.turn;

    const outcome = attemptMoveToSlot(state, { layer: 1, row: 0, col: 0 });

    expect(outcome.result).toBe("UNREACHABLE");
    expect(state.playerHexId).toBe(before);
    expect(state.turn).toBe(turn0 + 1);
    expect(state.moveHistory?.at(-1)).toMatchObject({
      type: "FAILED_MOVE",
      reason: "UNREACHABLE",
    });
  });

  it("consumes a turn for missing hex slot without moving player", () => {
    const scenario = baseScenario({
      missing: [{ layer: 1, row: 3, col: 2 }],
    });
    const state = newGame(scenario);
    const before = state.playerHexId;
    const turn0 = state.turn;

    const outcome = attemptMoveToSlot(state, { layer: 1, row: 3, col: 2 });

    expect(outcome.result).toBe("MISSING");
    expect(state.playerHexId).toBe(before);
    expect(state.turn).toBe(turn0 + 1);
    expect(state.moveHistory?.at(-1)).toMatchObject({
      type: "FAILED_MOVE",
      reason: "MISSING_HEX",
    });
  });

  it("consumes a turn for adjacent blocked hex", () => {
    const scenario = baseScenario({
      blocked: [{ layer: 1, row: 3, col: 2 }],
    });
    const state = newGame(scenario);
    const before = state.playerHexId;
    const turn0 = state.turn;

    const outcome = attemptMoveToSlot(state, { layer: 1, row: 3, col: 2 });

    expect(outcome.result).toBe("BLOCKED");
    expect(state.playerHexId).toBe(before);
    expect(state.turn).toBe(turn0 + 1);
  });

  it("ignores out-of-bounds slot without consuming a turn", () => {
    const state = newGame(baseScenario());
    const turn0 = state.turn;

    const outcome = attemptMoveToSlot(state, { layer: 1, row: 0, col: 99 });

    expect(outcome.result).toBe("IGNORED");
    expect(state.turn).toBe(turn0);
    expect(state.moveHistory ?? []).toHaveLength(0);
  });

  it("triggers row movement after failed move", () => {
    const scenario = baseScenario();
    attachRuntimeMovement(scenario);
    const state = newGame(scenario);
    const rowsBefore = state.rows.get(2)?.map((r) => r.join(",")).join("|") ?? "";

    attemptMoveToSlot(state, { layer: 1, row: 0, col: 0 });

    const rowsAfter = state.rows.get(2)?.map((r) => r.join(",")).join("|") ?? "";
    const shifting = shiftingLayersInMovement(getRuntimeMovement(scenario));
    if (shifting.includes(2)) {
      expect(rowsAfter).not.toBe(rowsBefore);
    }
  });

  it("does not treat non-adjacent hex as reachable", () => {
    const state = newGame(baseScenario());
    const neighbors = new Set(neighborIdsSameLayer(state, state.playerHexId));
    const farId = "L1-R0-C0";
    expect(neighbors.has(farId)).toBe(false);

    const outcome = attemptMoveToSlot(state, { layer: 1, row: 0, col: 0 });
    expect(outcome.result).toBe("UNREACHABLE");
  });

  it("records failed move with slot coordinates for replay", () => {
    const state = newGame(baseScenario({ missing: [{ layer: 1, row: 3, col: 2 }] }));
    attemptMoveToSlot(state, { layer: 1, row: 3, col: 2 });
    const last = state.moveHistory?.at(-1);
    expect(last).toMatchObject({
      type: "FAILED_MOVE",
      slot: { layer: 1, row: 3, col: 2 },
    });
  });

  it("calls endTurn exactly once for failed and successful moves", () => {
    const endTurnSpy = vi.spyOn(endTurnModule, "endTurn");

    const blockedState = newGame(baseScenario({ blocked: [{ layer: 1, row: 3, col: 2 }] }));
    endTurnSpy.mockClear();
    attemptMoveToSlot(blockedState, { layer: 1, row: 3, col: 2 });
    expect(endTurnSpy).toHaveBeenCalledTimes(1);

    const moveState = newGame(baseScenario());
    endTurnSpy.mockClear();
    attemptMoveToSlot(moveState, { layer: 1, row: 3, col: 2 });
    expect(endTurnSpy).toHaveBeenCalledTimes(1);

    const ignoredState = newGame(baseScenario());
    endTurnSpy.mockClear();
    attemptMoveToSlot(ignoredState, { layer: 1, row: 0, col: 99 });
    expect(endTurnSpy).not.toHaveBeenCalled();

    endTurnSpy.mockRestore();
  });

  it("does not trigger portal or goal effects on failed move", () => {
    const scenario = baseScenario({
      goal: { layer: 1, row: 0, col: 0 },
      transitions: [
        { type: "UP", from: { layer: 1, row: 0, col: 0 }, to: { layer: 2, row: 0, col: 0 } },
      ],
    });
    const state = newGame(scenario);
    const before = state.playerHexId;
    const visibleBefore = new Set(state.visibleLayers);

    const outcome = attemptMoveToSlot(state, { layer: 1, row: 0, col: 0 });

    expect(outcome.result).toBe("UNREACHABLE");
    expect(state.playerHexId).toBe(before);
    expect(state.visibleLayers).toEqual(visibleBefore);
  });

  it("replays failed move from history without moving player", () => {
    const scenario = baseScenario({ missing: [{ layer: 1, row: 3, col: 2 }] });
    const state = newGame(scenario);
    const before = state.playerHexId;
    attemptMoveToSlot(state, { layer: 1, row: 3, col: 2 });

    const action = state.moveHistory?.at(-1);
    expect(action?.type).toBe("FAILED_MOVE");
    if (!action || action.type !== "FAILED_MOVE") return;

    const replay = newGame(scenario);
    const replayBefore = replay.playerHexId;
    const replayOutcome = attemptMoveToSlot(replay, action.slot);
    expect(replayOutcome.result).toBe("MISSING");
    expect(replay.playerHexId).toBe(replayBefore);
    expect(replay.playerHexId).toBe(before);
    expect(replay.turn).toBe(1);
  });

  const LAYER_TRANSFORMS: LayerTransformId[] = [
    "identity",
    "reflect-horizontal",
    "symmetry-b",
    "symmetry-c",
  ];

  it("moves to the runtime hex at a visual slot after row shift", () => {
    const scenario = baseScenario({
      start: { layer: 2, row: 3, col: 1 },
      goal: { layer: 2, row: 3, col: 4 },
      movement: {
        "1": "NONE",
        "2": {
          rows: Object.fromEntries(
            [0, 1, 2, 3, 4, 5, 6].map((r) => [String(r), { direction: "LEFT", amount: 1 }])
          ),
        },
        "3": "NONE",
        "4": "NONE",
        "5": "NONE",
        "6": "NONE",
        "7": "NONE",
      },
    });
    attachRuntimeMovement(scenario);
    const state = newGame(scenario);

    applyLayerRowMovement(state, 2, getRuntimeMovement(scenario));

    const neighbors = neighborIdsSameLayer(state, state.playerHexId).filter((id) => {
      const hex = state.hexesById.get(id);
      return hex && !hex.missing && !hex.blocked;
    });
    expect(neighbors.length).toBeGreaterThan(0);

    const targetId = neighbors[0]!;
    const slot = findSlot(state, 2, targetId);
    expect(slot).toBeTruthy();

    const runtimeId = hexIdAtSlot(state, 2, slot!.row, slot!.col);
    const authoredId = posId({ layer: 2, row: slot!.row, col: slot!.col });
    expect(runtimeId).toBe(targetId);
    expect(runtimeId).not.toBe(authoredId);

    const before = state.playerHexId;
    const outcome = attemptMoveToSlot(state, { layer: 2, row: slot!.row, col: slot!.col });

    expect(outcome.result).toBe("MOVED");
    expect(state.playerHexId).toBe(targetId);
    expect(state.playerHexId).not.toBe(before);
  });

  it.each(LAYER_TRANSFORMS)(
    "missing slot consumes turn under layer transform %s",
    (transformId) => {
      const base = baseScenario({ missing: [{ layer: 1, row: 3, col: 2 }] });
      const scenario = transformScenarioLayer(base, 1, transformId);
      const state = newGame(scenario);
      const missingPos = scenario.missing![0];
      const before = state.playerHexId;

      const outcome = attemptMoveToSlot(state, missingPos);

      expect(outcome.result).toBe("MISSING");
      expect(state.playerHexId).toBe(before);
      expect(state.turn).toBe(1);
      expect(state.hexesById.get(posId(missingPos))?.missing).toBe(true);
    }
  );
});
