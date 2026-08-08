import { describe, it, expect } from "vitest";
import { createEmptyTrack } from "./types";
import {
  overlayToRuntimeExport,
  runtimeImportToOverlay,
  visibilityOverlaysToRuntimeExport,
  scenarioEntryToDefaultOverlay,
} from "./visibility/visibilityRuntimeMapping";
import { serializeScenarioExport } from "./serialization/scenarioBridge";
import { scenarioJsonToTrack } from "./catalog";
import {
  addMaskPosition,
  posKey,
  dedupeMaskPositions,
} from "./visibility/visibilityMask";
import { validateVisibilityOverlay } from "./visibility/visibilityValidation";
import { buildMovementPreviewState } from "./boardMovementPreview";
import {
  emptyBundle,
  saveDraftBundle,
  upsertTrack,
  upsertVisibilityDraft,
} from "./storage";
import { visibilityDraftKey } from "./catalogKeys";
import { PROGRESSION_STORAGE_KEY } from "../../progression/storage";
import { bestScoreKey } from "../../ui/bestScore";
import { buildPlannerCatalog, seedBundleFromWorlds } from "./catalog";
import { loadWorlds } from "../../ui/worldsLoader";

const ALL_STATES = [
  ["REGULAR", {}, {}],
  ["PARTLY_CLOUDY", { cloudMode: "cloudy" }, {}],
  ["FULL_CLOUD", { cloudMode: "full_cloud" }, {}],
  ["NIGHT", {}, { visibilityMode: "night" }],
  ["INVISIBLE", {}, { visibilityMode: "invisible" }],
  ["MEMORY", {}, { visibilityMode: "memory" }],
  ["LANTERN", {}, { visibilityMode: "lantern" }],
  ["CRYSTAL_VISION", {}, { visibilityMode: "crystal_vision" }],
  ["ECHO", {}, { visibilityMode: "echo" }],
] as const;

describe("Step 5 visibility runtime mapping", () => {
  it.each(ALL_STATES)("maps %s to runtime export", (state, expectedCloud, expectedVis) => {
    const overlay = {
      id: "v1",
      state,
      coverage: "FULL_BOARD" as const,
      positions: [],
      ...(state === "LANTERN" ? { lanternRadius: 3 } : {}),
      ...(state === "MEMORY" ? { memoryRevealSec: 8 } : {}),
    };
    const exp = overlayToRuntimeExport(overlay);
    if (state === "REGULAR") {
      expect(exp.cloudMode).toBeUndefined();
      expect(exp.visibilityMode).toBeUndefined();
    } else if ("cloudMode" in expectedCloud) {
      expect(exp.cloudMode).toBe(expectedCloud.cloudMode);
      expect(exp.visibilityMode).toBeUndefined();
    } else {
      expect(exp.visibilityMode).toBe(expectedVis.visibilityMode);
      expect(exp.cloudMode).toBeUndefined();
    }
  });

  it("clears cloudMode when switching from cloudy to night", () => {
    const cloudy = overlayToRuntimeExport({
      id: "v1",
      state: "PARTLY_CLOUDY",
      coverage: "FULL_BOARD",
      positions: [],
    });
    expect(cloudy.cloudMode).toBe("cloudy");
    const night = overlayToRuntimeExport({
      id: "v1",
      state: "NIGHT",
      coverage: "FULL_BOARD",
      positions: [],
    });
    expect(night.cloudMode).toBeUndefined();
    expect(night.visibilityMode).toBe("night");
  });

  it("preserves lantern radius in export params", () => {
    const exp = overlayToRuntimeExport({
      id: "v1",
      state: "LANTERN",
      coverage: "FULL_BOARD",
      positions: [],
      lanternRadius: 3,
    });
    expect(exp.visibilityParams?.lanternRadius).toBe(3);
  });
});

describe("Step 5 import parity", () => {
  it.each([
    ["cloudy", "PARTLY_CLOUDY"],
    ["full_cloud", "FULL_CLOUD"],
  ] as const)("imports cloudMode %s", (cloudMode, state) => {
    const overlay = runtimeImportToOverlay({ cloudMode });
    expect(overlay.state).toBe(state);
  });

  it.each([
    ["night", "NIGHT"],
    ["invisible", "INVISIBLE"],
    ["memory", "MEMORY"],
    ["lantern", "LANTERN"],
    ["crystal_vision", "CRYSTAL_VISION"],
    ["echo", "ECHO"],
  ] as const)("imports visibilityMode %s", (visibilityMode, state) => {
    const overlay = runtimeImportToOverlay({ visibilityMode });
    expect(overlay.state).toBe(state);
  });

  it("imports from ScenarioEntry seed", () => {
    const overlay = scenarioEntryToDefaultOverlay({ cloudMode: "cloudy" });
    expect(overlay.state).toBe("PARTLY_CLOUDY");
  });
});

