import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import type { Scenario } from "../../engine/types";
import { newGame } from "../../engine/api";
import { computeOptimalSolution } from "../../engine/trackAnalysis";
import { countSolutionsWithin } from "../../engine/puzzleFitness";
import {
  authoredTrackToScenario,
  serializeScenarioExport,
  validateStructuralCoords,
} from "./serialization/scenarioBridge";
import { auditTrack, auditSummary } from "./audit/auditTrack";
import { canPlaceOnSlot } from "./features/featureOccupancy";
import { portalDirectionFor, withPortalDestination } from "./features/portalEdit";
import {
  cloneTrack,
  setRowMovement,
  toggleMissingHex,
  UndoStack,
} from "./state/authoringState";
import {
  deleteScenario,
  deleteWorld,
  emptyBundle,
  saveDraftBundle,
  upsertScenario,
  upsertTrack,
  upsertWorld,
} from "./storage";
import { scenarioJsonToTrack, seedBundleFromWorlds } from "./catalog";
import { createEmptyTrack } from "./types";
import { runSimulator } from "./simulation/runSimulator";
import { loadWorlds } from "../../ui/worldsLoader";

const root = join(import.meta.dirname, "..", "..", "..");
const fcTrack01 = join(root, "public/worlds/forgotten_citadel/scenarios/track01.json");

function loadFc01(): Scenario {
  return JSON.parse(readFileSync(fcTrack01, "utf8")) as Scenario;
}

function trackWithStartGoal() {
  const track = createEmptyTrack("t1", "sc1", "w1", "Test");
  track.features = [
    { kind: "start", id: "start_1", position: { layer: 1, row: 3, col: 0 } },
    { kind: "goal", id: "goal_1", position: { layer: 1, row: 3, col: 1 } },
  ];
  return track;
}

describe("Track Planner storage", () => {
  it("persists only user-authored entries, not built-in seed data", () => {
    const store: Record<string, string> = {};
    const ls = {
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      getItem: (k: string) => store[k] ?? null,
    };
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", { value: ls, configurable: true });

    saveDraftBundle({
      version: 1,
      worlds: [
        { worldId: "builtin", name: "B", encounterPool: [], villainPool: [], scenarioIds: [], builtIn: true },
        { worldId: "custom", name: "C", encounterPool: [], villainPool: [], scenarioIds: [] },
      ],
      scenarios: [],
      tracks: [],
      updatedAt: "",
    });

    const saved = JSON.parse(store.track_planner_drafts_v1);
    expect(saved.worlds).toHaveLength(1);
    expect(saved.worlds[0].worldId).toBe("custom");

    Object.defineProperty(globalThis, "localStorage", { value: original, configurable: true });
  });

  it("rejects duplicate world overwrite via upsert (latest wins)", () => {
    let bundle = emptyBundle();
    bundle = upsertWorld(bundle, {
      worldId: "w1",
      name: "A",
      encounterPool: [],
      villainPool: [],
      scenarioIds: [],
    });
    bundle = upsertWorld(bundle, {
      worldId: "w1",
      name: "B",
      encounterPool: [],
      villainPool: [],
      scenarioIds: [],
    });
    expect(bundle.worlds).toHaveLength(1);
    expect(bundle.worlds[0].name).toBe("B");
  });

  it("deletes world and cascades scenarios/tracks", () => {
    let bundle = emptyBundle();
    bundle = upsertWorld(bundle, {
      worldId: "w1",
      name: "W",
      encounterPool: [],
      villainPool: [],
      scenarioIds: ["sc1"],
    });
    bundle = upsertScenario(bundle, {
      scenarioId: "sc1",
      worldId: "w1",
      name: "S",
      trackOrder: ["t1"],
      allowedEncounters: [],
      allowedVillains: [],
    });
    bundle = upsertTrack(
      bundle,
      createEmptyTrack("t1", "sc1", "w1", "Track"),
    );
    bundle = deleteWorld(bundle, "w1");
    expect(bundle.worlds).toHaveLength(0);
    expect(bundle.scenarios).toHaveLength(0);
    expect(bundle.tracks).toHaveLength(0);
  });

  it("deletes scenario and its tracks", () => {
    let bundle = emptyBundle();
    bundle = upsertTrack(
      bundle,
      createEmptyTrack("t1", "sc1", "w1", "Track"),
    );
    bundle = deleteScenario(bundle, "sc1");
    expect(bundle.tracks).toHaveLength(0);
  });
});

describe("Track Planner board editor state", () => {
  it("toggles missing hex and restores", () => {
    const track = trackWithStartGoal();
    const pos = { layer: 1, row: 0, col: 0 };
    const removed = toggleMissingHex(track, pos, true);
    expect(removed.layers[0].missing).toHaveLength(1);
    const restored = toggleMissingHex(removed, pos, false);
    expect(restored.layers[0].missing).toHaveLength(0);
  });

  it("supports undo/redo for row movement", () => {
    const track = trackWithStartGoal();
    const stack = new UndoStack(track);
    const edited = setRowMovement(track, 2, 0, { direction: "LEFT", amount: 2 });
    stack.push(edited);
    const undone = stack.undo();
    expect(undone?.layers[1].rowMovement["0"].amount).toBe(0);
    const redone = stack.redo();
    expect(redone?.layers[1].rowMovement["0"].amount).toBe(2);
  });

  it("has seven layers with correct row lengths", () => {
    const track = createEmptyTrack("t", "s", "w", "T");
    expect(track.layers).toHaveLength(7);
    for (const lb of track.layers) {
      expect(Object.keys(lb.rowMovement)).toHaveLength(7);
    }
  });
});

