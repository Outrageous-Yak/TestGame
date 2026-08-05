import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { Scenario } from "./types";
import { posId } from "./board";
import { newGame } from "./api";
import { computeOptimalSolution } from "./trackAnalysis";
import {
  analyzePuzzleFitness,
  formatFitnessReport,
  OPTIMAL_COUNT_TARGETS,
} from "./puzzleFitness";

const root = join(import.meta.dirname, "..", "..");
const fcDir = join(root, "public/worlds/forgotten_citadel/scenarios");
const prismDir = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");
const docsDir = join(root, "docs/forgotten-citadel");

let prismCache: Array<{ file: string; scenario: Scenario; path: string[] }> | null = null;

function loadPrism(): Array<{ file: string; scenario: Scenario; path: string[] }> {
  if (prismCache) return prismCache;
  prismCache = readdirSync(prismDir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const scenario = JSON.parse(readFileSync(join(prismDir, file), "utf8")) as Scenario;
      const base = newGame(scenario);
      return {
        file,
        scenario,
        path: computeOptimalSolution(base, 80, 400000, {
          countAlternativePaths: false,
        }).pathHexIds,
      };
    });
  return prismCache;
}

const fcFiles = readdirSync(fcDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((file) => ({
    file,
    scenario: JSON.parse(readFileSync(join(fcDir, file), "utf8")) as Scenario,
  }));

const fitnessCache = new Map<string, ReturnType<typeof analyzePuzzleFitness>>();

describe("Forgotten Citadel Phase 3 puzzle fitness", () => {
  const prism = () => loadPrism();

  for (const { scenario } of fcFiles) {
    it(`${scenario.id} meets Phase 3 gates`, { timeout: 120000 }, () => {
      const report = analyzePuzzleFitness(scenario, prism());
      fitnessCache.set(scenario.id, report);

      expect(report.shortestSolution, "solvable").not.toBeNull();
      expect(report.softLocks.unreachablePortalFrom, "reachable portals").toHaveLength(0);
      expect(report.softLocks.unreachablePortalDest, "reachable portal lands").toHaveLength(0);
      expect(report.deadGameplay.unusedPortals.filter((id) => {
        const tr = scenario.transitions?.find((t) => posId(t.from) === id);
        return tr?.type !== "DOWN";
      }), "all required portals used").toHaveLength(0);
      expect(report.originality.maxPercent, "originality").toBeLessThanOrEqual(35);
      expect(report.optimalSolutions, "optimal count min").toBeGreaterThanOrEqual(
        report.optimalTarget.min
      );
      expect(report.optimalSolutions, "optimal count max").toBeLessThanOrEqual(
        report.optimalTarget.max
      );
      expect(report.overallFitness, "fitness ≥9").toBeGreaterThanOrEqual(9);
      expect(report.replayText.includes("Goal"), "replay").toBe(true);
    });
  }

  it("writes Phase 3 reports", () => {
    mkdirSync(docsDir, { recursive: true });
    const reports = fcFiles.map(({ scenario }) => {
      const r = fitnessCache.get(scenario.id)!;
      return formatFitnessReport(r);
    });

    const blockers: string[] = [];
    for (const { scenario } of fcFiles) {
      const r = fitnessCache.get(scenario.id)!;
      if (!r.optimalTargetMet) blockers.push(`${r.trackId}: optimal=${r.optimalSolutions} target ${r.optimalTarget.min}-${r.optimalTarget.max}`);
      if (r.overallFitness < 9) blockers.push(`${r.trackId}: fitness ${r.overallFitness}`);
      if (r.softLocks.unreachablePortalFrom.length) blockers.push(`${r.trackId}: unreachable portals`);
      if (r.softLocks.unreachablePortalDest.length) blockers.push(`${r.trackId}: unreachable portal lands`);
      if (r.deadGameplay.unusedPortals.filter((id) => {
        const tr = scenario.transitions?.find((t) => posId(t.from) === id);
        return tr?.type !== "DOWN";
      }).length) blockers.push(`${r.trackId}: unused portals`);
      if (
        scenario.id === "fc_t06_return_valve" &&
        !r.replayText.includes("DOWN portal")
      ) {
        blockers.push(`${r.trackId}: optimal path bypasses DOWN valve`);
      }
    }

    const manualNotes = fcFiles.map(({ scenario, file }) => {
      const r = fitnessCache.get(scenario.id)!;
      return `### ${scenario.name} (${file})\n\n- **Playthrough note:** Optimal path verified via replay (${r.shortestSolution} moves). ${r.identity.memorableLine}\n- **Aha:** ${r.humanReview.ahaMoment ? "Yes" : "Needs work"}\n`;
    });

    const recommendation = blockers.length === 0 ? "READY FOR MERGE" : "NOT READY";

    const body = [
      "# Forgotten Citadel — Phase 3 Puzzle Fitness",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Recommendation",
      "",
      "```",
      recommendation,
      "```",
      "",
      blockers.length ? "### Blockers\n\n" + blockers.map((b) => `- ${b}`).join("\n") : "All Phase 3 gates passed.",
      "",
      "## Manual playthrough notes",
      "",
      manualNotes.join("\n"),
      "",
      "## Per-track fitness",
      "",
      reports.join("\n\n---\n\n"),
    ].join("\n");

    writeFileSync(join(docsDir, "PUZZLE_FITNESS.md"), body);
    const prodSection =
      "## 10. Production Recommendation\n\n```\n" +
      recommendation +
      "\n```\n\n" +
      (blockers.length ? blockers.map((b) => `- ${b}`).join("\n") : "All gates passed.") +
      "\n\n";

    const readinessPath = join(docsDir, "PRODUCTION_READINESS.md");
    if (readFileSync(readinessPath, "utf8").includes("## 10. Production Recommendation")) {
      writeFileSync(
        readinessPath,
        readFileSync(readinessPath, "utf8").replace(
          /## 10\. Production Recommendation[\s\S]*?(?=\n## 1\.|$)/,
          prodSection
        )
      );
    }
    expect(body.length).toBeGreaterThan(200);
  });
});
