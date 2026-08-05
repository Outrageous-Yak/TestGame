import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { newGame } from "../api";
import { inBounds, posId } from "../board";
import { assertScenario } from "../scenario";
import type { Pos, Scenario } from "../types";
import { allBoardSlots } from "./boardSlot";
import { neighborBoardSlots } from "./boardNeighbors";
import {
  applyLayerTransformsToScenario,
  buildRuntimeScenario,
  buildTransformCatalog,
  combinationKey,
  getActiveLayerTransformIds,
  getBoardLayerTransformById,
  migrateTransformId,
  migrateTrackTransformSelection,
  preservesAdjacency,
  resolveTrackRunOptions,
  selectLayerTransforms,
  transformBoardDirection,
  transformDirectionForSlot,
  transformPosOnLayer,
} from "./index";
import { buildCanonicalMapById } from "./transformCatalog";
import { discoverUniqueAutomorphismMaps, isIdentityMap, composeMaps } from "./graphAutomorphism";
import type { LayerTransformId, ScenarioDocument } from "./types";
import { loadTrackVariationState, saveTrackVariationState } from "./trackVariationStorage";

const localStorageStore: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(localStorageStore)) delete localStorageStore[key];
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => localStorageStore[key] ?? null,
    setItem: (key: string, value: string) => {
      localStorageStore[key] = value;
    },
    removeItem: (key: string) => {
      delete localStorageStore[key];
    },
  });
});

