import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { computeCloudVisibility } from "./computeCloudVisibility";
import { CLOUD_TEXTURE_PATHS } from "./CloudCover";

describe("cloud rendering CSS", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/cloud/cloudCover.css"), "utf8");

  it("cloud elements use pointer-events: none", () => {
    expect(css).toMatch(/\.cloudCover\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.moveOverlay\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.cloudGoalOverlay\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.cloudPortalLayer\s*\{[^}]*pointer-events:\s*none/);
  });

  it("documents z-index stack for cloud scenarios", () => {
    expect(css).toContain("--z-terrain: 1");
    expect(css).toContain("--z-cloud: 20");
    expect(css).toContain("--z-move: 30");
    expect(css).toContain("--z-goal: 40");
    expect(css).toContain("--z-portal: 45");
    expect(css).toContain("--z-player: 60");
  });

  it("move overlay z-index is above cloud", () => {
    const cloudZ = /--z-cloud:\s*(\d+)/.exec(css)?.[1];
    const moveZ = /--z-move:\s*(\d+)/.exec(css)?.[1];
    expect(Number(moveZ)).toBeGreaterThan(Number(cloudZ));
  });

  it("portal z-index is above move overlay", () => {
    const moveZ = /--z-move:\s*(\d+)/.exec(css)?.[1];
    const portalZ = /--z-portal:\s*(\d+)/.exec(css)?.[1];
    expect(Number(portalZ)).toBeGreaterThan(Number(moveZ));
  });

  it("player z-index is above portal", () => {
    const portalZ = /--z-portal:\s*(\d+)/.exec(css)?.[1];
    const playerZ = /--z-player:\s*(\d+)/.exec(css)?.[1];
    expect(Number(playerZ)).toBeGreaterThan(Number(portalZ));
  });

  it("uses generated realistic RGBA cloud textures for both densities", () => {
    expect(css).toContain("background-image: var(--cloudImage)");

    for (const path of Object.values(CLOUD_TEXTURE_PATHS)) {
      const file = readFileSync(join(process.cwd(), "public", path));
      expect(file.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(file.readUInt32BE(16)).toBeGreaterThanOrEqual(480);
      expect(file.readUInt32BE(20)).toBeGreaterThanOrEqual(250);
      expect(file[25]).toBe(6); // RGBA
    }
  });
});

describe("visible hexes do not render cloud cover (logic)", () => {
  it("visible state is not partial or cloud", () => {
    const m = computeCloudVisibility({
      mode: "cloudy",
      currentHexId: "A",
      legalMoveHexIds: new Set(["B"]),
      allTerrainHexIds: new Set(["A", "B", "C"]),
      goalHexId: "C",
      portalHexIds: new Set(),
      adjacency: (id) => (id === "A" ? new Set(["B"]) : id === "B" ? new Set(["A", "C"]) : new Set()),
    });
    expect(m.get("A")?.visibility).toBe("visible");
    expect(m.get("B")?.visibility).toBe("visible");
  });
});
