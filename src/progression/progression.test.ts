import { describe, expect, it } from "vitest";
import { bestScoreKey, getBestScore, saveBestScore } from "../ui/bestScore";
import type { ScenarioEntry, Track, WorldEntry } from "../ui/types";
import { emptyProgressionSave, migrateProgressionSave } from "./migration";
import { progressionTrackKey } from "./progressionTrackKey";
import {
  getContinueTarget,
  getTrackStatus,
  isScenarioCompleted,
  isTrackCompleted,
  isTrackUnlocked,
  isWorldCompleted,
  isWorldUnlocked,
  recordTrackCompletion,
  resolveNextAvailableTrack,
} from "./progression";
import { loadProgression, resetProgression, saveProgression, PROGRESSION_STORAGE_KEY } from "./storage";
import { validateProgressionMetadata } from "./validateProgression";
import worlds from "../worlds";

function makeTrack(id: string, extra?: Partial<Track>): Track {
  return {
    id,
    name: id,
    scenarioJson: `worlds/test/${id}.json`,
    ...extra,
  };
}

function makeScenario(id: string, tracks: Track[], extra?: Partial<ScenarioEntry>): ScenarioEntry {
  return {
    id,
    name: id,
    scenarioJson: "worlds/test/scenario.json",
    theme: {
      palette: { L1: "#000", L2: "#111", L3: "#222", L4: "#333", L5: "#444", L6: "#555", L7: "#666" },
      assets: { diceFacesBase: "dice", diceCornerBorder: "border", villainsBase: "villains" },
    },
    tracks,
    ...extra,
  };
}

function makeWorld(id: string, scenarios: ScenarioEntry[], extra?: Partial<WorldEntry>): WorldEntry {
  return {
    id,
    name: id,
    menu: {},
    scenarios,
    ...extra,
  };
}

const sequentialWorld = makeWorld(
  "starter_world",
  [
    makeScenario(
      "movement_basics",
      [
        makeTrack("t1"),
        makeTrack("t2", { progression: { requires: [{ type: "TRACK_COMPLETE", worldId: "starter_world", trackId: "t1" }] } }),
        makeTrack("t3", { progression: { requires: [{ type: "TRACK_COMPLETE", worldId: "starter_world", trackId: "t2" }] } }),
      ],
      { progression: { progressionMode: "SEQUENTIAL" } },
    ),
    makeScenario(
      "broken_paths",
      [makeTrack("b1"), makeTrack("b2")],
      {
        progression: {
          progressionMode: "SEQUENTIAL",
          requiresScenarioIds: ["movement_basics"],
        },
      },
    ),
  ],
  { progression: { progressionMode: "SEQUENTIAL" } },
);

const worldBRequiresA = [
  makeWorld("world_a", [makeScenario("s1", [makeTrack("a1"), makeTrack("a2")], { progression: { progressionMode: "SEQUENTIAL" } })], {
    progression: { progressionMode: "SEQUENTIAL" },
  }),
  makeWorld("world_b", [makeScenario("s1", [makeTrack("b1")])], {
    progression: { progressionMode: "SEQUENTIAL", requiresWorldIds: ["world_a"] },
  }),
];

function build40TrackScenario(): ScenarioEntry {
  const tracks: Track[] = [];
  for (let i = 1; i <= 40; i++) {
    const id = `t${i}`;
    tracks.push(
      makeTrack(id, {
        progression:
          i === 1
            ? undefined
            : {
                requires: [{ type: "TRACK_COMPLETE", worldId: "curriculum", trackId: `t${i - 1}` }],
              },
      }),
    );
  }
  return makeScenario("curriculum", tracks, { progression: { progressionMode: "SEQUENTIAL" } });
}

describe("progressionTrackKey", () => {
  it("uses world + registry track id", () => {
    expect(progressionTrackKey("rainbow_realm", "t5")).toBe("rainbow_realm::t5");
  });
});

