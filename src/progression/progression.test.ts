import { describe, expect, it } from "vitest";
import type { ScenarioEntry, Track, WorldEntry } from "../ui/types";
import { progressionTrackKey } from "./keys";
import {
  getContinueTarget,
  getNextAvailableTrack,
  getTrackStatus,
  isScenarioCompleted,
  isTrackCompleted,
  isTrackUnlocked,
  isWorldCompleted,
  markMechanicSeen,
  recordTrackCompletion,
  requirementsMet,
} from "./progression";
import { createDefaultProgression, normalizeProgressionSave } from "./storage";
import { validateProgressionContent } from "./validate";

function makeTrack(id: string, extra?: Partial<Track>): Track {
  return {
    id,
    name: id,
    scenarioJson: `boards/${id}.json`,
    ...extra,
  };
}

function makeScenario(id: string, tracks: Track[], extra?: Partial<ScenarioEntry>): ScenarioEntry {
  return {
    id,
    name: id,
    scenarioJson: tracks[0]?.scenarioJson ?? "boards/a.json",
    theme: {
      palette: { L1: "#000", L2: "#000", L3: "#000", L4: "#000", L5: "#000", L6: "#000", L7: "#000" },
      assets: { diceFacesBase: "", diceCornerBorder: "", villainsBase: "" },
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

const SEQUENTIAL_WORLD = makeWorld(
  "starter_world",
  [
    makeScenario(
      "movement_basics",
      [
        makeTrack("t1"),
        makeTrack("t2"),
        makeTrack("t3"),
      ],
      { progression: { mode: "SEQUENTIAL" } }
    ),
    makeScenario(
      "broken_paths",
      [makeTrack("t4"), makeTrack("t5")],
      {
        progression: {
          mode: "SEQUENTIAL",
          requires: [{ type: "SCENARIO_COMPLETE", worldId: "starter_world", scenarioId: "movement_basics" }],
        },
      }
    ),
  ],
  { progression: { mode: "SEQUENTIAL" } }
);

describe("progressionTrackKey", () => {
  it("uses worldId and registered track id", () => {
    expect(progressionTrackKey("forgotten_citadel", "fc_t01")).toBe("forgotten_citadel|fc_t01");
  });
});

describe("track unlock — sequential fixture", () => {
  it("first track available with empty progress", () => {
    const progress = createDefaultProgression();
    const scenario = SEQUENTIAL_WORLD.scenarios[0];
    const t1 = scenario.tracks![0];
    expect(getTrackStatus(progress, [SEQUENTIAL_WORLD], SEQUENTIAL_WORLD, scenario, t1, 0)).toBe(
      "AVAILABLE"
    );
    expect(getTrackStatus(progress, [SEQUENTIAL_WORLD], SEQUENTIAL_WORLD, scenario, scenario.tracks![1], 1)).toBe(
      "LOCKED"
    );
  });

  it("completing track 1 unlocks track 2", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "starter_world", "t1");
    const scenario = SEQUENTIAL_WORLD.scenarios[0];
    expect(getTrackStatus(progress, [SEQUENTIAL_WORLD], SEQUENTIAL_WORLD, scenario, scenario.tracks![1], 1)).toBe(
      "AVAILABLE"
    );
  });

  it("completing all scenario tracks marks scenario complete", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "starter_world", "t1");
    progress = recordTrackCompletion(progress, "starter_world", "t2");
    progress = recordTrackCompletion(progress, "starter_world", "t3");
    expect(isScenarioCompleted(progress, [SEQUENTIAL_WORLD], "starter_world", "movement_basics")).toBe(
      true
    );
  });
});

