import { describe, expect, it } from "vitest";
import { hashCloudSeed } from "../cloud/cloudSeed";

const SPARKLE_COUNT = 7;

function sparkleColor(hexId: string, index: number): string {
  const colors = ["#ff6bcb", "#67a5ff", "#ffd36a", "#19ffb4", "#a58bff", "#ff9f5a", "#5af0ff", "#ff5d7a"];
  const h = hashCloudSeed([hexId, "sparkle", String(index)]);
  return colors[h % colors.length]!;
}

describe("ReachSparkle seeding", () => {
  it("produces stable sparkle colors per hex", () => {
    expect(sparkleColor("L1R2C3", 0)).toBe(sparkleColor("L1R2C3", 0));
    expect(sparkleColor("L1R2C3", 0)).not.toBe(sparkleColor("L1R2C4", 0));
  });

  it("uses multiple particles per hex", () => {
    const colors = new Set(Array.from({ length: SPARKLE_COUNT }, (_, i) => sparkleColor("hex-A", i)));
    expect(colors.size).toBeGreaterThan(1);
  });
});
