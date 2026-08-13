/**
 * Step 5B — Layer-entry snapshot + safe restoration foundation tests.
 *
 * Restoration is a test/dev API. No player-facing banishment / Restore button.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { newGame } from "./api";
import { attemptMove } from "./rules";
import { attemptMoveToSlot } from "./moveAttempt";
import { enterLayer, posId, ROW_LENS } from "./board";
import { snapshotState, snapshotStateLite, restoreStateLite } from "./snapshot";
import { solverStateKey } from "./trackAnalysis";
import { evaluateAttemptTerminal } from "./attemptTerminal";
import { listLegalSuccessfulMoveTargets } from "./legalMoves";
import { endTurn } from "./endTurn";
import { passTurn } from "./rules";
import type { Scenario } from "./types";
import {
  captureLayerEntrySnapshot,
  getLayerEntrySnapshot,
  listLayerEntrySnapshotLayers,
  restoreLayerEntrySnapshot,
} from "./layerEntrySnapshot";
import {
  isEncounterConsumed,
  markEncounterConsumed,
  shouldActivateRedEncounter,
} from "./encounters/redEncounter";
import { PROGRESSION_STORAGE_KEY } from "../progression/storage";
import { CAMPAIGN_MAP_DRAFTS_KEY } from "../campaign/storage";
import { TRACK_PLANNER_STORAGE_KEY } from "../studio/trackPlanner/storage";
import { bestScoreKey } from "../ui/bestScore";
import { runSimulator } from "../studio/trackPlanner/simulation/runSimulator";
import { DEFAULT_SIMULATOR_BUDGET } from "../studio/trackPlanner/simulation/analysisBudget";
import { scenarioJsonToTrack } from "../studio/trackPlanner/catalog";
import { createEmptyTrack } from "../studio/trackPlanner/types";

const root = join(import.meta.dirname, "..", "..");

function noneMovement(): Scenario["movement"] {
  return {
    "1": "NONE",
    "2": "NONE",
    "3": "NONE",
    "4": "NONE",
    "5": "NONE",
    "6": "NONE",
    "7": "NONE",
  };
}

function shiftingLayer3(): Scenario["movement"] {
  return {
    ...noneMovement(),
    "3": {
      rows: {
        "0": { direction: "LEFT", amount: 1 },
        "1": { direction: "RIGHT", amount: 1 },
        "2": { direction: "LEFT", amount: 1 },
        "3": { direction: "RIGHT", amount: 1 },
        "4": { direction: "LEFT", amount: 1 },
        "5": { direction: "RIGHT", amount: 1 },
        "6": { direction: "LEFT", amount: 1 },
      },
    },
  };
}

function openBoard(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "layer_entry_snap",
    name: "Layer Entry Snapshot",
    layers: 7,
    start: { layer: 1, row: 6, col: 3 },
    goal: { layer: 1, row: 0, col: 3 },
    missing: [],
    blocked: [],
    transitions: [],
    movement: noneMovement(),
    revealOnEnterGuaranteedUp: false,
    ...overrides,
  };
}

/** L1 start → UP to L3 dest; L3 DOWN to L2; L2 UP re-enters L3 at a different dest. */
function portalBoard(overrides: Partial<Scenario> = {}): Scenario {
  return openBoard({
    movement: shiftingLayer3(),
    transitions: [
      {
        type: "UP",
        from: { layer: 1, row: 5, col: 3 },
        to: { layer: 3, row: 6, col: 3 },
      },
      {
        type: "DOWN",
        from: { layer: 3, row: 6, col: 4 },
        to: { layer: 2, row: 6, col: 3 },
      },
      {
        type: "UP",
        from: { layer: 2, row: 5, col: 3 },
        to: { layer: 3, row: 4, col: 3 },
      },
    ],
    ...overrides,
  });
}

function rowPhase(state: ReturnType<typeof newGame>, layer: number): string[] {
  return (state.rows.get(layer) ?? []).map((row) => row.join("|"));
}

