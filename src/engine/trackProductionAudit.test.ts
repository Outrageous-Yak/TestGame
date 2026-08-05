import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { Scenario } from "./types";
import { newGame } from "./api";
import {
  analyzeTrackQuality,
  formatQualityReport,
  computeOptimalSolution,
} from "./trackAnalysis";

const root = join(import.meta.dirname, "..", "..");
const fcDir = join(root, "public/worlds/forgotten_citadel/scenarios");
const prismDir = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");
const auditDir = join(root, "docs/forgotten-citadel");

let prismCache: Array<{ file: string; scenario: Scenario; path: string[] }> | null = null;

function loadPrismWithPaths(): Array<{ file: string; scenario: Scenario; path: string[] }> {
  if (prismCache) return prismCache;
  const items = readdirSync(prismDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      scenario: JSON.parse(readFileSync(join(prismDir, file), "utf8")) as Scenario,
    }));
  prismCache = items.map(({ file, scenario }) => {
    const base = newGame(scenario);
    const sol = computeOptimalSolution(base, 80, 400000, {
      countAlternativePaths: false,
    });
    return { file, scenario, path: sol.pathHexIds };
  });
  return prismCache;
}

describe("Forgotten Citadel production audit", () => {
  const prismData = loadPrismWithPaths();
  const fcFiles = readdirSync(fcDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      scenario: JSON.parse(readFileSync(join(fcDir, file), "utf8")) as Scenario,
    }));
  const reportCache = new Map<string, ReturnType<typeof analyzeTrackQuality>>();
  const reports: string[] = [];

  for (const { file, scenario } of fcFiles) {
    it(`${scenario.id} production quality gates`, () => {
      const report = analyzeTrackQuality(scenario, prismData);
      reportCache.set(scenario.id, report);
      reports.push(formatQualityReport(report));

      expect(report.shortestSolution, "must be solvable").not.toBeNull();
      expect(report.maxPrismSimilarity.maxPercent, "originality").toBeLessThanOrEqual(35);
      expect(report.replay.length, "replay exists").toBeGreaterThan(0);
      expect(report.replay.some((s) => s.won), "replay reaches goal").toBe(true);
      expect(report.qualityScore, "quality score").toBeGreaterThanOrEqual(6);
      expect(report.engineeringScore, "engineering score").toBeGreaterThanOrEqual(6);
    });
  }

  it("writes PRODUCTION_AUDIT.md", () => {
    mkdirSync(auditDir, { recursive: true });

    const difficultyRows = fcFiles.map(({ file, scenario }) => {
      const r = reportCache.get(scenario.id) ?? analyzeTrackQuality(scenario, prismData);
      const mechanic =
        (scenario.transitions?.length ?? 0) > 0
          ? `${scenario.transitions!.length} portals`
          : "movement";
      const solveMin = r.shortestSolution ?? 0;
      const estTime = `${Math.ceil(solveMin * 0.5)}–${Math.ceil(solveMin * 1.2)} min`;
      return `| ${scenario.name} | ${r.estimatedDifficulty}/10 | ${mechanic} | track ${file} | ${estTime} |`;
    });

    const reportsList = fcFiles.map(({ scenario }) => reportCache.get(scenario.id)!);
    const notReadyReasons: string[] = [];

    for (const r of reportsList) {
      if (r.alternativeOptimalSolutions > 12) {
        notReadyReasons.push(
          `${r.trackId}: ${r.alternativeOptimalSolutions} equally-short solutions (target ≤12 for single elegant route)`
        );
      }
      if (r.maxPrismSimilarity.maxPercent > 35) {
        notReadyReasons.push(`${r.trackId}: Prism similarity gate ${r.maxPrismSimilarity.maxPercent}%`);
      }
    }

    const recommendation =
      notReadyReasons.length === 0 ? "READY FOR MERGE" : "NOT READY";

    const body = [
      "# Forgotten Citadel — Production Audit",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Production Recommendation",
      "",
      "```",
      recommendation,
      "```",
      "",
      notReadyReasons.length > 0
        ? "### Remaining issues\n\n" + notReadyReasons.map((r) => `- ${r}`).join("\n")
        : "All automated production gates passed.",
      "",
      "See `docs/forgotten-citadel/PRODUCTION_READINESS.md` for full engineering audit.",
      "",
      "## Difficulty Curve",
      "",
      "| Track | Difficulty | Main Mechanic | New Lesson | Est. Solve Time |",
      "|-------|------------|---------------|------------|-----------------|",
      ...difficultyRows,
      "",
      "## Per-Track Quality Reports",
      "",
      reports.join("\n\n---\n\n"),
    ].join("\n");

    writeFileSync(join(auditDir, "PRODUCTION_AUDIT.md"), body);
    expect(body.length).toBeGreaterThan(100);
  });
});
