import { describe, it, expect } from "vitest";
import { createEmptyTrack } from "./types";
import { createFeatureAt, removeFeatureById, updateFeatureInTrack } from "./features/featurePlacement";
import { canPlaceFeature } from "./features/featureCompatibility";
import { auditTrack, auditSummary, trackStructuralStatus } from "./audit/auditTrack";
import { serializeScenarioExport } from "./serialization/scenarioBridge";
import { scenarioJsonToTrack } from "./catalog";
import { toggleMissingHex, UndoStack, setRowMovement } from "./state/authoringState";
import { buildMovementPreviewState } from "./boardMovementPreview";
import { deleteBoardDraft, upsertTrack, emptyBundle, saveDraftBundle } from "./storage";
import { boardDraftKey } from "./catalogKeys";
import { PROGRESSION_STORAGE_KEY } from "../../progression/storage";
import { bestScoreKey } from "../../ui/bestScore";

function trackWithStartGoal() {
  const track = createEmptyTrack("t1", "sc1", "w1", "Test");
  track.features = [
    { kind: "start", id: "start_1", position: { layer: 1, row: 3, col: 0 } },
    { kind: "goal", id: "goal_1", position: { layer: 1, row: 3, col: 1 } },
  ];
  return track;
}

describe("Step 4 feature placement", () => {
  it("places start and replaces on second placement", () => {
    let track = trackWithStartGoal();
    track = createFeatureAt(track, "start", { layer: 2, row: 1, col: 1 });
    expect(track.features.filter((f) => f.kind === "start")).toHaveLength(1);
    expect(track.features.find((f) => f.kind === "start")?.position.layer).toBe(2);
  });

  it("blocks placement on missing hex", () => {
    let track = trackWithStartGoal();
    track = toggleMissingHex(track, { layer: 1, row: 2, col: 2 }, true);
    const check = canPlaceFeature(track, "card", { layer: 1, row: 2, col: 2 });
    expect(check.ok).toBe(false);
  });

  it("creates distinct RANDOM and HIDDEN card types", () => {
    let track = trackWithStartGoal();
    track = createFeatureAt(track, "card", { layer: 3, row: 1, col: 1 }, { cardType: "RANDOM" });
    track = createFeatureAt(track, "card", { layer: 3, row: 2, col: 1 }, { cardType: "HIDDEN" });
    const random = track.features.find((f) => f.kind === "card" && f.cardType === "RANDOM");
    const hidden = track.features.find((f) => f.kind === "card" && f.cardType === "HIDDEN");
    expect(random).toBeTruthy();
    expect(hidden?.resolvedType).toBe("RED");
  });

  it("supports undo/redo for feature placement", () => {
    const track = trackWithStartGoal();
    const stack = new UndoStack(track);
    const withPortal = createFeatureAt(track, "portal_up", { layer: 2, row: 1, col: 1 });
    stack.push(withPortal);
    expect(stack.current.features.some((f) => f.kind === "portal")).toBe(true);
    stack.undo();
    expect(stack.current.features.some((f) => f.kind === "portal")).toBe(false);
  });
});

describe("Step 4 audit", () => {
  it("returns RED when feature on missing hex", () => {
    let track = trackWithStartGoal();
    track = toggleMissingHex(track, { layer: 1, row: 3, col: 0 }, true);
    const items = auditTrack(track);
    expect(items.some((i) => i.severity === "red" && i.message.includes("missing hex"))).toBe(true);
    expect(trackStructuralStatus(items)).toBe("red");
  });

  it("returns GREEN structural status when valid", () => {
    const track = trackWithStartGoal();
    const items = auditTrack(track);
    expect(trackStructuralStatus(items)).toBe("green");
  });

  it("flags portal destination on missing hex as RED", () => {
    let track = trackWithStartGoal();
    track = createFeatureAt(track, "portal_up", { layer: 2, row: 1, col: 1 });
    track = toggleMissingHex(track, { layer: 3, row: 1, col: 1 }, true);
    const portal = track.features.find((f) => f.kind === "portal")!;
    track = updateFeatureInTrack(track, portal.id, {
      destination: { layer: 3, row: 1, col: 1 },
    });
    const items = auditTrack(track);
    expect(items.some((i) => i.severity === "red" && i.message.includes("missing hex"))).toBe(true);
  });

  it("summary maps to green/amber/red counts", () => {
    let track = trackWithStartGoal();
    track.features.push({
      kind: "card",
      id: "c1",
      position: { layer: 1, row: 0, col: 0 },
      cardType: "RANDOM",
    });
    const summary = auditSummary(auditTrack(track));
    expect(summary.amber).toBeGreaterThan(0);
  });
});

