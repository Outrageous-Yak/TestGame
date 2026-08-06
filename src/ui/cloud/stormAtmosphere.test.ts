import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("reach sparkle CSS", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/game/reachSparkle.css"), "utf8");

  it("sparkles do not capture pointer events", () => {
    expect(css).toMatch(/\.reachSparkle\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.reachSparkleParticle\s*\{[^}]*pointer-events:\s*none|\.reachSparkle\s*\{[^}]*pointer-events:\s*none/);
  });
});

describe("storm weather CSS", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/cloud/stormWeather.css"), "utf8");

  it("storm layers do not capture pointer events", () => {
    expect(css).toMatch(/\.stormWeather\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.stormRain\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.stormLightningFlash\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.stormLightningBolt\s*\{[^}]*pointer-events:\s*none/);
  });
});

describe("cloud atmosphere CSS", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/cloud/cloudAtmosphere.css"), "utf8");

  it("dim overlays do not capture pointer events", () => {
    expect(css).toMatch(/\.cloudSceneDim\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.cloudBoardDim\s*\{[^}]*pointer-events:\s*none/);
  });

  it("full cloud is darker than partly cloudy", () => {
    const full = /--cloudDimEdge:\s*([\d.]+)/.exec(
      /\.cloudSceneDim--full_cloud\s*\{[^}]+\}/.exec(css)?.[0] ?? ""
    )?.[1];
    const partial = /--cloudDimEdge:\s*([\d.]+)/.exec(
      /\.cloudSceneDim--cloudy\s*\{[^}]+\}/.exec(css)?.[0] ?? ""
    )?.[1];
    expect(Number(full)).toBeGreaterThan(Number(partial));
  });
});
