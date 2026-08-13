import { describe, it, expect } from "vitest";
import { posId } from "../../engine/board";
import { hexIdAtSlot, findSlot } from "../../engine/layout";
import { createEmptyTrack } from "./types";
import { cloneTrack } from "./state/authoringState";
import {
  activatePlayerLayerMovement,
  freshLayerPlaytestState,
  layerFromHexId,
  placePlaytestPlayer,
  playtestPassTurn,
  playtestReachableIds,
  playtestTryMove,
  snapshotTrackDraft,
  cardFeedbackAtPlayer,
  playtestVisibilitySummary,
  playtestLayerEntrySnapshot,
  playtestLayerEntrySnapshotLayers,
} from "./simulation/layerPlaytest";
import { PROGRESSION_STORAGE_KEY } from "../../progression/storage";
import { CAMPAIGN_MAP_DRAFTS_KEY } from "../../campaign/storage";

function sampleTrack() {
  const track = createEmptyTrack("pt1", "citadel_path", "forgotten_citadel", "Playtest");
  track.features = [
    { kind: "start", id: "start_1", position: { layer: 1, row: 3, col: 1 } },
    { kind: "goal", id: "goal_1", position: { layer: 2, row: 3, col: 1 } },
    {
      kind: "portal",
      id: "portal_1",
      source: { layer: 1, row: 3, col: 2 },
      destination: { layer: 2, row: 3, col: 2 },
      direction: "UP",
    },
    {
      kind: "card",
      id: "card_red",
      position: { layer: 1, row: 2, col: 1 },
      cardType: "RED",
    },
  ];
  // Layer 1 row 3 moves RIGHT by 1
  track.layers[0].rowMovement["3"] = { direction: "RIGHT", amount: 1 };
  // Layer 2 also moves for multi-row check
  track.layers[1].rowMovement["3"] = { direction: "LEFT", amount: 1 };
  return track;
}

