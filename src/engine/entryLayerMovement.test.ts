import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getMinMovesToGoal, newGame } from "./api";
import { endTurn } from "./endTurn";
import { assertScenario } from "./scenario";
import type { Scenario } from "./types";

const scenariosDir = join(
  import.meta.dirname,
  "..",
  "..",
  "public",
  "worlds",
  "forgotten_citadel",
  "scenarios"
);

function loadScenario(file: string): Scenario {
  const scenario = JSON.parse(
    readFileSync(join(scenariosDir, file), "utf8")
  ) as Scenario;
  assertScenario(scenario);
  return scenario;
}

describe("entry-activated layer movement", () => {
  it("keeps an unentered moving layer frozen", () => {
    const state = newGame(loadScenario("track01.json"));
    const before = state.rows.get(2)?.map((row) => [...row]);

    endTurn(state);

    expect(state.movementActiveLayers).toEqual(new Set([1]));
    expect(state.rows.get(2)).toEqual(before);
  });

  it("makes Gate Order solvable in 8 moves", () => {
    const state = newGame(loadScenario("track08.json"));
    expect(getMinMovesToGoal(state, 120)).toBe(8);
  });

  it("makes Citadel Engine solvable in 18 moves", () => {
    const state = newGame(loadScenario("track10.json"));
    expect(getMinMovesToGoal(state, 120)).toBe(18);
  });
});
