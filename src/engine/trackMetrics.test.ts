import { describe, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Scenario } from "./types";
import { newGame } from "./api";
import { computeOptimalSolution } from "./trackAnalysis";
import { countSolutionsWithin, OPTIMAL_COUNT_TARGETS } from "./puzzleFitness";

const root = join(import.meta.dirname, "..", "..");
const fcDir = join(root, "public/worlds/forgotten_citadel/scenarios");

describe("track metrics snapshot", () => {
  it("logs optimal counts", () => {
    const files = readdirSync(fcDir).filter((f) => f.endsWith(".json")).sort();
    for (const file of files) {
      const scenario = JSON.parse(readFileSync(join(fcDir, file), "utf8")) as Scenario;
      const base = newGame(scenario);
      const sol = computeOptimalSolution(base);
      const counts = countSolutionsWithin(base, 80, 5);
      const t = OPTIMAL_COUNT_TARGETS[scenario.id];
      console.log(
        `${scenario.id}: moves=${sol.minMoves} optimal=${counts.optimal} +5=${counts.withinSlack} target=${t?.min}-${t?.max}`
      );
    }
  });
});