describe("shared JSON identity (t5 / t6)", () => {
  const sharedJson = "worlds/rainbow_realm/scenarios/prism_path/scenario5.json";
  const world = makeWorld("rainbow_realm", [
    makeScenario("prism_path", [
      makeTrack("t5", { scenarioJson: sharedJson }),
      makeTrack("t6", { scenarioJson: sharedJson }),
    ]),
  ]);

  it("completing t5 does not complete t6", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "rainbow_realm", "t5");
    expect(isTrackCompleted(progress, "rainbow_realm", "t5")).toBe(true);
    expect(isTrackCompleted(progress, "rainbow_realm", "t6")).toBe(false);
  });
});

describe("cloud variant completion — Model A", () => {
  const tracks = [makeTrack("fc_t01"), makeTrack("fc_t02")];
  const world = makeWorld("forgotten_citadel", [
    makeScenario("citadel_path", tracks),
    makeScenario("citadel_partly_cloudy", tracks, { cloudMode: "cloudy" }),
    makeScenario("citadel_cloudy", tracks, { cloudMode: "full_cloud" }),
  ]);

  it("completing fc_t01 in clear variant completes fc_t01 in cloudy variants", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "forgotten_citadel", "fc_t01");
    expect(isTrackCompleted(progress, "forgotten_citadel", "fc_t01")).toBe(true);
    const cloudy = world.scenarios[1];
    expect(
      getTrackStatus(progress, [world], world, cloudy, tracks[0], 0)
    ).toBe("COMPLETED");
  });
});

describe("OPEN legacy worlds", () => {
  it("all tracks remain available without completion", () => {
    const progress = createDefaultProgression();
    const tracks = [makeTrack("fc_t01"), makeTrack("fc_t02"), makeTrack("fc_t03")];
    const world = makeWorld("forgotten_citadel", [makeScenario("citadel_path", tracks)]);
    for (let i = 0; i < tracks.length; i++) {
      expect(
        getTrackStatus(progress, [world], world, world.scenarios[0], tracks[i], i)
      ).toBe("AVAILABLE");
    }
  });
});

describe("recordTrackCompletion idempotency", () => {
  it("increments completionCount on repeat wins", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "w", "t1");
    progress = recordTrackCompletion(progress, "w", "t1");
    const key = progressionTrackKey("w", "t1");
    expect(progress.completedTracks[key].completionCount).toBe(2);
  });
});

describe("persistence", () => {
  it("round-trips through normalize", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "w", "t1");
    progress = markMechanicSeen(progress, "portals");
    const raw = JSON.parse(JSON.stringify(progress));
    const loaded = normalizeProgressionSave(raw);
    expect(loaded.completedTracks[progressionTrackKey("w", "t1")].completionCount).toBe(1);
    expect(loaded.seenMechanicIntroductions).toContain("portals");
  });

  it("recovers from corrupt JSON", () => {
    const loaded = normalizeProgressionSave({ version: 99, broken: true });
    expect(loaded.version).toBe(1);
    expect(loaded.completedTracks).toEqual({});
  });
});

describe("unknown track id in save", () => {
  it("preserves orphaned completion entries", () => {
    const progress = normalizeProgressionSave({
      version: 1,
      completedTracks: {
        "deleted_world|old_track": {
          completionCount: 1,
          firstCompletedAt: "2026-01-01T00:00:00.000Z",
        },
      },
      seenMechanicIntroductions: [],
    });
    expect(progress.completedTracks["deleted_world|old_track"]).toBeDefined();
  });
});

describe("world unlock", () => {
  const worldA = makeWorld("world_a", [makeScenario("s1", [makeTrack("a1")])], {
    progression: { mode: "SEQUENTIAL" },
  });
  const worldB = makeWorld(
    "world_b",
    [makeScenario("s1", [makeTrack("b1")])],
    {
      progression: { mode: "SEQUENTIAL", requiresWorldIds: ["world_a"] },
    }
  );

  it("locks world B until world A complete", () => {
    let progress = createDefaultProgression();
    expect(requirementsMet(progress, [worldA, worldB], [{ type: "WORLD_COMPLETE", worldId: "world_a" }])).toBe(
      false
    );
    progress = recordTrackCompletion(progress, "world_a", "a1");
    expect(isWorldCompleted(progress, [worldA, worldB], "world_a")).toBe(true);
    expect(
      isTrackUnlocked(progress, [worldA, worldB], worldB, worldB.scenarios[0], worldB.scenarios[0].tracks![0], 0)
    ).toBe(true);
  });
});

