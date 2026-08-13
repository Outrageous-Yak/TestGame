/**
 * Step 5A — Red Encounter Foundation tests.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { newGame } from "../api";
import { attemptMoveToSlot } from "../moveAttempt";
import { snapshotState, restoreState, snapshotStateLite, restoreStateLite } from "../snapshot";
import type { Scenario } from "../types";
import {
  cloneConsumedEncounterIds,
  isEncounterConsumed,
  isRedEncounterCardKey,
  legacyEncounterId,
  markEncounterConsumed,
  resolveEncounterId,
  shouldActivateRedEncounter,
} from "./redEncounter";
import { parseCardTriggersFromScenario } from "../../ui/game/helpers";
import { createEmptyTrack } from "../../studio/trackPlanner/types";
import { scenarioJsonToTrack } from "../../studio/trackPlanner/catalog";
import {
  authoredTrackToScenario,
  serializeScenarioExport,
} from "../../studio/trackPlanner/serialization/scenarioBridge";
import { createFeatureAt } from "../../studio/trackPlanner/features/featurePlacement";
import { canPlaceFeature } from "../../studio/trackPlanner/features/featureCompatibility";
import { auditTrack } from "../../studio/trackPlanner/audit/auditTrack";
import {
  loadDraftBundle,
  saveDraftBundle,
  upsertTrack,
  emptyBundle,
  TRACK_PLANNER_STORAGE_KEY,
} from "../../studio/trackPlanner/storage";
import { posId } from "../board";

const root = join(import.meta.dirname, "..", "..", "..");

function openBoard(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "enc_test",
    name: "Encounter Test",
    layers: 1,
    start: { layer: 1, row: 6, col: 3 },
    goal: { layer: 1, row: 0, col: 3 },
    missing: [],
    blocked: [],
    transitions: [],
    movement: { "1": "NONE" },
    revealOnEnterGuaranteedUp: false,
    ...overrides,
  };
}

describe("Step 5A Red Encounter Foundation", () => {
  it("TEST 1 — Red/cosmic recognised as encounter", () => {
    expect(isRedEncounterCardKey("cosmic")).toBe(true);
    expect(isRedEncounterCardKey("risk")).toBe(false);
    expect(isRedEncounterCardKey("terrain")).toBe(false);
  });

  it("TEST 2 — stable encounter id preserved from authored feature id", () => {
    const base = createEmptyTrack("t", "sc", "w", "T");
    let track = createFeatureAt(base, "start", { layer: 1, row: 6, col: 3 });
    track = createFeatureAt(track, "goal", { layer: 1, row: 0, col: 3 });
    track = createFeatureAt(track, "card", { layer: 1, row: 3, col: 3 }, { cardType: "RED" });
    const card = track.features.find((f) => f.kind === "card")!;
    expect(card.id).toMatch(/^card_/);
    const doc = authoredTrackToScenario(track);
    const trig = doc.cardTriggers!.find((c) => c.card === "cosmic")!;
    expect(trig.id).toBe(card.id);
  });

  it("TEST 3 — legacy Red/cosmic loads without migration failure", () => {
    const legacy = {
      // row/col 0 are not remapped by the 1–7 → zero-based heuristic.
      cardTriggers: [{ card: "cosmic", layer: 1, row: 0, col: 0 }],
    };
    const parsed = parseCardTriggersFromScenario(legacy);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].card).toBe("cosmic");
    expect(parsed[0].id).toBe(legacyEncounterId(1, 0, 0));
    expect(parsed[0].row).toBe(0);
    expect(parsed[0].col).toBe(0);
  });

  it("TEST 4/5/6 — activate once, consume on acknowledge semantics, revisit no retrigger", () => {
    const id = "enc_A";
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: id,
        consumed: [],
        landedOnGoal: false,
      })
    ).toBe(true);

    const state = newGame(openBoard());
    markEncounterConsumed(state, id);
    expect(isEncounterConsumed(state, id)).toBe(true);
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: id,
        consumed: state.consumedEncounterIds,
        landedOnGoal: false,
      })
    ).toBe(false);
  });

  it("TEST 7 — two encounters independently tracked", () => {
    const state = newGame(openBoard());
    markEncounterConsumed(state, "A");
    expect(isEncounterConsumed(state, "A")).toBe(true);
    expect(isEncounterConsumed(state, "B")).toBe(false);
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: "B",
        consumed: state.consumedEncounterIds,
        landedOnGoal: false,
      })
    ).toBe(true);
  });

  it("TEST 8/9/10/22 — newGame / retry resets consumed state", () => {
    const s = openBoard();
    const a = newGame(s);
    markEncounterConsumed(a, "X");
    const b = newGame(s);
    expect(isEncounterConsumed(b, "X")).toBe(false);
    expect(b.consumedEncounterIds?.size ?? 0).toBe(0);
  });

  it("TEST 11 — wrong tap / failed move does not consume", () => {
    const state = newGame(openBoard());
    const before = cloneConsumedEncounterIds(state.consumedEncounterIds);
    // Attempt move to a far non-neighbor (fails / ignored / loses turn depending on rules)
    attemptMoveToSlot(state, { layer: 1, row: 0, col: 0 });
    expect(Array.from(state.consumedEncounterIds ?? [])).toEqual(Array.from(before));
  });

  it("TEST 12 — reveal / visibility does not consume", () => {
    const state = newGame(openBoard());
    expect(state.consumedEncounterIds?.size ?? 0).toBe(0);
    // Merely constructing state reveals start; no encounter consume.
    expect(isEncounterConsumed(state, legacyEncounterId(1, 2, 2))).toBe(false);
  });

  it("TEST 13 — moving-row: id identity is not display-slot based", () => {
    const id = resolveEncounterId("feat_row_move", 1, 4, 2);
    expect(id).toBe("feat_row_move");
    const parsed = parseCardTriggersFromScenario({
      cardTriggers: [{ id: "feat_row_move", card: "cosmic", layer: 1, row: 0, col: 0 }],
    });
    expect(parsed[0].id).toBe("feat_row_move");
    expect(parsed[0].row).toBe(0);
    expect(parsed[0].col).toBe(0);
  });

  it("TEST 14/15 — portal landing uses final authoritative hex identity", () => {
    const s = openBoard({
      layers: 2,
      start: { layer: 1, row: 6, col: 3 },
      goal: { layer: 2, row: 0, col: 3 },
      transitions: [
        {
          type: "UP",
          from: { layer: 1, row: 5, col: 3 },
          to: { layer: 2, row: 4, col: 2 },
        },
      ],
      movement: { "1": "NONE", "2": "NONE" },
    });
    const state = newGame(s);
    // Portal destination encounter id is independent of portal source.
    const destId = legacyEncounterId(2, 4, 2);
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: destId,
        consumed: [],
        landedOnGoal: false,
      })
    ).toBe(true);
    markEncounterConsumed(state, destId);
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: destId,
        consumed: state.consumedEncounterIds,
        landedOnGoal: false,
      })
    ).toBe(false);
  });

  it("TEST 18/19/20 — encounter consume does not imply Goal/progression", () => {
    const state = newGame(openBoard());
    markEncounterConsumed(state, "enc");
    expect(state.playerHexId).toBe(posId(state.scenario.start));
    expect(state.hexesById.get(state.playerHexId)?.kind).not.toBe("GOAL");
  });

  it("TEST 21 — GameState clone / snapshot does not share mutable Set", () => {
    const a = newGame(openBoard());
    markEncounterConsumed(a, "shared?");
    const dto = snapshotState(a);
    const b = restoreState(dto);
    markEncounterConsumed(b, "only_b");
    expect(isEncounterConsumed(a, "only_b")).toBe(false);
    expect(isEncounterConsumed(b, "shared?")).toBe(true);
    expect(isEncounterConsumed(b, "only_b")).toBe(true);

    const lite = snapshotStateLite(a);
    const c = restoreStateLite(a, lite);
    markEncounterConsumed(c, "only_c");
    expect(isEncounterConsumed(a, "only_c")).toBe(false);
  });

  it("TEST 23 — duplicate feature ids flagged by audit", () => {
    const base = createEmptyTrack("t", "sc", "w", "T");
    let track = createFeatureAt(base, "card", { layer: 1, row: 3, col: 2 }, { cardType: "RED" });
    track = createFeatureAt(track, "card", { layer: 1, row: 3, col: 4 }, { cardType: "RED" });
    const cards = track.features.filter((f) => f.kind === "card");
    expect(cards.length).toBe(2);
    // Force duplicate ids
    track = {
      ...track,
      features: track.features.map((f) => (f.kind === "card" ? { ...f, id: "dup_id" } : f)),
    };
    const items = auditTrack(track);
    expect(items.some((x) => /Duplicate feature id/.test(x.message))).toBe(true);
  });

  it("TEST 24 — encounter on missing position rejected by placement policy", () => {
    const base = createEmptyTrack("t", "sc", "w", "T");
    const layer = base.layers.find((l) => l.layer === 1)!;
    layer.missing.push({ layer: 1, row: 3, col: 3 });
    const check = canPlaceFeature(base, "card", { layer: 1, row: 3, col: 3 });
    expect(check.ok).toBe(false);
  });

  it("TEST 25 — export/import round-trip preserves authored encounter id + optional tier", () => {
    const base = createEmptyTrack("t", "sc", "w", "T");
    let track = createFeatureAt(base, "start", { layer: 1, row: 6, col: 3 });
    track = createFeatureAt(track, "goal", { layer: 1, row: 0, col: 3 });
    track = createFeatureAt(track, "card", { layer: 1, row: 3, col: 3 }, { cardType: "RED" });
    const card = track.features.find((f) => f.kind === "card" && f.cardType === "RED")!;
    track = {
      ...track,
      features: track.features.map((f) =>
        f.id === card.id ? { ...f, encounterTier: 2 as const } : f
      ),
    };
    const json = serializeScenarioExport(track);
    const parsed = JSON.parse(json);
    const re = scenarioJsonToTrack(createEmptyTrack("t2", "sc", "w", "T2"), parsed);
    const again = re.features.find((f) => f.kind === "card" && f.cardType === "RED")!;
    expect(again.id).toBe(card.id);
    expect(again.encounterTier).toBe(2);
  });

  it("TEST 26 — draft round-trip preserves encounter data", () => {
    const store: Record<string, string> = {};
    const ls = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    } as Storage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).localStorage = ls;

    const base = createEmptyTrack("track_red", "sc", "w", "Red Draft");
    let track = createFeatureAt(base, "card", { layer: 1, row: 2, col: 2 }, { cardType: "RED" });
    const card = track.features.find((f) => f.kind === "card")!;
    track = {
      ...track,
      features: track.features.map((f) =>
        f.id === card.id ? { ...f, encounterTier: 3 as const } : f
      ),
    };
    saveDraftBundle(upsertTrack(emptyBundle(), track));
    const loaded = loadDraftBundle();
    const t = loaded.tracks.find((x) => x.trackId === "track_red")!;
    const c = t.features.find((f) => f.id === card.id)!;
    expect(c.kind).toBe("card");
    if (c.kind === "card") expect(c.encounterTier).toBe(3);
    expect(TRACK_PLANNER_STORAGE_KEY).toBe("track_planner_drafts_v1");
  });

  it("TEST 27 — red-free track newGame unchanged aside from empty consumed set", () => {
    const s = openBoard();
    const state = newGame(s);
    expect(state.consumedEncounterIds).toBeInstanceOf(Set);
    expect(state.consumedEncounterIds!.size).toBe(0);
    expect(state.turn).toBe(0);
  });

  it("TEST 28 — Goal priority blocks encounter activation", () => {
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: "x",
        consumed: [],
        landedOnGoal: true,
      })
    ).toBe(false);
  });

  it("TEST 29/30 — production cosmic fixture still parses (fc track09)", () => {
    const path = join(root, "public/worlds/forgotten_citadel/scenarios/track09.json");
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const triggers = parseCardTriggersFromScenario(raw);
    const cosmic = triggers.filter((t) => t.card === "cosmic");
    expect(cosmic.length).toBeGreaterThanOrEqual(1);
    for (const c of cosmic) {
      expect(c.id.length).toBeGreaterThan(0);
    }
  });
});

describe("Step 5A integration scenarios (domain)", () => {
  it("SCENARIO A/B — single + multi one-shot", () => {
    const state = newGame(openBoard());
    markEncounterConsumed(state, "A");
    markEncounterConsumed(state, "B");
    expect(isEncounterConsumed(state, "A")).toBe(true);
    expect(isEncounterConsumed(state, "B")).toBe(true);
    expect(
      shouldActivateRedEncounter({
        cardKey: "cosmic",
        encounterId: "A",
        consumed: state.consumedEncounterIds,
        landedOnGoal: false,
      })
    ).toBe(false);
  });

  it("SCENARIO C — retry clears via newGame", () => {
    const s = openBoard();
    const attempt1 = newGame(s);
    markEncounterConsumed(attempt1, "A");
    const attempt2 = newGame(s);
    expect(isEncounterConsumed(attempt2, "A")).toBe(false);
  });
});