describe("progression storage", () => {
  it("persists completion across reload", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };

    const updated = recordTrackCompletion(emptyProgressionSave(), "starter_world", "t1");
    saveProgression(updated, storage);
    const reloaded = loadProgression(storage);
    expect(isTrackCompleted(reloaded, "starter_world", "t1")).toBe(true);
  });

  it("recovers from corrupt JSON", () => {
    const mem = new Map<string, string>([[PROGRESSION_STORAGE_KEY, "{not json"]]);
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    const save = loadProgression(storage);
    expect(save.version).toBe(1);
    expect(save.completedTracks).toEqual({});
  });

  it("preserves unknown completion keys", () => {
    const raw = {
      version: 1,
      completedTracks: {
        "deleted_old_track": { completed: true },
      },
      seenMechanicIntroductions: [],
    };
    const migrated = migrateProgressionSave(raw);
    expect(migrated?.completedTracks["deleted_old_track"]?.completed).toBe(true);
  });

  it("resetProgression clears storage", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    saveProgression(recordTrackCompletion(emptyProgressionSave(), "x", "y"), storage);
    resetProgression(storage);
    expect(loadProgression(storage).completedTracks).toEqual({});
  });
});

describe("track unlock + completion", () => {
  it("first track is available with empty save", () => {
    const save = emptyProgressionSave();
    const world = sequentialWorld;
    const scenario = world.scenarios[0];
    expect(getTrackStatus(save, [world], world, scenario, "t1")).toBe("AVAILABLE");
    expect(getTrackStatus(save, [world], world, scenario, "t2")).toBe("LOCKED");
  });

  it("completing track 1 unlocks track 2", () => {
    let save = emptyProgressionSave();
    const world = sequentialWorld;
    const scenario = world.scenarios[0];
    save = recordTrackCompletion(save, world.id, "t1");
    expect(getTrackStatus(save, [world], world, scenario, "t2")).toBe("AVAILABLE");
  });

  it("recordTrackCompletion is idempotent without increment", () => {
    let save = recordTrackCompletion(emptyProgressionSave(), "starter_world", "t1");
    const firstAt = save.completedTracks["starter_world::t1"]?.firstCompletedAt;
    save = recordTrackCompletion(save, "starter_world", "t1");
    expect(save.completedTracks["starter_world::t1"]?.firstCompletedAt).toBe(firstAt);
    expect(save.completedTracks["starter_world::t1"]?.completionCount).toBe(1);
  });

  it("increments completionCount when requested", () => {
    let save = recordTrackCompletion(emptyProgressionSave(), "starter_world", "t1");
    save = recordTrackCompletion(save, "starter_world", "t1", { incrementCount: true });
    expect(save.completedTracks["starter_world::t1"]?.completionCount).toBe(2);
  });
});

describe("shared JSON identity (t5 / t6)", () => {
  const rr = worlds.find((w) => w.id === "rainbow_realm")!;
  const scenario = rr.scenarios.find((s) => s.id === "prism_path")!;
  const t5 = scenario.tracks!.find((t) => t.id === "t5")!;
  const t6 = scenario.tracks!.find((t) => t.id === "t6")!;

  it("t5 and t6 share scenario JSON but remain distinct tracks", () => {
    expect(t5.scenarioJson).toBe(t6.scenarioJson);
    expect(progressionTrackKey(rr.id, t5.id)).not.toBe(progressionTrackKey(rr.id, t6.id));
  });

  it("completing t5 does not complete t6", () => {
    const save = recordTrackCompletion(emptyProgressionSave(), rr.id, "t5");
    expect(isTrackCompleted(save, rr.id, "t5")).toBe(true);
    expect(isTrackCompleted(save, rr.id, "t6")).toBe(false);
  });
});