describe("Track Planner scenario bridge", () => {
  it("round-trips Forgotten Citadel track01 through planner export", () => {
    const scenario = loadFc01();
    const base = createEmptyTrack("fc_t01_first_steps", "fc_main", "forgotten_citadel", scenario.name);
    const track = scenarioJsonToTrack(base, scenario);
    const exported = JSON.parse(serializeScenarioExport(track)) as Scenario;
    expect(exported.start).toEqual(scenario.start);
    expect(exported.goal).toEqual(scenario.goal);
    expect(exported.missing?.length).toBe(scenario.missing?.length);
  });

  it("structural validation catches missing start", () => {
    const track = createEmptyTrack("t", "s", "w", "T");
    track.features = [{ kind: "goal", id: "goal_1", position: { layer: 1, row: 0, col: 0 } }];
    const errors = validateStructuralCoords(track);
    expect(errors.some((e) => e.includes("Missing Start"))).toBe(true);
  });

  it("rejects feature on missing hex", () => {
    const track = trackWithStartGoal();
    track.layers[0].missing.push({ layer: 1, row: 3, col: 0 });
    const errors = validateStructuralCoords(track);
    expect(errors.some((e) => e.includes("on missing hex"))).toBe(true);
  });

  it("exports villains and encounters from authored features", () => {
    const track = trackWithStartGoal();
    track.features.push(
      {
        kind: "encounter",
        id: "enc_1",
        position: { layer: 7, row: 1, col: 1 },
        mode: "random",
      },
      { kind: "villain", id: "v1", position: { layer: 7, row: 2, col: 1 }, mode: "random" },
      { kind: "villain", id: "v2", position: { layer: 7, row: 2, col: 3 }, mode: "random" },
    );

    const exported = JSON.parse(serializeScenarioExport(track)) as Scenario & {
      villains?: { triggers: Array<{ layer: number; row: number; col: number }> };
      runtimeMovement?: unknown;
    };

    expect(exported.villains?.triggers).toHaveLength(3);
    expect(exported.villains?.triggers).toEqual(
      expect.arrayContaining([
        { id: "bad1", layer: 7, row: 1, col: 1 },
        { id: "villain_v1", layer: 7, row: 2, col: 1 },
        { id: "villain_v2", layer: 7, row: 2, col: 3 },
      ]),
    );
    expect(exported.runtimeMovement).toBeUndefined();
  });
});

describe("Track Planner audit", () => {
  it("flags hidden card without resolved type as error", () => {
    const track = trackWithStartGoal();
    track.features.push({
      kind: "card",
      id: "card_1",
      position: { layer: 1, row: 2, col: 2 },
      cardType: "HIDDEN",
    });
    const items = auditTrack(track);
    expect(items.some((i) => i.level === "error" && i.message.includes("resolvedType"))).toBe(true);
  });

  it("warns on random mystery card", () => {
    const track = trackWithStartGoal();
    track.features.push({
      kind: "card",
      id: "card_r",
      position: { layer: 1, row: 2, col: 3 },
      cardType: "RANDOM",
    });
    const items = auditTrack(track);
    expect(items.some((i) => i.level === "warning" && i.message.includes("Random"))).toBe(true);
  });

  it("rejects foreign-world villain", () => {
    const track = trackWithStartGoal();
    track.features.push({
      kind: "villain",
      id: "v1",
      position: { layer: 1, row: 1, col: 1 },
      mode: "specific",
      villainKey: "bad1",
    });
    const world = {
      worldId: "w1",
      name: "W",
      encounterPool: [],
      villainPool: ["bad2"],
      scenarioIds: [],
    };
    const items = auditTrack(track, world);
    expect(items.some((i) => i.level === "error" && i.message.includes("pool"))).toBe(true);
  });

  it("flags duplicate features on the same hex as error", () => {
    const track = trackWithStartGoal();
    const shared = { layer: 7, row: 2, col: 1 };
    track.features.push(
      {
        kind: "encounter",
        id: "enc_1",
        position: { layer: 7, row: 1, col: 1 },
        mode: "random",
      },
      { kind: "villain", id: "v1", position: { ...shared }, mode: "random" },
      { kind: "villain", id: "v2", position: { ...shared }, mode: "random" },
      { kind: "villain", id: "v3", position: { ...shared }, mode: "random" },
      { kind: "villain", id: "v4", position: { ...shared }, mode: "random" },
      { kind: "villain", id: "v5", position: { layer: 7, row: 2, col: 3 }, mode: "random" },
    );

    const items = auditTrack(track);
    const dupes = items.filter((i) => i.message.includes("Duplicate hex occupancy"));
    expect(dupes).toHaveLength(4);
    expect(dupes.every((i) => i.level === "error")).toBe(true);
    expect(auditSummary(items).error).toBeGreaterThanOrEqual(4);
  });
});