describe("Step 4 round trip", () => {
  it("preserves RANDOM and HIDDEN cards through export/import", () => {
    let track = trackWithStartGoal();
    track = createFeatureAt(track, "card", { layer: 2, row: 0, col: 0 }, { cardType: "RANDOM" });
    track = createFeatureAt(track, "card", { layer: 2, row: 1, col: 0 }, { cardType: "HIDDEN" });
    track = updateFeatureInTrack(track, track.features.find((f) => f.cardType === "HIDDEN")!.id, {
      resolvedType: "BLACK",
    });
    const json = serializeScenarioExport(track);
    const parsed = JSON.parse(json);
    const reimport = scenarioJsonToTrack(createEmptyTrack("t1", "sc1", "w1", "T"), parsed);
    expect(reimport.features.some((f) => f.kind === "card" && f.cardType === "RANDOM")).toBe(true);
    const hidden = reimport.features.find((f) => f.kind === "card" && f.cardType === "HIDDEN");
    expect(hidden?.resolvedType).toBe("BLACK");
  });
});

describe("Step 4 movement preview features", () => {
  it("keeps feature logical position during preview", () => {
    let track = trackWithStartGoal();
    track = createFeatureAt(track, "card", { layer: 2, row: 1, col: 2 }, { cardType: "RED" });
    track = setRowMovement(track, 2, 1, { direction: "RIGHT", amount: 1 });
    const posBefore = track.features.find((f) => f.kind === "card")!.position;
    buildMovementPreviewState(track, 1);
    const posAfter = track.features.find((f) => f.kind === "card")!.position;
    expect(posAfter).toEqual(posBefore);
  });
});

describe("Step 4 t5/t6 and storage", () => {
  it("keeps t5/t6 feature drafts independent", () => {
    let drafts = emptyBundle();
    const t5 = createEmptyTrack("t5", "prism_path", "rainbow_realm", "T5");
    t5.features = trackWithStartGoal().features;
    t5.features.push({
      kind: "card",
      id: "c5",
      position: { layer: 1, row: 0, col: 0 },
      cardType: "RED",
    });
    drafts = upsertTrack(drafts, t5);
    expect(drafts.tracks.find((t) => t.trackId === "t6")).toBeUndefined();
    expect(boardDraftKey("rainbow_realm", "t5")).not.toBe(boardDraftKey("rainbow_realm", "t6"));
  });

  it("feature save does not touch progression or best scores", () => {
    const store: Record<string, string> = {
      [PROGRESSION_STORAGE_KEY]: JSON.stringify({ version: 1, completedTracks: {}, seenMechanicIntroductions: [] }),
      [bestScoreKey("prism_path", "t5")]: "9",
    };
    const ls = {
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      getItem: (k: string) => store[k] ?? null,
      removeItem: (k: string) => {
        delete store[k];
      },
    };
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });

    let track = trackWithStartGoal();
    track = createFeatureAt(track, "card", { layer: 1, row: 1, col: 1 }, { cardType: "BLUE" });
    saveDraftBundle(upsertTrack(emptyBundle(), track));

    expect(store[PROGRESSION_STORAGE_KEY]).toContain("completedTracks");
    expect(store[bestScoreKey("prism_path", "t5")]).toBe("9");
    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });
});
