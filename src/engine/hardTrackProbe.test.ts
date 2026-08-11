import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { newGame } from "./api";
import { computeOptimalSolution } from "./trackAnalysis";
import { runSimulator } from "../studio/trackPlanner/simulation/runSimulator";
import { createEmptyTrack } from "../studio/trackPlanner/types";
import { scenarioJsonToTrack } from "../studio/trackPlanner/catalog";
import type { Scenario } from "./types";

const dir = join(import.meta.dirname, "../../public/worlds/forgotten_citadel/scenarios");

describe("1A hard-track probe (no crash)", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  for (const file of files) {
    it(`solver survives ${file}`, () => {
      const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as Scenario;
      // Ensure required fields
      const scenario: Scenario = {
        ...raw,
        id: raw.id ?? file,
        name: raw.name ?? file,
        layers: raw.layers ?? 7,
        missing: raw.missing ?? [],
        blocked: raw.blocked ?? [],
        transitions: raw.transitions ?? [],
        movement: raw.movement ?? {
          "1": "NONE", "2": "NONE", "3": "NONE", "4": "NONE",
          "5": "NONE", "6": "NONE", "7": "NONE",
        },
      };
      let sol;
      expect(() => {
        sol = computeOptimalSolution(newGame(scenario), 80, 200000, {
          countAlternativePaths: false,
        });
      }).not.toThrow();
      expect(sol!.stats.exploredNodes).toBeGreaterThanOrEqual(0);
      expect(
        sol!.minMoves === null || typeof sol!.minMoves === "number"
      ).toBe(true);

      const track = scenarioJsonToTrack(
        createEmptyTrack(file, "citadel_path", "forgotten_citadel", file),
        scenario
      );
      let result;
      expect(() => {
        result = runSimulator(track);
      }).not.toThrow();
      expect(["solvable", "unsolvable", "search_limit", "structural_error"]).toContain(
        result!.solverOutcome
      );
    }, 120000);
  }
});
