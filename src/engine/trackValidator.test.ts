import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Scenario } from "./types";
import {
  validateTrack,
  fingerprintsFromDirectory,
  geometryFingerprint,
} from "./trackValidator";

const root = join(import.meta.dirname, "..", "..");
const fcDir = join(root, "public/worlds/forgotten_citadel/scenarios");
const prismDir = join(root, "public/worlds/rainbow_realm/scenarios/prism_path");

const referenceFp = fingerprintsFromDirectory(prismDir);
const fcFiles = readdirSync(fcDir).filter((f) => f.endsWith(".json")).sort();

describe("trackValidator", () => {
  it("geometry fingerprint ignores metadata", () => {
    const a: Scenario = {
      id: "a",
      name: "a",
      layers: 7,
      start: { layer: 1, row: 3, col: 1 },
      goal: { layer: 2, row: 1, col: 4 },
      missing: [],
      blocked: [],
      transitions: [],
      movement: { "1": "NONE" },
      revealOnEnterGuaranteedUp: false,
    };
    const b = { ...a, id: "b", name: "b", description: "different" };
    expect(geometryFingerprint(a)).toBe(geometryFingerprint(b));
  });

  describe("Forgotten Citadel tracks", () => {
    for (const file of fcFiles) {
      const scenario = JSON.parse(
        readFileSync(join(fcDir, file), "utf8")
      ) as Scenario;

      it(`${scenario.id} (${file}) passes validation`, () => {
        const report = validateTrack(scenario, {
          file,
          referenceFingerprints: referenceFp,
        });

        if (!report.valid) {
          const detail = report.issues
            .filter((i) => i.severity === "error")
            .map((i) => `${i.code}: ${i.message}`)
            .join("\n");
          expect.fail(`${scenario.id} failed:\n${detail}`);
        }

        expect(report.minMovesToGoal).not.toBeNull();
        expect(report.minMovesToGoal).toBeGreaterThan(0);
      });
    }
  });
});