describe("Step 5 round trip export/import", () => {
  it.each(ALL_STATES)("round-trips %s", (state) => {
    let track = createEmptyTrack("t1", "sc1", "w1", "Test");
    track.features = [
      { kind: "start", id: "s1", position: { layer: 1, row: 3, col: 0 } },
      { kind: "goal", id: "g1", position: { layer: 1, row: 3, col: 1 } },
    ];
    track.visibility = [
      {
        id: "v1",
        state,
        coverage: "FULL_BOARD",
        positions: [],
        ...(state === "LANTERN" ? { lanternRadius: 3 } : {}),
        ...(state === "MEMORY" ? { memoryRevealSec: 10 } : {}),
      },
    ];
    const json = serializeScenarioExport(track);
    const parsed = JSON.parse(json);
    const reimport = scenarioJsonToTrack(createEmptyTrack("t1", "sc1", "w1", "T"), parsed);
    expect(reimport.visibility[0]?.state).toBe(state);
    if (state === "LANTERN") {
      expect(reimport.visibility[0]?.lanternRadius).toBe(3);
    }
    const runtime = visibilityOverlaysToRuntimeExport(reimport.visibility);
    if (state !== "REGULAR") {
      expect(parsed.cloudMode ?? parsed.visibilityMode).toBeTruthy();
      expect(runtime.cloudMode ?? runtime.visibilityMode).toBeTruthy();
    }
  });
});

describe("Step 5 custom mask", () => {
  it("supports gaps in mask positions", () => {
    const p1 = { layer: 2, row: 1, col: 1 };
    const p2 = { layer: 2, row: 1, col: 3 };
    let positions = addMaskPosition([], p1);
    positions = addMaskPosition(positions, p2);
    expect(positions).toHaveLength(2);
    expect(posKey(p1)).not.toBe(posKey(p2));
  });

  it("dedupes duplicate mask positions", () => {
    const p = { layer: 1, row: 0, col: 0 };
    let positions = addMaskPosition([], p);
    positions = addMaskPosition(positions, p);
    expect(dedupeMaskPositions(positions)).toHaveLength(1);
  });

  it("audit warns custom mask runtime deferred", () => {
    const track = createEmptyTrack("t1", "sc1", "w1", "T");
    track.features = [
      { kind: "start", id: "s1", position: { layer: 1, row: 3, col: 0 } },
      { kind: "goal", id: "g1", position: { layer: 1, row: 3, col: 1 } },
    ];
    track.visibility = [
      {
        id: "v1",
        state: "NIGHT",
        coverage: "CUSTOM",
        positions: [{ layer: 1, row: 0, col: 0 }],
      },
    ];
    const checks = validateVisibilityOverlay(track, track.visibility[0]!, 0, 1);
    expect(checks.some((c) => c.severity === "amber" && c.message.includes("not yet applied"))).toBe(
      true,
    );
  });

  it("keeps mask logical positions during movement preview", () => {
    let track = createEmptyTrack("t1", "sc1", "w1", "T");
    track.features = [
      { kind: "start", id: "s1", position: { layer: 1, row: 3, col: 0 } },
      { kind: "goal", id: "g1", position: { layer: 1, row: 3, col: 1 } },
    ];
    const maskPos = { layer: 2, row: 1, col: 2 };
    track.visibility = [
      { id: "v1", state: "NIGHT", coverage: "CUSTOM", positions: [maskPos] },
    ];
    track.layers[1].rowMovement["1"] = { direction: "RIGHT", amount: 1 };
    const before = track.visibility[0]!.positions[0];
    buildMovementPreviewState(track, 1);
    expect(track.visibility[0]!.positions[0]).toEqual(before);
  });
});

describe("Step 5 visibility draft isolation", () => {
  it("keeps scenario-specific visibility separate from board draft", () => {
    const worlds = loadWorlds();
    const builtIn = seedBundleFromWorlds(worlds);
    let drafts = emptyBundle();
    const cloudy = builtIn.tracks.find(
      (t) => t.scenarioId === "cloudy" && t.trackId === "t1",
    )!;
    const clear = builtIn.tracks.find(
      (t) => t.scenarioId === "prism_path" && t.trackId === "t1",
    )!;
    expect(cloudy.visibility[0]?.state).toBe("PARTLY_CLOUDY");
    expect(clear.visibility[0]?.state).toBe("REGULAR");

    drafts = upsertVisibilityDraft(drafts, cloudy.worldId, cloudy.scenarioId, cloudy.trackId, [
      { id: "v1", state: "FULL_CLOUD", coverage: "FULL_BOARD", positions: [] },
    ]);

    const catalog = buildPlannerCatalog(builtIn, drafts);
    const cloudyAfter = catalog.tracks.find(
      (t) => t.scenarioId === "cloudy" && t.trackId === "t1",
    )!;
    const clearAfter = catalog.tracks.find(
      (t) => t.scenarioId === "prism_path" && t.trackId === "t1",
    )!;
    expect(cloudyAfter.visibility[0]?.state).toBe("FULL_CLOUD");
    expect(clearAfter.visibility[0]?.state).toBe("REGULAR");
    expect(visibilityDraftKey(cloudy.worldId, cloudy.scenarioId, cloudy.trackId)).not.toBe(
      visibilityDraftKey(clear.worldId, clear.scenarioId, clear.trackId),
    );
  });

  it("visibility save does not touch progression or best scores", () => {
    const store: Record<string, string> = {
      [PROGRESSION_STORAGE_KEY]: JSON.stringify({ version: 1, completedTracks: {}, seenMechanicIntroductions: [] }),
      [bestScoreKey("prism_path", "t1")]: "9",
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

    let track = createEmptyTrack("t1", "cloudy", "rainbow_realm", "T");
    track.visibility = [{ id: "v1", state: "NIGHT", coverage: "FULL_BOARD", positions: [] }];
    let drafts = upsertVisibilityDraft(emptyBundle(), track.worldId, track.scenarioId, track.trackId, track.visibility);
    saveDraftBundle(drafts);

    expect(store[PROGRESSION_STORAGE_KEY]).toContain("completedTracks");
    expect(store[bestScoreKey("prism_path", "t1")]).toBe("9");
    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });
});