describe("cloud variant completion (Model A)", () => {
  const fc = worlds.find((w) => w.id === "forgotten_citadel")!;
  const clear = fc.scenarios.find((s) => s.id === "citadel_path")!;
  const cloudy = fc.scenarios.find((s) => s.id === "citadel_partly_cloudy")!;

  it("completion in clear counts for partly cloudy (same track id)", () => {
    const save = recordTrackCompletion(emptyProgressionSave(), fc.id, "fc_t01");
    expect(isTrackCompleted(save, fc.id, "fc_t01")).toBe(true);
    expect(getTrackStatus(save, worlds, fc, cloudy, "fc_t01")).toBe("COMPLETED");
  });

  it("best scores remain variant-specific", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: storage,
      configurable: true,
    });

    saveBestScore(clear.id, 10, "fc_t01");
    saveBestScore(cloudy.id, 8, "fc_t01");
    expect(getBestScore(clear.id, "fc_t01")).toBe(10);
    expect(getBestScore(cloudy.id, "fc_t01")).toBe(8);
    expect(bestScoreKey(clear.id, "fc_t01")).not.toBe(bestScoreKey(cloudy.id, "fc_t01"));
  });
});

describe("legacy OPEN production content", () => {
  it("does not lock existing tracks", () => {
    const save = emptyProgressionSave();
    for (const world of worlds) {
      expect(isWorldUnlocked(save, worlds, world)).toBe(true);
      for (const scenario of world.scenarios) {
        for (const track of scenario.tracks ?? []) {
          expect(getTrackStatus(save, worlds, world, scenario, track.id)).toBe("AVAILABLE");
        }
      }
    }
  });

  it("production registry passes validation", () => {
    const result = validateProgressionMetadata(worlds);
    expect(result.ok).toBe(true);
  });
});

describe("scenario completion", () => {
  it("zero completions is incomplete", () => {
    const world = sequentialWorld;
    const scenario = world.scenarios[0];
    expect(isScenarioCompleted(emptyProgressionSave(), world, scenario)).toBe(false);
  });

  it("partial completion is incomplete", () => {
    let save = recordTrackCompletion(emptyProgressionSave(), "starter_world", "t1");
    save = recordTrackCompletion(save, "starter_world", "t2");
    const world = sequentialWorld;
    expect(isScenarioCompleted(save, world, world.scenarios[0])).toBe(false);
  });

  it("all required tracks complete marks scenario complete", () => {
    let save = emptyProgressionSave();
    const world = sequentialWorld;
    const scenario = world.scenarios[0];
    for (const id of ["t1", "t2", "t3"]) {
      save = recordTrackCompletion(save, world.id, id);
    }
    expect(isScenarioCompleted(save, world, scenario)).toBe(true);
  });
});

describe("world completion + unlock", () => {
  it("world B locked until world A complete", () => {
    const save = emptyProgressionSave();
    const [a, b] = worldBRequiresA;
    expect(isWorldUnlocked(save, worldBRequiresA, b)).toBe(false);

    let progressed = save;
    for (const id of ["a1", "a2"]) {
      progressed = recordTrackCompletion(progressed, a.id, id);
    }
    expect(isWorldCompleted(progressed, a)).toBe(true);
    expect(isWorldUnlocked(progressed, worldBRequiresA, b)).toBe(true);
  });
});

describe("next track resolution", () => {
  it("returns sequential next track", () => {
    let save = recordTrackCompletion(emptyProgressionSave(), "starter_world", "t1");
    const world = sequentialWorld;
    const scenario = world.scenarios[0];
    const next = resolveNextAvailableTrack([world], world, scenario, "t1", save);
    expect(next).toEqual({ kind: "TRACK", trackId: "t2" });
  });

  it("returns scenario complete after final track", () => {
    let save = emptyProgressionSave();
    const world = sequentialWorld;
    const scenario = world.scenarios[0];
    for (const id of ["t1", "t2", "t3"]) {
      save = recordTrackCompletion(save, world.id, id);
    }
    const next = resolveNextAvailableTrack([world], world, scenario, "t3", save);
    expect(next.kind).toBe("SCENARIO_COMPLETE");
  });

  it("skips locked candidates", () => {
    const save = emptyProgressionSave();
    const world = sequentialWorld;
    const scenario = world.scenarios[0];
    expect(resolveNextAvailableTrack([world], world, scenario, "t1", save).kind).toBe("NONE");
  });
});

