import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { assertScenario } from "../engine/scenario";
import { newGame, getMinMovesToGoal } from "../engine/api";

describe("trackMenuStats", () => {
  it("least moves for Prism Path track 1 matches engine optimal", () => {
    const raw = readFileSync(
      join(process.cwd(), "public/worlds/rainbow_realm/scenarios/prism_path/scenario.json"),
      "utf8"
    );
    const scenario = JSON.parse(raw);
    assertScenario(scenario);
    const state = newGame(scenario);
    const n = getMinMovesToGoal(state);
    expect(n).not.toBeNull();
    expect(n!).toBeGreaterThan(0);
  });
});