describe("Layer Playtest", () => {
  it("does not alter authored Start when placing temporary player", () => {
    const track = sampleTrack();
    const before = snapshotTrackDraft(track);
    const startBefore = track.features.find((f) => f.kind === "start")!.position;
    const state = freshLayerPlaytestState(track);
    const alt = posId({ layer: 1, row: 4, col: 2 });
    placePlaytestPlayer(state, alt);
    expect(state.playerHexId).toBe(alt);
    expect(track.features.find((f) => f.kind === "start")!.position).toEqual(startBefore);
    expect(snapshotTrackDraft(track)).toBe(before);
  });

  it("manual movement uses authoritative adjacency", () => {
    const track = sampleTrack();
    const state = freshLayerPlaytestState(track);
    const neighbors = playtestReachableIds(state);
    expect(neighbors.length).toBeGreaterThan(0);
    const target = neighbors[0];
    const res = playtestTryMove(state, target);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state.playerHexId).toBe(target);

    const far = posId({ layer: 1, row: 0, col: 0 });
    const bad = playtestTryMove(freshLayerPlaytestState(track), far);
    expect(bad.ok).toBe(false);
  });

  it("pass turn moves authored rows without mutating draft", () => {
    const track = sampleTrack();
    const before = snapshotTrackDraft(track);
    const state = freshLayerPlaytestState(track);
    activatePlayerLayerMovement(state);
    const startId = state.playerHexId;
    const slotBefore = findSlot(state, 1, startId);
    playtestPassTurn(state);
    const slotAfter = findSlot(state, 1, startId);
    expect(slotBefore).not.toBeNull();
    expect(slotAfter).not.toBeNull();
    // RIGHT shift on row 3: display col increases (wrap)
    expect(slotAfter!.col).not.toBe(slotBefore!.col);
    expect(state.turn).toBe(1);
    expect(snapshotTrackDraft(track)).toBe(before);
  });

  it("Layer 1 movement works", () => {
    const track = sampleTrack();
    const state = freshLayerPlaytestState(track);
    expect(layerFromHexId(state.playerHexId)).toBe(1);
    activatePlayerLayerMovement(state);
    expect(state.movementActiveLayers.has(1)).toBe(true);
    const id = state.playerHexId;
    const before = findSlot(state, 1, id)!.col;
    playtestPassTurn(state);
    expect(findSlot(state, 1, id)!.col).not.toBe(before);
  });

  it("multiple moving rows can be active across layers", () => {
    const track = sampleTrack();
    const state = freshLayerPlaytestState(track);
    // Move player to layer 2 via placement so both layers can be activated
    placePlaytestPlayer(state, posId({ layer: 2, row: 3, col: 1 }));
    state.movementActiveLayers.add(1);
    state.movementActiveLayers.add(2);
    const l1Id = hexIdAtSlot(state, 1, 3, 0)!;
    const l2Id = hexIdAtSlot(state, 2, 3, 0)!;
    const c1 = findSlot(state, 1, l1Id)!.col;
    const c2 = findSlot(state, 2, l2Id)!.col;
    playtestPassTurn(state);
    expect(findSlot(state, 1, l1Id)!.col).not.toBe(c1);
    expect(findSlot(state, 2, l2Id)!.col).not.toBe(c2);
  });

  it("blocks placement on missing geometry", () => {
    const track = sampleTrack();
    track.layers[0].missing.push({ layer: 1, row: 1, col: 1 });
    const state = freshLayerPlaytestState(track);
    const missingId = posId({ layer: 1, row: 1, col: 1 });
    expect(state.hexesById.get(missingId)?.missing).toBe(true);
    const before = state.playerHexId;
    placePlaytestPlayer(state, missingId);
    expect(state.playerHexId).toBe(before);
  });

  it("portal transition switches destination layer", () => {
    const track = sampleTrack();
    const state = freshLayerPlaytestState(track);
    // Place next to portal source and step onto it
    placePlaytestPlayer(state, posId({ layer: 1, row: 3, col: 1 }));
    const portalId = posId({ layer: 1, row: 3, col: 2 });
    const neighbors = playtestReachableIds(state);
    expect(neighbors).toContain(portalId);
    const res = playtestTryMove(state, portalId);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.triggeredTransition).toBe(true);
      expect(layerFromHexId(res.state.playerHexId)).toBe(2);
      expect(res.state.playerHexId).toBe(posId({ layer: 2, row: 3, col: 2 }));
    }
  });

  it("reset restores temporary state and leaves draft unchanged", () => {
    const track = sampleTrack();
    const before = snapshotTrackDraft(track);
    let state = freshLayerPlaytestState(track);
    const startId = state.playerHexId;
    placePlaytestPlayer(state, posId({ layer: 1, row: 4, col: 0 }));
    playtestPassTurn(state);
    expect(state.playerHexId).not.toBe(startId);
    state = freshLayerPlaytestState(cloneTrack(track));
    activatePlayerLayerMovement(state);
    expect(state.playerHexId).toBe(startId);
    expect(state.turn).toBe(0);
    expect(snapshotTrackDraft(track)).toBe(before);
  });

  it("playtest helpers do not write storage domains", () => {
    const store: Record<string, string> = {
      [PROGRESSION_STORAGE_KEY]: '{"version":1,"completedTracks":{},"seenMechanicIntroductions":[]}',
      track_planner_drafts_v1: '{"version":1,"worlds":[],"scenarios":[],"tracks":[],"updatedAt":"x"}',
      [CAMPAIGN_MAP_DRAFTS_KEY]: '{"version":1,"maps":[],"updatedAt":"x"}',
      "hexgame-best:x:y": "3",
    };
    const ls = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });

    const track = sampleTrack();
    const state = freshLayerPlaytestState(track);
    placePlaytestPlayer(state, posId({ layer: 1, row: 4, col: 1 }));
    playtestPassTurn(state);
    const n = playtestReachableIds(state)[0];
    if (n) playtestTryMove(state, n);

    expect(store[PROGRESSION_STORAGE_KEY]).toContain("completedTracks");
    expect(store.track_planner_drafts_v1).toContain('"tracks":[]');
    expect(store[CAMPAIGN_MAP_DRAFTS_KEY]).toContain('"maps":[]');
    expect(store["hexgame-best:x:y"]).toBe("3");

    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });

  it("reports RED card feedback and visibility summary without mutation", () => {
    const track = sampleTrack();
    track.visibility = [
      { id: "v1", state: "PARTLY_CLOUDY", coverage: "FULL_BOARD", positions: [] },
    ];
    const before = snapshotTrackDraft(track);
    const state = freshLayerPlaytestState(track);
    placePlaytestPlayer(state, posId({ layer: 1, row: 2, col: 1 }));
    const fb = cardFeedbackAtPlayer(track, state);
    expect(fb.kind).toBe("red");
    expect(playtestVisibilitySummary(track)).toContain("Partly Cloudy");
    expect(snapshotTrackDraft(track)).toBe(before);
  });

  it("captures an initial layer-entry snapshot without mutating the draft", () => {
    const track = sampleTrack();
    const before = snapshotTrackDraft(track);
    const state = freshLayerPlaytestState(track);
    expect(playtestLayerEntrySnapshotLayers(state)).toEqual([1]);
    const snap = playtestLayerEntrySnapshot(state, 1);
    expect(snap?.playerHexId).toBe(posId({ layer: 1, row: 3, col: 1 }));
    const portalRes = playtestTryMove(state, posId({ layer: 1, row: 3, col: 2 }));
    expect(portalRes.ok).toBe(true);
    expect(playtestLayerEntrySnapshot(state, 2)?.playerHexId).toBe(
      posId({ layer: 2, row: 3, col: 2 })
    );
    expect(snapshotTrackDraft(track)).toBe(before);
  });
});
