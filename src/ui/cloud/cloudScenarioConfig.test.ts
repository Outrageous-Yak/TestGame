import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import worlds from "../../worlds";
import type { Scenario } from "../../engine/types";
import { assertScenario } from "../../engine/scenario";

const ROOT = join(process.cwd(), "public");
const PRISM = "worlds/rainbow_realm/scenarios/prism_path";

function loadJson(rel: string): Scenario {
  const s = JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as Scenario;
  assertScenario(s);
  return s;
}

function normalizeGameplay(s: Scenario) {
  return {
    layers: s.layers,
    start: s.start,
    goal: s.goal,
    missing: s.missing ?? [],
    blocked: s.blocked ?? [],
    movement: s.movement,
    transitions: s.transitions,
    revealOnEnterGuaranteedUp: s.revealOnEnterGuaranteedUp ?? true,
  };
}

const realm = worlds.find((w) => w.id === "rainbow_realm");
const prism = realm?.scenarios.find((s) => s.id === "prism_path");
const cloudy = realm?.scenarios.find((s) => s.id === "cloudy");
const fullCloud = realm?.scenarios.find((s) => s.id === "full_cloud");
const citadel = worlds.find((w) => w.id === "forgotten_citadel");
const citadelPath = citadel?.scenarios.find((s) => s.id === "citadel_path");
const citadelPartlyCloudy = citadel?.scenarios.find(
  (s) => s.id === "citadel_partly_cloudy"
);
const citadelCloudy = citadel?.scenarios.find((s) => s.id === "citadel_cloudy");

describe("cloud scenario registry", () => {
  it("Partly Cloudy exists", () => {
    expect(cloudy).toBeDefined();
    expect(cloudy?.name).toBe("Partly Cloudy");
  });

  it("Cloudy exists", () => {
    expect(fullCloud).toBeDefined();
    expect(fullCloud?.name).toBe("Cloudy");
  });

  it("both scenario IDs are unique", () => {
    const ids = realm?.scenarios.map((s) => s.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("prism_path");
    expect(ids).toContain("cloudy");
    expect(ids).toContain("full_cloud");
  });

  it("descriptions match spec", () => {
    expect(cloudy?.desc).toBe(
      "Navigate through shifting cloud banks. Your position, possible moves, and the nearby path remain visible."
    );
    expect(fullCloud?.desc).toBe(
      "The board is hidden beneath dense clouds. Only your position, possible moves, portals, and the goal remain visible."
    );
  });

  it("cloudMode metadata is set", () => {
    expect(cloudy?.cloudMode).toBe("cloudy");
    expect(fullCloud?.cloudMode).toBe("full_cloud");
    expect(prism?.cloudMode).toBeUndefined();
  });
});

describe("cloud scenarios match Prism Path gameplay per track", () => {
  const pairs = prism?.tracks?.map((t, i) => ({
    name: t.name,
    prismJson: t.scenarioJson,
    cloudyJson: cloudy?.tracks?.[i]?.scenarioJson,
    fullJson: fullCloud?.tracks?.[i]?.scenarioJson,
  })) ?? [];

  for (const p of pairs) {
    it(`${p.name}: same JSON paths as Prism Path`, () => {
      expect(p.cloudyJson).toBe(p.prismJson);
      expect(p.fullJson).toBe(p.prismJson);
    });

    it(`${p.name}: same normalized gameplay config`, () => {
      const base = normalizeGameplay(loadJson(p.prismJson));
      const c = normalizeGameplay(loadJson(p.cloudyJson!));
      const f = normalizeGameplay(loadJson(p.fullJson!));
      expect(c).toEqual(base);
      expect(f).toEqual(base);
    });
  }
});

describe("Forgotten Citadel cloud scenario registry", () => {
  it("adds Partly Cloudy and Cloudy variants with unique IDs", () => {
    expect(citadelPartlyCloudy?.name).toBe("Partly Cloudy");
    expect(citadelPartlyCloudy?.cloudMode).toBe("cloudy");
    expect(citadelCloudy?.name).toBe("Cloudy");
    expect(citadelCloudy?.cloudMode).toBe("full_cloud");

    const ids = citadel?.scenarios.map((scenario) => scenario.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "citadel_path",
      "citadel_partly_cloudy",
      "citadel_cloudy",
      "citadel_fork_memory",
      "citadel_fork_lantern",
      "citadel_fork_echo",
      "citadel_fork_night",
      "citadel_fork_invisible",
      "citadel_fork_crystal_vision",
    ]);
  });

  it("Fork visibility scenarios point at Portal Fork", () => {
    const forkIds = [
      "citadel_fork_memory",
      "citadel_fork_lantern",
      "citadel_fork_echo",
      "citadel_fork_night",
      "citadel_fork_invisible",
      "citadel_fork_crystal_vision",
    ];
    for (const id of forkIds) {
      const s = citadel?.scenarios.find((sc) => sc.id === id);
      expect(s?.tracks?.length).toBe(1);
      expect(s?.tracks?.[0]?.id).toBe("fc_t03");
      expect(s?.scenarioJson).toContain("track03.json");
    }
  });

  const pairs =
    citadelPath?.tracks?.map((track, index) => ({
      name: track.name,
      baseJson: track.scenarioJson,
      partlyJson: citadelPartlyCloudy?.tracks?.[index]?.scenarioJson,
      cloudyJson: citadelCloudy?.tracks?.[index]?.scenarioJson,
    })) ?? [];

  for (const pair of pairs) {
    it(`${pair.name}: cloud variants reuse Citadel Path gameplay`, () => {
      expect(pair.partlyJson).toBe(pair.baseJson);
      expect(pair.cloudyJson).toBe(pair.baseJson);

      const base = normalizeGameplay(loadJson(pair.baseJson));
      expect(normalizeGameplay(loadJson(pair.partlyJson!))).toEqual(base);
      expect(normalizeGameplay(loadJson(pair.cloudyJson!))).toEqual(base);
    });
  }
});

describe("Prism Path scenario.json unchanged baseline", () => {
  it("track 1 start/goal/portals/movement", () => {
    const s = loadJson(`${PRISM}/scenario.json`);
    expect(s.start).toEqual({ layer: 1, row: 3, col: 1 });
    expect(s.goal).toEqual({ layer: 2, row: 1, col: 4 });
    expect(s.movement?.["2"]).toEqual({
      rows: {
        "0": { direction: "LEFT", amount: 1 },
        "1": { direction: "RIGHT", amount: 1 },
        "2": { direction: "LEFT", amount: 1 },
        "3": { direction: "RIGHT", amount: 1 },
        "4": { direction: "LEFT", amount: 1 },
        "5": { direction: "RIGHT", amount: 1 },
        "6": { direction: "LEFT", amount: 1 },
      },
    });
    expect(s.transitions?.length).toBeGreaterThanOrEqual(4);
  });
});
