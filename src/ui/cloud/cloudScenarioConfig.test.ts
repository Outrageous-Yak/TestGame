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

describe("cloud scenario registry", () => {
  it("Cloudy exists", () => {
    expect(cloudy).toBeDefined();
    expect(cloudy?.name).toBe("Cloudy");
  });

  it("Full Cloud exists", () => {
    expect(fullCloud).toBeDefined();
    expect(fullCloud?.name).toBe("Full Cloud");
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

describe("Prism Path scenario.json unchanged baseline", () => {
  it("track 1 start/goal/portals/movement", () => {
    const s = loadJson(`${PRISM}/scenario.json`);
    expect(s.start).toEqual({ layer: 1, row: 3, col: 1 });
    expect(s.goal).toEqual({ layer: 2, row: 1, col: 4 });
    expect(s.movement?.["2"]).toBe("SEVEN_LEFT_SIX_RIGHT");
    expect(s.transitions?.length).toBeGreaterThanOrEqual(4);
  });
});
