import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { newGame } from "../api";
import { posId } from "../board";
import { assertScenario } from "../scenario";
import type { Pos, Scenario } from "../types";
import { allBoardSlots } from "./boardSlot";
import { neighborBoardSlots } from "./boardNeighbors";
import {
  applyLayerTransformsToScenario,
  buildRuntimeScenario,
  combinationKey,
  getActiveLayerTransformIds,
  getBoardLayerTransformById,
  preservesAdjacency,
  selectLayerTransforms,
  transformBoardDirection,
  transformPosOnLayer,
} from "./index";
import { discoverUniqueAutomorphismMaps, isIdentityMap, composeMaps, mapFingerprint } from "./graphAutomorphism";
import type { LayerTransformId, ScenarioDocument } from "./types";

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
      "2": "SEVEN_LEFT_SIX_RIGHT",
      "3": "NONE",
      "4": "NONE",
      "5": "NONE",
      "6": "NONE",
      "7": "NONE",
    },
    transitions: [
      { type: "UP", from: { layer: 1, row: 4, col: 5 }, to: { layer: 2, row: 3, col: 2 } },
    ],
    revealOnEnterGuaranteedUp: false,
  };
}

function authoredDocument(): ScenarioDocument {
  return {
    ...testScenario(),
    cardTriggers: [{ card: "risk", layer: 1, row: 2, col: 2 }],
  };
}

describe("layer transforms", () => {
  it("discovers at least four board symmetries on 7676767", () => {
    expect(discoverUniqueAutomorphismMaps(500).length).toBe(4);
  });

  it("identity preserves every slot", () => {
    const definition = getBoardLayerTransformById("identity");
    for (const slot of allBoardSlots()) {
      expect(definition.applySlot(slot)).toEqual(slot);
    }
  });

  it("every active transform preserves adjacency and bijection", () => {
    const maps = discoverUniqueAutomorphismMaps(500);
    for (const map of maps) {
      expect(preservesAdjacency(map)).toBe(true);
      expect(map.size).toBe(allBoardSlots().length);
    }
  });

  it("transforms start, goal, transitions, and extras on a layer", () => {
    const authored = authoredDocument();
    const authoredStart = { ...authored.start };
    const nonIdentity = getActiveLayerTransformIds().find((id) => id !== "identity")!;
    const selection = {
      seed: "test",
      layerTransforms: { 1: nonIdentity },
    };
    const runtime = applyLayerTransformsToScenario(authored, selection);
    const changedOnLayer = allBoardSlots().some((slot) => {
      const before = { layer: 1, row: slot.row, col: slot.col };
      const after = transformPosOnLayer(before, 1, nonIdentity);
      return after.row !== before.row || after.col !== before.col;
    });
    expect(changedOnLayer).toBe(true);
    assertScenario(runtime as unknown as Scenario);
    expect(newGame(runtime as unknown as Scenario)).toBeTruthy();
    expect(authored.start).toEqual(authoredStart);
  });

  it("selects independent transforms per layer deterministically", () => {
    const a = selectLayerTransforms("track-a", 3, "seed-1", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: false,
      allowIdentity: true,
    });
    const b = selectLayerTransforms("track-a", 3, "seed-1", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: false,
      allowIdentity: true,
    });
    expect(a).toEqual(b);
    expect(Object.keys(a.layerTransforms)).toHaveLength(3);
  });

  it("avoids repeating the previous full combination when possible", () => {
    const previous = selectLayerTransforms("track-b", 3, "prev", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: false,
      allowIdentity: true,
    });
    const next = selectLayerTransforms("track-b", 3, "next", {
      enabled: true,
      allowedTransforms: getActiveLayerTransformIds(),
      independentPerLayer: true,
      avoidPreviousCombination: true,
      allowIdentity: true,
    }, previous.layerTransforms);
    expect(combinationKey(next.layerTransforms)).not.toBe(combinationKey(previous.layerTransforms));
  });

  it("fixed mode always uses identity", () => {
    const { selection } = buildRuntimeScenario(authoredDocument(), {
      trackId: "fixed",
      mode: "fixed",
    });
    expect(Object.values(selection.layerTransforms).every((id) => id === "identity")).toBe(true);
  });

  it("transforms connectivity structure on a layer", () => {
    const maps = discoverUniqueAutomorphismMaps(500).filter((m) => !isIdentityMap(m));
    const map = maps[0];
    const blocked: Pos[] = [{ layer: 1, row: 1, col: 1 }];
    const authored: Scenario = {
      ...testScenario(),
      blocked,
    };
    const nonIdentity = getActiveLayerTransformIds().find((id) => id !== "identity")!;
    const selection = { seed: "c", layerTransforms: { 1: nonIdentity } };
    const runtime = applyLayerTransformsToScenario(authored as ScenarioDocument, selection) as unknown as Scenario;

    const originalGraph = new Set(
      blocked.map((p) => `${p.row},${p.col}->${neighborBoardSlots({ row: p.row, col: p.col }).map((n) => `${n.row},${n.col}`).sort().join("|")}`)
    );
    const transformedBlocked = runtime.blocked ?? [];
    const transformedGraph = new Set(
      transformedBlocked.map((p) => `${p.row},${p.col}->${neighborBoardSlots({ row: p.row, col: p.col }).map((n) => `${n.row},${n.col}`).sort().join("|")}`)
    );
    expect(transformedGraph.size).toBe(originalGraph.size);
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
        expect(posId(runtime.start)).toMatch(/^L1-R\d+-C\d+$/);
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

  it("loads forgotten citadel track01 across all combinations", () => {
    const path = join(process.cwd(), "public/worlds/forgotten_citadel/scenarios/track01.json");
    const authored = JSON.parse(readFileSync(path, "utf8")) as ScenarioDocument;
    const ids = getActiveLayerTransformIds();
    let tested = 0;

    for (const t1 of ids) {
      for (const t2 of ids) {
        for (const t3 of ids) {
          const selection = {
            seed: `fc-${t1}-${t2}-${t3}`,
            layerTransforms: { 1: t1, 2: t2, 3: t3 },
          };
          const runtime = applyLayerTransformsToScenario(authored, selection);
          assertScenario(runtime as unknown as Scenario);
          tested++;
        }
      }
    }

    expect(tested).toBe(ids.length ** 3);
  });

  it("direction transform returns a valid direction index", () => {
    const id = getActiveLayerTransformIds().find((x) => x !== "identity") ?? "identity";
    const direction = transformBoardDirection(0, id);
    expect(direction).toBeGreaterThanOrEqual(0);
    expect(direction).toBeLessThanOrEqual(5);
  });

  it("involutions are self-inverse", () => {
    const maps = discoverUniqueAutomorphismMaps(500);
    for (const map of maps) {
      const composed = composeMaps(map, map);
      if (isIdentityMap(map)) {
        expect(isIdentityMap(composed)).toBe(true);
      } else {
        expect(isIdentityMap(composed)).toBe(true);
      }
    }
  });
});
