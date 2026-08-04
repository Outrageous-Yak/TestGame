import { describe, expect, it } from "vitest";
import {
  deriveCloudSeed,
  hashCloudSeed,
  cloudSeedClassName,
  CLOUD_TEMPLATE_COUNT,
  PARTIAL_PATTERN_COUNT,
} from "./cloudSeed";

describe("cloudSeed", () => {
  const scenarioId = "cloudy";
  const layerId = "L2";
  const hexId = "L2-R3-C4";

  it("same scenario/layer/hex seed produces the same template", () => {
    const a = deriveCloudSeed(scenarioId, layerId, hexId, "full");
    const b = deriveCloudSeed(scenarioId, layerId, hexId, "full");
    expect(a).toEqual(b);
  });

  it("different hex IDs produce varied template assignments", () => {
    const seeds = new Set(
      ["L2-R0-C0", "L2-R1-C1", "L2-R2-C2", "L2-R3-C3"].map((h) =>
        deriveCloudSeed(scenarioId, layerId, h, "full").templateIndex
      )
    );
    expect(seeds.size).toBeGreaterThan(1);
  });

  it("template index always remains in range", () => {
    for (let i = 0; i < 50; i++) {
      const h = `L2-R${i}-C${i}`;
      const s = deriveCloudSeed(scenarioId, layerId, h, "full");
      expect(s.templateIndex).toBeGreaterThanOrEqual(0);
      expect(s.templateIndex).toBeLessThan(CLOUD_TEMPLATE_COUNT);
    }
  });

  it("scale values remain within safe bounds", () => {
    const s = deriveCloudSeed(scenarioId, layerId, hexId, "partial");
    expect(s.scaleX).toBeGreaterThanOrEqual(0.88);
    expect(s.scaleX).toBeLessThanOrEqual(1.14);
    expect(s.scaleY).toBeGreaterThanOrEqual(0.88);
    expect(s.scaleY).toBeLessThanOrEqual(1.14);
  });

  it("rotation values remain within safe bounds", () => {
    const s = deriveCloudSeed(scenarioId, layerId, hexId, "full");
    expect(s.rotationDeg).toBeGreaterThanOrEqual(-7);
    expect(s.rotationDeg).toBeLessThanOrEqual(7);
  });

  it("animation durations remain within safe bounds", () => {
    const s = deriveCloudSeed(scenarioId, layerId, hexId, "full");
    expect(s.durationSec).toBeGreaterThanOrEqual(18);
    expect(s.durationSec).toBeLessThanOrEqual(32);
    expect(s.innerDurationSec).toBeGreaterThanOrEqual(24);
    expect(s.innerDurationSec).toBeLessThanOrEqual(40);
  });

  it("partial-cloud template selection is deterministic", () => {
    const a = deriveCloudSeed(scenarioId, layerId, hexId, "partial");
    const b = deriveCloudSeed(scenarioId, layerId, hexId, "partial");
    expect(a.partialPatternIndex).toBe(b.partialPatternIndex);
    expect(a.partialPatternIndex).toBeGreaterThanOrEqual(0);
    expect(a.partialPatternIndex).toBeLessThan(PARTIAL_PATTERN_COUNT);
  });

  it("hashCloudSeed is stable", () => {
    expect(hashCloudSeed(["a", "b", "c"])).toBe(hashCloudSeed(["a", "b", "c"]));
  });

  it("cloudSeedClassName includes template class", () => {
    const seed = deriveCloudSeed(scenarioId, layerId, hexId, "partial");
    const cls = cloudSeedClassName(seed, "partial");
    expect(cls).toContain(`cloudTpl${seed.templateIndex}`);
    expect(cls).toContain(`cloudPartial${seed.partialPatternIndex}`);
  });
});