describe("getNextAvailableTrack", () => {
  it("skips locked tracks in sequential mode", () => {
    const progress = createDefaultProgression();
    const scenario = SEQUENTIAL_WORLD.scenarios[0];
    const next = getNextAvailableTrack(
      progress,
      [SEQUENTIAL_WORLD],
      SEQUENTIAL_WORLD,
      scenario,
      "t1"
    );
    expect(next.kind).toBe("none");
  });

  it("returns next unlocked track after completion", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "starter_world", "t1");
    const scenario = SEQUENTIAL_WORLD.scenarios[0];
    const next = getNextAvailableTrack(
      progress,
      [SEQUENTIAL_WORLD],
      SEQUENTIAL_WORLD,
      scenario,
      "t1"
    );
    expect(next.kind).toBe("track");
    if (next.kind === "track") expect(next.trackId).toBe("t2");
  });
});

describe("getContinueTarget", () => {
  it("finds first available incomplete track", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "starter_world", "t1");
    const target = getContinueTarget(progress, [SEQUENTIAL_WORLD]);
    expect(target.kind).toBe("track");
    if (target.kind === "track") expect(target.trackId).toBe("t2");
  });
});

describe("40-track curriculum scale test", () => {
  it("unlocks tracks sequentially through 40 metadata entries", () => {
    const tracks = Array.from({ length: 40 }, (_, i) =>
      makeTrack(`cur_${String(i + 1).padStart(2, "0")}`)
    );
    const world = makeWorld(
      "curriculum",
      [makeScenario("main", tracks, { progression: { mode: "SEQUENTIAL" } })],
      { progression: { mode: "SEQUENTIAL" } }
    );
    let progress = createDefaultProgression();
    const scenario = world.scenarios[0];

    expect(getTrackStatus(progress, [world], world, scenario, tracks[0], 0)).toBe("AVAILABLE");
    for (let i = 1; i < 40; i++) {
      expect(getTrackStatus(progress, [world], world, scenario, tracks[i], i)).toBe("LOCKED");
    }

    for (let i = 0; i < 39; i++) {
      progress = recordTrackCompletion(progress, "curriculum", tracks[i].id);
      expect(getTrackStatus(progress, [world], world, scenario, tracks[i + 1], i + 1)).toBe(
        "AVAILABLE"
      );
    }

    progress = recordTrackCompletion(progress, "curriculum", tracks[39].id);
    expect(isScenarioCompleted(progress, [world], "curriculum", "main")).toBe(true);
  });
});

describe("validateProgressionContent", () => {
  it("accepts production-like worlds without metadata", () => {
    const world = makeWorld("forgotten_citadel", [
      makeScenario("citadel_path", [makeTrack("fc_t01")]),
    ]);
    const issues = validateProgressionContent([world]);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("flags unknown world requirement", () => {
    const world = makeWorld("w", [makeScenario("s", [makeTrack("t1")])], {
      progression: { requiresWorldIds: ["missing"] },
    });
    const issues = validateProgressionContent([world]);
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });
});

describe("replay preserves completion", () => {
  it("completion remains after second record (replay win)", () => {
    let progress = createDefaultProgression();
    progress = recordTrackCompletion(progress, "starter_world", "t1");
    progress = recordTrackCompletion(progress, "starter_world", "t1");
    const scenario = SEQUENTIAL_WORLD.scenarios[0];
    expect(getTrackStatus(progress, [SEQUENTIAL_WORLD], SEQUENTIAL_WORLD, scenario, scenario.tracks![1], 1)).toBe(
      "AVAILABLE"
    );
  });
});