function enterL3FromL1(state: ReturnType<typeof newGame>) {
  const res = attemptMove(state, posId({ layer: 1, row: 5, col: 3 }));
  expect(res.ok).toBe(true);
  expect(state.playerHexId).toBe(posId({ layer: 3, row: 6, col: 3 }));
}

function sameRowStep(state: ReturnType<typeof newGame>, destCol: number) {
  const player = state.hexesById.get(state.playerHexId)!;
  const target = posId({ layer: player.pos.layer, row: player.pos.row, col: destCol });
  const res = attemptMove(state, target);
  expect(res.ok).toBe(true);
}

function interestingStorage(): Record<string, string | null> {
  const keys = [
    PROGRESSION_STORAGE_KEY,
    CAMPAIGN_MAP_DRAFTS_KEY,
    TRACK_PLANNER_STORAGE_KEY,
    bestScoreKey("layer_entry_snap"),
    "encounter-consumed",
    "hexgame-encounters",
    "layer-entry-snapshots",
    "hexgame-layer-entry",
  ];
  const out: Record<string, string | null> = {};
  for (const k of keys) {
    try {
      out[k] = localStorage.getItem(k);
    } catch {
      out[k] = null;
    }
  }
  return out;
}

describe("Step 5B Layer-entry snapshot foundation", () => {
  it("TEST 1 — Initial layer snapshot exists", () => {
    const state = newGame(openBoard());
    const snap = getLayerEntrySnapshot(state, 1);
    expect(snap).not.toBeNull();
    expect(snap!.layer).toBe(1);
    expect(snap!.playerHexId).toBe(posId({ layer: 1, row: 6, col: 3 }));
    expect(listLayerEntrySnapshotLayers(state)).toEqual([1]);
  });

  it("TEST 2 — Entering new layer captures snapshot", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const snap = getLayerEntrySnapshot(state, 3);
    expect(snap).not.toBeNull();
    expect(snap!.playerHexId).toBe(posId({ layer: 3, row: 6, col: 3 }));
    expect(snap!.layer).toBe(3);
  });

  it("TEST 3 — Same-layer movement does not replace snapshot", () => {
    const state = newGame(openBoard());
    const before = getLayerEntrySnapshot(state, 1);
    expect(attemptMove(state, posId({ layer: 1, row: 5, col: 3 })).ok).toBe(true);
    const after = getLayerEntrySnapshot(state, 1);
    expect(after).toEqual(before);
    expect(state.playerHexId).not.toBe(before!.playerHexId);
  });

  it("TEST 4 — Re-entering layer replaces only that layer snapshot", () => {
    const state = newGame(portalBoard());
    const l1Before = getLayerEntrySnapshot(state, 1);
    enterL3FromL1(state);
    const firstL3 = getLayerEntrySnapshot(state, 3);
    expect(firstL3!.playerHexId).toBe(posId({ layer: 3, row: 6, col: 3 }));

    expect(attemptMove(state, posId({ layer: 3, row: 6, col: 4 })).ok).toBe(true);
    expect(state.playerHexId).toBe(posId({ layer: 2, row: 6, col: 3 }));
    const l2 = getLayerEntrySnapshot(state, 2);
    expect(l2).not.toBeNull();

    expect(attemptMove(state, posId({ layer: 2, row: 5, col: 3 })).ok).toBe(true);
    expect(state.playerHexId).toBe(posId({ layer: 3, row: 4, col: 3 }));
    const secondL3 = getLayerEntrySnapshot(state, 3);
    expect(secondL3!.playerHexId).toBe(posId({ layer: 3, row: 4, col: 3 }));
    expect(secondL3!.playerHexId).not.toBe(firstL3!.playerHexId);
    expect(getLayerEntrySnapshot(state, 1)).toEqual(l1Before);
    expect(getLayerEntrySnapshot(state, 2)?.playerHexId).toBe(posId({ layer: 2, row: 6, col: 3 }));
  });

  it("TEST 5 — Multiple layer snapshots coexist", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    attemptMove(state, posId({ layer: 3, row: 6, col: 4 }));
    expect(listLayerEntrySnapshotLayers(state)).toEqual([1, 2, 3]);
  });

  it("TEST 6 — Player position restores", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const entryPos = state.playerHexId;
    sameRowStep(state, 2);
    expect(state.playerHexId).not.toBe(entryPos);
    const result = restoreLayerEntrySnapshot(state, 3);
    expect(result.status).toBe("restored");
    expect(state.playerHexId).toBe(entryPos);
  });

  it("TEST 7 — Row phases restore", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const entryPhase = rowPhase(state, 3);
    passTurn(state);
    passTurn(state);
    expect(rowPhase(state, 3)).not.toEqual(entryPhase);
    restoreLayerEntrySnapshot(state, 3);
    expect(rowPhase(state, 3)).toEqual(entryPhase);
  });

  it("TEST 8 — Restored row engine continues correctly", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const afterOneMore = newGame(portalBoard());
    enterL3FromL1(afterOneMore);
    passTurn(afterOneMore);
    const expected = rowPhase(afterOneMore, 3);

    passTurn(state);
    passTurn(state);
    restoreLayerEntrySnapshot(state, 3);
    passTurn(state);
    expect(rowPhase(state, 3)).toEqual(expected);
  });

  it("TEST 9 — Move count preserved; restore adds zero moves", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const n = state.turn;
    passTurn(state);
    passTurn(state);
    passTurn(state);
    passTurn(state);
    passTurn(state);
    expect(state.turn).toBe(n + 5);
    restoreLayerEntrySnapshot(state, 3);
    expect(state.turn).toBe(n + 5);
    const beforeNext = state.turn;
    sameRowStep(state, 2);
    expect(state.turn).toBe(beforeNext + 1);
  });

  it("TEST 10 — Timer/history not rewound (no GameState timer; turn + history preserved)", () => {
    const state = newGame(openBoard());
    expect(state).not.toHaveProperty("elapsedMs");
    expect(state).not.toHaveProperty("elapsedAttemptTime");
    attemptMove(state, posId({ layer: 1, row: 5, col: 3 }));
    const turn = state.turn;
    const historyLen = state.moveHistory?.length ?? 0;
    restoreLayerEntrySnapshot(state, 1);
    expect(state.turn).toBe(turn);
    expect(state.moveHistory?.length ?? 0).toBe(historyLen);
  });

  it("TEST 11 — Consumed Red A preserved", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    markEncounterConsumed(state, "red_A");
    passTurn(state);
    restoreLayerEntrySnapshot(state, 3);
    expect(isEncounterConsumed(state, "red_A")).toBe(true);
  });

  it("TEST 12 — Consumed Red A+B preserved", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    markEncounterConsumed(state, "red_A");
    markEncounterConsumed(state, "red_B");
    passTurn(state);
    restoreLayerEntrySnapshot(state, 3);
    expect(isEncounterConsumed(state, "red_A")).toBe(true);
    expect(isEncounterConsumed(state, "red_B")).toBe(true);
  });

  it("TEST 13 — No encounter auto-trigger on restore", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    markEncounterConsumed(state, "red_A");
    const consumedBefore = Array.from(state.consumedEncounterIds ?? []);
    restoreLayerEntrySnapshot(state, 3);
    expect(Array.from(state.consumedEncounterIds ?? [])).toEqual(consumedBefore);
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: "red_A",
        consumed: state.consumedEncounterIds,
        landedOnGoal: false,
      })
    ).toBe(false);
  });

  it("TEST 14 — Revisit consumed Red after restore does not retrigger", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    markEncounterConsumed(state, "red_A");
    restoreLayerEntrySnapshot(state, 3);
    sameRowStep(state, 2);
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: "red_A",
        consumed: state.consumedEncounterIds,
        landedOnGoal: false,
      })
    ).toBe(false);
  });

  it("TEST 15 — UP portal entry snapshot correct", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const snap = getLayerEntrySnapshot(state, 3)!;
    expect(snap.playerHexId).toBe(posId({ layer: 3, row: 6, col: 3 }));
    expect(snap.movementActiveLayers).toContain(3);
  });

  it("TEST 16 — DOWN/re-entry snapshot correct", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    attemptMove(state, posId({ layer: 3, row: 6, col: 4 }));
    expect(state.playerHexId).toBe(posId({ layer: 2, row: 6, col: 3 }));
    const downSnap = getLayerEntrySnapshot(state, 2)!;
    expect(downSnap.playerHexId).toBe(posId({ layer: 2, row: 6, col: 3 }));
    attemptMove(state, posId({ layer: 2, row: 5, col: 3 }));
    expect(getLayerEntrySnapshot(state, 3)!.playerHexId).toBe(posId({ layer: 3, row: 4, col: 3 }));
  });

  it("TEST 17 — Portal does not auto-trigger on restore", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const dest = state.playerHexId;
    sameRowStep(state, 2);
    restoreLayerEntrySnapshot(state, 3);
    expect(state.playerHexId).toBe(dest);
    expect(state.playerHexId.startsWith("L3-")).toBe(true);
    expect(attemptMove(state, posId({ layer: 3, row: 6, col: 4 })).ok).toBe(true);
    expect(state.playerHexId).toBe(posId({ layer: 2, row: 6, col: 3 }));
  });

  it("TEST 18 — Visibility runtime state restores/recomputes correctly", () => {
    const state = newGame(openBoard({ revealOnEnterGuaranteedUp: true }));
    const startRevealed = [...state.hexesById.values()].filter((h) => h.revealed).map((h) => h.id);
    const extra = posId({ layer: 1, row: 0, col: 0 });
    const hex = state.hexesById.get(extra)!;
    hex.revealed = true;
    restoreLayerEntrySnapshot(state, 1);
    const after = [...state.hexesById.values()].filter((h) => h.revealed).map((h) => h.id).sort();
    expect(after).toEqual([...startRevealed].sort());
    expect(state.hexesById.get(extra)!.revealed).toBe(false);
  });

  it("TEST 19 — Goal priority remains correct", () => {
    const s = openBoard({
      start: { layer: 1, row: 3, col: 2 },
      goal: { layer: 1, row: 3, col: 3 },
    });
    const state = newGame(s);
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
    expect(attemptMove(state, posId({ layer: 1, row: 3, col: 3 })).ok).toBe(true);
    expect(evaluateAttemptTerminal(state).kind).toBe("success");
    restoreLayerEntrySnapshot(state, 1);
    expect(state.playerHexId).toBe(posId({ layer: 1, row: 3, col: 2 }));
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
  });

  it("TEST 20 — STRANDED semantics remain authoritative", () => {
    const all: NonNullable<Scenario["missing"]> = [];
    for (let row = 0; row < ROW_LENS.length; row++) {
      for (let col = 0; col < ROW_LENS[row]!; col++) {
        all.push({ layer: 1, row, col });
      }
    }
    const missing = all.filter((p) => {
      const keep =
        (p.row === 3 && p.col === 3) ||
        (p.row === 2 && p.col === 3) ||
        (p.row === 0 && p.col === 0);
      return !keep;
    });
    const s = openBoard({
      start: { layer: 1, row: 3, col: 3 },
      goal: { layer: 1, row: 0, col: 0 },
      missing,
      movement: {
        ...noneMovement(),
        "1": {
          rows: {
            "0": { direction: "NONE", amount: 0 },
            "1": { direction: "NONE", amount: 0 },
            "2": { direction: "LEFT", amount: 1 },
            "3": { direction: "NONE", amount: 0 },
            "4": { direction: "NONE", amount: 0 },
            "5": { direction: "NONE", amount: 0 },
            "6": { direction: "NONE", amount: 0 },
          },
        },
      },
    });
    const state = newGame(s);
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
    expect(listLegalSuccessfulMoveTargets(state)).toEqual(["L1-R2-C3"]);
    expect(attemptMove(state, "L1-R2-C3").ok).toBe(true);
    expect(evaluateAttemptTerminal(state).kind).toBe("stranded");
    restoreLayerEntrySnapshot(state, 1);
    expect(state.playerHexId).toBe("L1-R3-C3");
    expect(evaluateAttemptTerminal(state).kind).toBe("playing");
    expect(listLegalSuccessfulMoveTargets(state).length).toBeGreaterThan(0);
  });

  it("TEST 21 — Retry clears old snapshots", () => {
    const s = portalBoard();
    const a1 = newGame(s);
    enterL3FromL1(a1);
    expect(listLayerEntrySnapshotLayers(a1)).toContain(3);
    const a2 = newGame(s);
    expect(listLayerEntrySnapshotLayers(a2)).toEqual([1]);
    expect(getLayerEntrySnapshot(a2, 3)).toBeNull();
  });

  it("TEST 22 — Replay/new attempt clears old snapshots", () => {
    const s = portalBoard();
    const first = newGame(s);
    enterL3FromL1(first);
    const replay = newGame(s);
    expect(replay.layerEntrySnapshots).not.toBe(first.layerEntrySnapshots);
    expect(getLayerEntrySnapshot(replay, 3)).toBeNull();
    expect(getLayerEntrySnapshot(replay, 1)?.playerHexId).toBe(posId({ layer: 1, row: 6, col: 3 }));
  });

  it("TEST 23 — Missing snapshot fails safely", () => {
    const state = newGame(openBoard());
    const pos = state.playerHexId;
    const turn = state.turn;
    const result = restoreLayerEntrySnapshot(state, 7);
    expect(result.status).toBe("no_snapshot");
    expect(state.playerHexId).toBe(pos);
    expect(state.turn).toBe(turn);
  });

  it("TEST 24 — Snapshot mutation isolation", () => {
    const state = newGame(openBoard());
    const before = JSON.stringify(getLayerEntrySnapshot(state, 1));
    const live = state.rows.get(1)![6]!;
    live.reverse();
    state.visibleLayers.add(7);
    expect(JSON.stringify(getLayerEntrySnapshot(state, 1))).toBe(before);
  });

  it("TEST 25 — Restored-state mutation does not mutate stored snapshot", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const storedBefore = JSON.stringify(getLayerEntrySnapshot(state, 3));
    restoreLayerEntrySnapshot(state, 3);
    state.rows.get(3)![6]!.reverse();
    state.playerHexId = posId({ layer: 3, row: 0, col: 0 });
    expect(JSON.stringify(getLayerEntrySnapshot(state, 3))).toBe(storedBefore);
  });

  it("TEST 26 — No persistent storage writes", () => {
    const before = interestingStorage();
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    markEncounterConsumed(state, "red_A");
    restoreLayerEntrySnapshot(state, 3);
    expect(interestingStorage()).toEqual(before);
  });

  it("TEST 27 — Solver state key unchanged unless explicitly justified", () => {
    const state = newGame(portalBoard());
    const keyBefore = solverStateKey(snapshotStateLite(state));
    enterL3FromL1(state);
    const lite = snapshotStateLite(state);
    expect(JSON.stringify(lite)).not.toContain("layerEntry");
    expect(JSON.stringify(snapshotState(state))).not.toContain("layerEntry");
    markEncounterConsumed(state, "red_A");
    const keyAfterConsume = solverStateKey(snapshotStateLite(state));
    restoreLayerEntrySnapshot(state, 3);
    const keyAfterRestore = solverStateKey(snapshotStateLite(state));
    expect(typeof keyBefore).toBe("string");
    expect(keyAfterConsume).toBe(keyAfterRestore);
  });

  it("TEST 28 — Simulator/Worker serialization safe", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    expect(() => structuredClone(snapshotStateLite(state))).not.toThrow();
    expect(() => structuredClone(snapshotState(state))).not.toThrow();
    const track = createEmptyTrack("t", "sc", "w", "T");
    const req = { type: "run" as const, runId: 1, track };
    expect(() => structuredClone(req)).not.toThrow();
    const lite = restoreStateLite(state, snapshotStateLite(state));
    expect(lite.analysisSafe).toBe(true);
    expect(lite.layerEntrySnapshots).toBeUndefined();
    captureLayerEntrySnapshot(lite, 3);
    expect(lite.layerEntrySnapshots).toBeUndefined();
  });

  it("TEST 29 — Sevenfold resource safety unchanged", () => {
    const raw = JSON.parse(
      readFileSync(join(root, "src/studio/trackPlanner/fixtures/sevenfoldLabyrinth.json"), "utf8")
    );
    const track = scenarioJsonToTrack(
      createEmptyTrack(raw.id, "diag", "diag_world", raw.name),
      raw
    );
    const result = runSimulator(track, { budget: DEFAULT_SIMULATOR_BUDGET });
    expect(result.solverOutcome).toBe("search_limit");
    expect(result.strandingSummaryLabel).toMatch(/Unknown/);
  });

  it("TEST 30 — Legacy Red encounter behaviour unchanged", () => {
    const state = newGame(openBoard());
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: "legacy_card_L1_R5_C3",
        consumed: state.consumedEncounterIds,
        landedOnGoal: false,
      })
    ).toBe(true);
    markEncounterConsumed(state, "legacy_card_L1_R5_C3");
    restoreLayerEntrySnapshot(state, 1);
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: "legacy_card_L1_R5_C3",
        consumed: state.consumedEncounterIds,
        landedOnGoal: false,
      })
    ).toBe(false);
  });

  it("Wrong tap does not capture or restore", () => {
    const state = newGame(openBoard());
    const before = getLayerEntrySnapshot(state, 1);
    const far = attemptMoveToSlot(state, { layer: 1, row: 0, col: 0 });
    expect(far.result).toBe("UNREACHABLE");
    expect(getLayerEntrySnapshot(state, 1)).toEqual(before);
  });

  it("Encounter Continue (consume) does not replace snapshot", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    const before = getLayerEntrySnapshot(state, 3);
    markEncounterConsumed(state, "red_A");
    expect(getLayerEntrySnapshot(state, 3)).toEqual(before);
  });

  it("UI enterLayer browse does not capture", () => {
    const state = newGame(openBoard());
    enterLayer(state, 4);
    expect(getLayerEntrySnapshot(state, 4)).toBeNull();
  });

  it("Invalid snapshot fails without mutating live state", () => {
    const state = newGame(openBoard());
    const pos = state.playerHexId;
    state.layerEntrySnapshots!.set(1, {
      layer: 1,
      playerHexId: "NOT-A-HEX",
      visibleLayers: [1],
      movementActiveLayers: [1],
      rows: [{ layer: 1, rows: [["L1-R0-C0"]] }],
      revealedHexIds: [],
    });
    const result = restoreLayerEntrySnapshot(state, 1);
    expect(result.status).toBe("invalid_snapshot");
    expect(state.playerHexId).toBe(pos);
  });

  it("Re-entry + consumed history uses newest snapshot", () => {
    const state = newGame(portalBoard());
    enterL3FromL1(state);
    markEncounterConsumed(state, "red_A");
    attemptMove(state, posId({ layer: 3, row: 6, col: 4 }));
    attemptMove(state, posId({ layer: 2, row: 5, col: 3 }));
    expect(state.playerHexId).toBe(posId({ layer: 3, row: 4, col: 3 }));
    restoreLayerEntrySnapshot(state, 3);
    expect(state.playerHexId).toBe(posId({ layer: 3, row: 4, col: 3 }));
    expect(isEncounterConsumed(state, "red_A")).toBe(true);
  });

  it("endTurn / pass without portal does not capture other layers", () => {
    const state = newGame(openBoard());
    endTurn(state);
    expect(listLayerEntrySnapshotLayers(state)).toEqual([1]);
  });
});