function testScenario(): Scenario {
  return {
    id: "layer_transform_test",
    name: "Layer Transform Test",
    layers: 7,
    start: { layer: 1, row: 3, col: 1 },
    goal: { layer: 2, row: 2, col: 4 },
    missing: [{ layer: 1, row: 3, col: 2 }],
    blocked: [],
    movement: {
      "1": "NONE",
      "2": {
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
      "3": "NONE",
      "4": "NONE",
      "5": "NONE",
      "6": "NONE",
      "7": "NONE",
    },
    transitions: [
      { type: "UP", from: { layer: 1, row: 4, col: 5 }, to: { layer: 2, row: 3, col: 2 } },
      { type: "UP", from: { layer: 3, row: 2, col: 1 }, to: { layer: 4, row: 2, col: 3 } },
      { type: "DOWN", from: { layer: 5, row: 1, col: 4 }, to: { layer: 4, row: 1, col: 4 } },
    ],
    revealOnEnterGuaranteedUp: false,
    variationRules: { enabled: true },
  };
}

function authoredDocument(): ScenarioDocument {
  return {
    ...testScenario(),
    cardTriggers: [{ card: "risk", layer: 1, row: 2, col: 2 }],
    variationRules: { enabled: true },
  };
}

describe("layer transforms", () => {
  it("catalog documents four variants with expected examples", () => {
    const catalog = buildTransformCatalog();
    expect(catalog).toHaveLength(4);
    expect(catalog[0]).toMatchObject({ id: "identity", playerLabel: "Variant 1", example: "R0C0 → R0C0" });
    expect(catalog[1]).toMatchObject({ id: "reflect-horizontal", playerLabel: "Variant 2", example: "R0C0 → R0C6" });
    expect(catalog[2]).toMatchObject({ id: "symmetry-b", playerLabel: "Variant 3", example: "R0C0 → R6C0" });
    expect(catalog[3]).toMatchObject({ id: "symmetry-c", playerLabel: "Variant 4", example: "R0C0 → R6C6" });
    for (const entry of catalog) {
      expect(entry.involution).toBe(true);
      expect(entry.inverseId).toBe(entry.id);
    }
  });

  it("migrates legacy rotate-* ids to canonical names", () => {
    expect(migrateTransformId("rotate-60")).toBe("reflect-horizontal");
    expect(migrateTransformId("rotate-120")).toBe("symmetry-b");
    expect(migrateTransformId("rotate-240")).toBe("symmetry-c");
    expect(migrateTransformId("reflect-a")).toBe("reflect-horizontal");
    expect(
      migrateTrackTransformSelection({
        seed: "old",
        layerTransforms: { 1: "rotate-120", 2: "rotate-60" },
      })
    ).toEqual({
      seed: "old",
      layerTransforms: { 1: "symmetry-b", 2: "reflect-horizontal" },
    });
  });

  it("every active transform preserves adjacency and bijection", () => {
    const maps = discoverUniqueAutomorphismMaps(500);
    for (const map of maps) {
      expect(preservesAdjacency(map)).toBe(true);
      expect(map.size).toBe(allBoardSlots().length);
    }
  });

  it("non-identity transforms are involutions", () => {
    const maps = buildCanonicalMapById();
    for (const id of getActiveLayerTransformIds()) {
      if (id === "identity") continue;
      const map = maps.get(id)!;
      expect(isIdentityMap(composeMaps(map, map))).toBe(true);
    }
  });

  it("coordinate and direction transforms agree for every transform and direction", () => {
    const maps = buildCanonicalMapById();
    for (const id of getActiveLayerTransformIds()) {
      const map = maps.get(id)!;
      for (const slot of allBoardSlots()) {
        const neighbors = neighborBoardSlots(slot);
        for (let direction = 0; direction < neighbors.length; direction++) {
          const expected = transformDirectionForSlot(direction as 0 | 1 | 2 | 3 | 4 | 5, slot, map);
          expect(expected).not.toBeNull();
          const viaApi = transformBoardDirection(direction as 0 | 1 | 2 | 3 | 4 | 5, id, slot);
          expect(viaApi).toBe(expected);
        }
      }
    }
  });

  it("preserve lifecycle reproduces the same seven-layer selection", () => {
    const authored = authoredDocument();
    const selection = selectLayerTransforms("seven-layer", 7, "seed-seven", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: false,
      allowIdentity: true,
    });

    saveTrackVariationState({
      trackId: "seven-layer",
      runSeed: selection.seed,
      selection,
    });

    const preserved = buildRuntimeScenario(
      authored,
      resolveTrackRunOptions({
        trackId: "seven-layer",
        intent: "preserve",
        stored: loadTrackVariationState("seven-layer"),
        forcedSelection: null,
        variationParam: null,
        devMode: false,
      })
    );

    expect(Object.keys(preserved.selection.layerTransforms)).toHaveLength(7);
    expect(preserved.selection).toEqual(selection);
  });

  it("fresh lifecycle generates a new combination and avoids the previous one when possible", () => {
    const authored = authoredDocument();
    const previous = selectLayerTransforms("lifecycle-fresh", 7, "prev-seed", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: true,
      allowIdentity: true,
    });

    const fresh = buildRuntimeScenario(
      authored,
      resolveTrackRunOptions({
        trackId: "lifecycle-fresh",
        intent: "fresh",
        stored: { trackId: "lifecycle-fresh", runSeed: previous.seed, selection: previous },
        forcedSelection: null,
        variationParam: null,
        devMode: false,
      })
    );

    expect(fresh.selection.seed).not.toBe(previous.seed);
    expect(combinationKey(fresh.selection.layerTransforms)).not.toBe(
      combinationKey(previous.layerTransforms)
    );
  });

  it("replayAfterWin lifecycle generates a new combination while avoiding the previous one", () => {
    const authored = authoredDocument();
    const previous = selectLayerTransforms("lifecycle-replay", 7, "win-seed", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: true,
      allowIdentity: true,
    });

    const replay = buildRuntimeScenario(
      authored,
      resolveTrackRunOptions({
        trackId: "lifecycle-replay",
        intent: "replayAfterWin",
        stored: { trackId: "lifecycle-replay", runSeed: previous.seed, selection: previous },
        forcedSelection: null,
        variationParam: null,
        devMode: false,
      })
    );

    expect(replay.selection.seed).not.toBe(previous.seed);
    expect(combinationKey(replay.selection.layerTransforms)).not.toBe(
      combinationKey(previous.layerTransforms)
    );
  });

  it("fixed lifecycle uses identity transforms on every layer", () => {
    const authored = authoredDocument();
    const fixed = buildRuntimeScenario(
      authored,
      resolveTrackRunOptions({
        trackId: "lifecycle-fixed",
        intent: "fixed",
        stored: null,
        forcedSelection: null,
        variationParam: "fixed",
        devMode: false,
      })
    );

    expect(Object.keys(fixed.selection.layerTransforms)).toHaveLength(7);
    for (const id of Object.values(fixed.selection.layerTransforms)) {
      expect(id).toBe("identity");
    }
  });

  it("resume lifecycle preserves stored selection via preserve intent", () => {
    const authored = authoredDocument();
    const selection = selectLayerTransforms("lifecycle-resume", 7, "resume-seed", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: false,
      allowIdentity: true,
    });

    const resumed = buildRuntimeScenario(
      authored,
      resolveTrackRunOptions({
        trackId: "lifecycle-resume",
        intent: "preserve",
        stored: { trackId: "lifecycle-resume", runSeed: selection.seed, selection },
        forcedSelection: null,
        variationParam: null,
        devMode: false,
      })
    );

    expect(resumed.selection).toEqual(selection);
  });

  it("selects seven independent transforms deterministically", () => {
    const selection = selectLayerTransforms("seven", 7, "stable-seed", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: false,
      allowIdentity: true,
    });
    expect(Object.keys(selection.layerTransforms).map(Number).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const again = selectLayerTransforms("seven", 7, "stable-seed", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: false,
      allowIdentity: true,
    });
    expect(again).toEqual(selection);
  });

  it("iterates all independent combinations for a three-layer track", () => {
    const ids = getActiveLayerTransformIds();
    const authored = authoredDocument();
    let count = 0;

    const pick = (layer: number, chosen: Record<number, LayerTransformId>) => {
      if (layer > 3) {
        const selection = { seed: `combo-${count}`, layerTransforms: { ...chosen } };
        const runtime = applyLayerTransformsToScenario(authored, selection);
        assertScenario(runtime as unknown as Scenario);
        count++;
        return;
      }
      for (const id of ids) {
        pick(layer + 1, { ...chosen, [layer]: id });
      }
    };

    pick(1, {});
    expect(count).toBe(ids.length ** 3);
  });

  it("structurally validates all 16,384 seven-layer combinations", () => {
    const ids = getActiveLayerTransformIds();
    const authored = authoredDocument();
    const authoredJson = JSON.stringify(authored);
    const layers = 7;
    let count = 0;

    const walk = (layerIndex: number, chosen: Record<number, LayerTransformId>) => {
      if (layerIndex === layers) {
        const selection = { seed: `7-${count}`, layerTransforms: { ...chosen } };
        const runtime = applyLayerTransformsToScenario(authored, selection, {
          validateScenario: false,
        }) as unknown as Scenario;

        expect(Object.keys(selection.layerTransforms)).toHaveLength(layers);
        expect(inBounds(runtime.start, layers)).toBe(true);
        expect(inBounds(runtime.goal, layers)).toBe(true);
        for (const tr of runtime.transitions ?? []) {
          expect(inBounds(tr.from, layers)).toBe(true);
          expect(inBounds(tr.to, layers)).toBe(true);
          expect(posId(tr.from)).toMatch(/^L\d+-R\d+-C\d+$/);
          expect(posId(tr.to)).toMatch(/^L\d+-R\d+-C\d+$/);
        }
        expect(JSON.stringify(authored)).toBe(authoredJson);
        count++;
        return;
      }
      for (const id of ids) {
        walk(layerIndex + 1, { ...chosen, [layerIndex + 1]: id });
      }
    };

    walk(0, {});
    expect(count).toBe(16384);

    const sample = applyLayerTransformsToScenario(authored, {
      seed: "validate-sample",
      layerTransforms: { 1: "reflect-horizontal", 2: "symmetry-b", 3: "symmetry-c", 4: "identity", 5: "reflect-horizontal", 6: "symmetry-b", 7: "symmetry-c" },
    });
    assertScenario(sample as unknown as Scenario);
  });

  it("seven-layer portal links remain paired after transforms", () => {
    const ids = getActiveLayerTransformIds();
    const authored = authoredDocument();
    for (const id of ids) {
      const selection = {
        seed: "portal",
        layerTransforms: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((layer) => [layer, id])) as Record<number, LayerTransformId>,
      };
      const runtime = applyLayerTransformsToScenario(authored, selection) as unknown as Scenario;
      for (const tr of runtime.transitions ?? []) {
        expect(posId(tr.from)).toMatch(/^L\d+-R\d+-C\d+$/);
        expect(posId(tr.to)).toMatch(/^L\d+-R\d+-C\d+$/);
      }
    }
  });

  it("transforms authored data without mutation", () => {
    const authored = authoredDocument();
    const cloneBefore = JSON.stringify(authored);
    const nonIdentity = getActiveLayerTransformIds().find((id) => id !== "identity")!;
    applyLayerTransformsToScenario(authored, {
      seed: "x",
      layerTransforms: { 1: nonIdentity, 2: nonIdentity, 3: nonIdentity, 4: nonIdentity, 5: nonIdentity, 6: nonIdentity, 7: nonIdentity },
    });
    expect(JSON.stringify(authored)).toBe(cloneBefore);
  });

  it("identity preserves every slot", () => {
    const definition = getBoardLayerTransformById("identity");
    for (const slot of allBoardSlots()) {
      expect(definition.applySlot(slot)).toEqual(slot);
    }
  });

  it("fixed mode always uses identity", () => {
    const { selection } = buildRuntimeScenario(authoredDocument(), {
      trackId: "fixed",
      mode: "fixed",
    });
    expect(Object.values(selection.layerTransforms).every((id) => id === "identity")).toBe(true);
  });

  it("disables transforms by default for non-opt-in scenarios", () => {
    const rainbow = JSON.parse(
      readFileSync(
        join(process.cwd(), "public/worlds/rainbow_realm/scenarios/prism_path/scenario.json"),
        "utf8"
      )
    ) as ScenarioDocument;

    const { selection } = buildRuntimeScenario(rainbow, {
      trackId: "prism_path_t1",
      mode: "new-on-replay",
      seed: "rainbow-test",
    });

    expect(Object.values(selection.layerTransforms).every((id) => id === "identity")).toBe(true);
  });

  it("enables transforms for forgotten citadel tracks that opt in", () => {
    const authored = JSON.parse(
      readFileSync(
        join(process.cwd(), "public/worlds/forgotten_citadel/scenarios/track01.json"),
        "utf8"
      )
    ) as ScenarioDocument;

    expect(authored.variationRules?.enabled).toBe(true);

    const { scenario, selection } = buildRuntimeScenario(authored, {
      trackId: "fc_t01",
      mode: "seeded",
      seed: "fc-opt-in-test",
      forcedSelection: {
        seed: "fc-opt-in-test",
        layerTransforms: {
          1: "reflect-horizontal",
          2: "identity",
          3: "identity",
          4: "identity",
          5: "identity",
          6: "identity",
          7: "identity",
        },
      },
    });

    expect(selection.layerTransforms[1]).toBe("reflect-horizontal");
    expect(scenario.start).toEqual({ layer: 1, row: 3, col: 4 });
  });

  it("loads forgotten citadel track01 across all three-layer combinations", () => {
    const path = join(process.cwd(), "public/worlds/forgotten_citadel/scenarios/track01.json");
    const authored = JSON.parse(readFileSync(path, "utf8")) as ScenarioDocument;
    const ids = getActiveLayerTransformIds();
    let tested = 0;

    for (const t1 of ids) {
      for (const t2 of ids) {
        for (const t3 of ids) {
          const selection = {
            seed: `fc-${t1}-${t2}-${t3}`,
            layerTransforms: { 1: t1, 2: t2, 3: t3, 4: "identity", 5: "identity", 6: "identity", 7: "identity" },
          };
          const runtime = applyLayerTransformsToScenario(authored, selection);
          assertScenario(runtime as unknown as Scenario);
          expect(newGame(runtime as unknown as Scenario)).toBeTruthy();
          tested++;
        }
      }
    }

    expect(tested).toBe(ids.length ** 3);
  });

  it("avoids repeating the previous full combination when possible", () => {
    const previous = selectLayerTransforms("track-b", 3, "prev", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: false,
      allowIdentity: true,
    });
    const next = selectLayerTransforms(
      "track-b",
      3,
      "next",
      {
        enabled: true,
        allowedTransforms: getActiveLayerTransformIds(),
        independentPerLayer: true,
        avoidPreviousCombination: true,
        allowIdentity: true,
      },
      previous.layerTransforms
    );
    expect(combinationKey(next.layerTransforms)).not.toBe(combinationKey(previous.layerTransforms));
  });
});