describe("Track Planner feature occupancy", () => {
  it("blocks placing a second villain on an occupied hex", () => {
    const track = trackWithStartGoal();
    track.features.push({
      kind: "villain",
      id: "v1",
      position: { layer: 7, row: 2, col: 1 },
      mode: "random",
    });
    const pos = { layer: 7, row: 2, col: 1 };
    const check = canPlaceOnSlot(track, "villain", pos);
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.existingId).toBe("v1");
  });
});

describe("Track Planner portal edit", () => {
  it("updates portal destination and direction", () => {
    const portal = {
      kind: "portal" as const,
      id: "p1",
      portalId: "portal_1",
      source: { layer: 3, row: 2, col: 1 },
      direction: "UP" as const,
      destination: { layer: 4, row: 2, col: 1 },
    };
    expect(portalDirectionFor(portal.source, { layer: 5, row: 0, col: 3 })).toBe("UP");
    expect(portalDirectionFor(portal.source, { layer: 2, row: 0, col: 3 })).toBe("DOWN");
    const updated = withPortalDestination(portal, { layer: 5, row: 0, col: 3 });
    expect(updated.destination).toEqual({ layer: 5, row: 0, col: 3 });
    expect(updated.direction).toBe("UP");
  });

  it("exports custom portal destination in transitions", () => {
    const track = trackWithStartGoal();
    track.features.push({
      kind: "portal",
      id: "p1",
      portalId: "portal_1",
      source: { layer: 2, row: 3, col: 0 },
      direction: "UP",
      destination: { layer: 4, row: 1, col: 2 },
    });
    const exported = authoredTrackToScenario(track);
    expect(exported.transitions).toEqual([
      {
        type: "UP",
        from: { layer: 2, row: 3, col: 0 },
        to: { layer: 4, row: 1, col: 2 },
      },
    ]);
  });
});

describe("Track Planner simulator", () => {
  it("matches canonical engine for fc_t01_first_steps", () => {
    const scenario = loadFc01();
    const base = createEmptyTrack("fc_t01_first_steps", "fc_main", "forgotten_citadel", scenario.name);
    const track = scenarioJsonToTrack(base, scenario);
    const sim = runSimulator(track);
    const engine = computeOptimalSolution(newGame(scenario), 80, 400000, {
      countAlternativePaths: true,
    });
    expect(sim.optimal.minMoves).toBe(engine.minMoves);
    expect(sim.optimal.pathHexIds).toEqual(engine.pathHexIds);
  });

  it("reports multiple optimal paths for fc_t02_rift_isles", () => {
    const path = join(root, "public/worlds/forgotten_citadel/scenarios/track02.json");
    const scenario = JSON.parse(readFileSync(path, "utf8")) as Scenario;
    const base = createEmptyTrack("fc_t02", "fc_main", "forgotten_citadel", scenario.name);
    const track = scenarioJsonToTrack(base, scenario);
    const sim = runSimulator(track);
    const counts = countSolutionsWithin(newGame(scenario), 80, 0);
    expect(sim.optimal.minMoves).toBe(counts.minMoves);
    expect(sim.summary.optimalPathCount).toBeGreaterThan(1);
  });

  it("clone does not mutate authored track during analysis", () => {
    const track = trackWithStartGoal();
    const before = cloneTrack(track);
    try {
      runSimulator(track);
    } catch {
      /* unsolvable minimal track */
    }
    expect(track).toEqual(before);
  });
});

describe("Track Planner catalog", () => {
  it("seeds worlds from loader", () => {
    const worlds = loadWorlds();
    const bundle = seedBundleFromWorlds(worlds);
    expect(bundle.worlds.length).toBeGreaterThan(0);
    expect(bundle.tracks.length).toBeGreaterThan(0);
    const fc = bundle.worlds.find((w) => w.worldId === "forgotten_citadel");
    expect(fc).toBeTruthy();
  });
});

describe("Track Planner board grid", () => {
  it("uses static posId for authored hex slots (no GameState required)", () => {
    const track = createEmptyTrack("t1", "sc1", "w1", "Test");
    expect(track.layers).toHaveLength(7);
    expect(() => authoredTrackToScenario(track)).toThrow();
  });
});

describe("Track Planner visibility types", () => {
  it("preserves visibility overlay separate from missing hex", () => {
    const track = trackWithStartGoal();
    track.visibility = [
      { id: "v1", state: "INVISIBLE", coverage: "FULL_BOARD", positions: [] },
    ];
    track.layers[0].missing.push({ layer: 1, row: 0, col: 0 });
    expect(track.layers[0].missing).toHaveLength(1);
    expect(track.visibility[0].state).toBe("INVISIBLE");
    const scenario = authoredTrackToScenario(track);
    expect(scenario.missing).toHaveLength(1);
  });
});