describe("40-track curriculum fixture", () => {
  it("unlocks linearly through 40 tracks", () => {
    const world = makeWorld("curriculum", [build40TrackScenario()], {
      progression: { progressionMode: "SEQUENTIAL" },
    });
    let save = emptyProgressionSave();
    const scenario = world.scenarios[0];

    expect(getTrackStatus(save, [world], world, scenario, "t1")).toBe("AVAILABLE");
    expect(getTrackStatus(save, [world], world, scenario, "t2")).toBe("LOCKED");

    for (let i = 1; i <= 39; i++) {
      save = recordTrackCompletion(save, world.id, `t${i}`);
      expect(getTrackStatus(save, [world], world, scenario, `t${i + 1}`)).toBe("AVAILABLE");
    }

    save = recordTrackCompletion(save, world.id, "t40");
    expect(isScenarioCompleted(save, world, scenario)).toBe(true);
  });
});

describe("continue target", () => {
  it("finds first available incomplete track", () => {
    let save = recordTrackCompletion(emptyProgressionSave(), "starter_world", "t1");
    const target = getContinueTarget([sequentialWorld], save);
    expect(target).toEqual({
      worldId: "starter_world",
      scenarioId: "movement_basics",
      trackId: "t2",
    });
  });
});

describe("replay preserves completion", () => {
  it("completion remains after re-record without increment flag", () => {
    let save = recordTrackCompletion(emptyProgressionSave(), "starter_world", "t1");
    save = recordTrackCompletion(save, "starter_world", "t1");
    const world = sequentialWorld;
    const scenario = world.scenarios[0];
    expect(getTrackStatus(save, [world], world, scenario, "t1")).toBe("COMPLETED");
    expect(getTrackStatus(save, [world], world, scenario, "t2")).toBe("AVAILABLE");
  });
});

describe("progression validation", () => {
  it("detects missing track requirement", () => {
    const world = makeWorld("w", [
      makeScenario("s", [makeTrack("t1", { progression: { requires: [{ type: "TRACK_COMPLETE", worldId: "w", trackId: "missing" }] } })]),
    ]);
    const result = validateProgressionMetadata([world]);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "MISSING_TRACK")).toBe(true);
  });

  it("allows legacy content without metadata", () => {
    expect(validateProgressionMetadata(worlds).ok).toBe(true);
  });
});

describe("best score compatibility", () => {
  it("does not delete hexgame-best keys when saving progression", () => {
    const mem = new Map<string, string>([[bestScoreKey("prism_path", "t1"), "12"]]);
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    saveProgression(recordTrackCompletion(emptyProgressionSave(), "rainbow_realm", "t1"), storage);
    expect(mem.get(bestScoreKey("prism_path", "t1"))).toBe("12");
  });
});

describe("track transform identity", () => {
  it("completion key excludes transform seed", () => {
    const key = progressionTrackKey("rainbow_realm", "t3");
    expect(key).toBe("rainbow_realm::t3");
    expect(key.includes("identity")).toBe(false);
  });
});

describe("isTrackUnlocked explicit requires", () => {
  it("honors explicit track prerequisite in OPEN scenario", () => {
    const world = makeWorld("w", [
      makeScenario(
        "s",
        [
          makeTrack("a"),
          makeTrack("b", { progression: { requires: [{ type: "TRACK_COMPLETE", worldId: "w", trackId: "a" }] } }),
        ],
        { progression: { progressionMode: "OPEN" } },
      ),
    ]);
    const scenario = world.scenarios[0];
    const save = emptyProgressionSave();
    expect(isTrackUnlocked(save, [world], world, scenario, "b")).toBe(false);
    const done = recordTrackCompletion(save, "w", "a");
    expect(isTrackUnlocked(done, [world], world, scenario, "b")).toBe(true);
  });
});
