import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  REACH_PULSE_INTERVAL_MS,
  shouldCardSitUnderCloud,
  shouldRenderCloudCover,
  shouldShowFullCloudMovePulse,
  shouldShowReachHints,
  shouldUseButtonReachPulse,
  countActiveMovePulses,
} from "./cloudBoardLayering";

describe("cloudBoardLayering — clockwise pulse", () => {
  it("Cloudy reuses button reach pulse when active", () => {
    expect(shouldUseButtonReachPulse(true, "cloudy")).toBe(true);
    expect(shouldUseButtonReachPulse(false, "cloudy")).toBe(false);
    expect(shouldShowFullCloudMovePulse(true, "cloudy")).toBe(false);
  });

  it("Full Cloud uses overlay pulse only when active", () => {
    expect(shouldUseButtonReachPulse(true, "full_cloud")).toBe(false);
    expect(shouldShowFullCloudMovePulse(true, "full_cloud")).toBe(true);
    expect(shouldShowFullCloudMovePulse(false, "full_cloud")).toBe(false);
  });

  it("only one active movable pulse at a time", () => {
    const ids = ["A", "B", "C"];
    expect(countActiveMovePulses(ids, "B", "cloudy")).toBe(1);
    expect(countActiveMovePulses(ids, "B", "full_cloud")).toBe(1);
    expect(countActiveMovePulses(ids, null, "cloudy")).toBe(0);
  });

  it("Full Cloud does not render static overlays on every legal move", () => {
    const legal = ["A", "B", "C"];
    for (const id of legal) {
      expect(shouldShowFullCloudMovePulse(id === "A", "full_cloud")).toBe(id === "A");
    }
    expect(countActiveMovePulses(legal, "A", "full_cloud")).toBe(1);
  });

  it("pulse interval matches Prism Path (850ms)", () => {
    expect(REACH_PULSE_INTERVAL_MS).toBe(850);
  });

  it("non-cloud scenarios use button pulse only", () => {
    expect(shouldUseButtonReachPulse(true, undefined)).toBe(true);
    expect(shouldShowFullCloudMovePulse(true, undefined)).toBe(false);
  });
});

describe("cloudBoardLayering — cards under cloud", () => {
  it("card under cloud on partial and full cloud visibility", () => {
    expect(shouldCardSitUnderCloud(true, "partial")).toBe(true);
    expect(shouldCardSitUnderCloud(true, "cloud")).toBe(true);
    expect(shouldCardSitUnderCloud(true, "visible")).toBe(false);
  });

  it("non-cloud scenarios do not force card under cloud", () => {
    expect(shouldCardSitUnderCloud(false, "cloud")).toBe(false);
  });
});

describe("cloudBoardLayering — cloud cover visibility", () => {
  it("renders cloud cover for partial and cloud only", () => {
    expect(shouldRenderCloudCover("visible")).toBe(false);
    expect(shouldRenderCloudCover("partial")).toBe(true);
    expect(shouldRenderCloudCover("cloud")).toBe(true);
    expect(shouldRenderCloudCover("faded")).toBe(false);
    expect(shouldRenderCloudCover("hidden")).toBe(false);
  });

  it("night and invisible suppress reach hints", () => {
    expect(shouldShowReachHints("night")).toBe(false);
    expect(shouldShowReachHints("invisible")).toBe(false);
    expect(shouldShowReachHints("memory")).toBe(true);
  });

  it("night and invisible do not show full-cloud move pulses", () => {
    expect(shouldShowFullCloudMovePulse(true, "night")).toBe(false);
    expect(shouldShowFullCloudMovePulse(true, "invisible")).toBe(false);
    expect(shouldShowFullCloudMovePulse(true, "full_cloud")).toBe(true);
  });

  it("night and invisible do not use button reach pulse", () => {
    expect(shouldUseButtonReachPulse(true, "night")).toBe(false);
    expect(shouldUseButtonReachPulse(true, "invisible")).toBe(false);
    expect(shouldUseButtonReachPulse(true, "cloudy")).toBe(true);
  });
});

describe("cloud placement CSS", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/cloud/cloudCover.css"), "utf8");
  const gc = readFileSync(join(process.cwd(), "src/ui/game/GameController.tsx"), "utf8");

  it("CloudCover is mounted as hexSlot sibling in GameController", () => {
    expect(gc).toMatch(/<\/button>[\s\S]*showCloudCover\s*\?[\s\S]*<CloudCover/);
    const cloudMount = gc.match(/showCloudCover\s*\?[\s\S]*?<CloudCover[\s\S]*?\/>/)?.[0] ?? "";
    expect(cloudMount).not.toContain("hexTerrainClip");
    expect(cloudMount).not.toContain("hexInner");
  });

  it("cloud slot selector is direct child of hexSlot", () => {
    expect(css).toMatch(/\.hexSlot\.cloudScenario\s*>\s*\.cloudCover\s*\{/);
  });

  it("cloud wrapper has no hex clip-path", () => {
    const block = /\.hexSlot\.cloudScenario\s*>\s*\.cloudCover\s*\{[^}]+}/.exec(css)?.[0] ?? "";
    expect(block).toContain("clip-path: none");
    expect(block).not.toMatch(/clip-path:\s*polygon/);
  });

  it("cloud wrapper uses overflow visible and pointer-events none", () => {
    const block = /\.hexSlot\.cloudScenario\s*>\s*\.cloudCover\s*\{[^}]+}/.exec(css)?.[0] ?? "";
    expect(block).toContain("overflow: visible");
    expect(block).toContain("pointer-events: none");
  });

  it("cloud visual bounds exceed hexSlot (negative offset + oversized)", () => {
    const block = /\.hexSlot\.cloudScenario\s*>\s*\.cloudCover\s*\{[^}]+}/.exec(css)?.[0] ?? "";
    expect(block).toMatch(/left:\s*-35%/);
    expect(block).toMatch(/width:\s*170%/);
    expect(Number(/height:\s*(\d+)%/.exec(block)?.[1])).toBeGreaterThan(100);
  });
});

describe("cloud z-index stack CSS", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/cloud/cloudCover.css"), "utf8");
  const appCss = readFileSync(join(process.cwd(), "src/ui/app.css"), "utf8");

  function z(name: string, file: string): number {
    const m = new RegExp(`--z-${name}:\\s*(\\d+)`).exec(file);
    expect(m).toBeTruthy();
    return Number(m![1]);
  }

  it("card z-index is below cloud", () => {
    expect(z("card", css)).toBeLessThan(z("cloud", css));
  });

  it("cloud z-index is below sparkle and move pulse", () => {
    expect(z("cloud", css)).toBeLessThan(z("sparkle", css));
    expect(z("sparkle", css)).toBeLessThan(z("move", css));
  });

  it("move pulse is below goal and portal", () => {
    expect(z("move", css)).toBeLessThan(z("goal", css));
    expect(z("move", css)).toBeLessThan(z("portal", css));
  });

  it("player is above all tile-level layers", () => {
    expect(z("player", css)).toBeGreaterThan(z("portal", css));
  });

  it("non-cloud card badge retains global z-index 22", () => {
    expect(appCss).toMatch(/\.cardBadge\s*\{[^}]*z-index:\s*22/);
  });

  it("cloud scenario card layer uses scoped z-index not 22", () => {
    expect(css).toContain("--z-card: 12");
    expect(css).toMatch(/cardLayerUnderCloud[\s\S]*z-index:\s*var\(--z-card\)/);
  });
});

describe("move overlay does not use terrain pseudo-elements", () => {
  const css = readFileSync(join(process.cwd(), "src/ui/cloud/cloudCover.css"), "utf8");

  it("move overlay is a separate element with hex clip only on overlay", () => {
    expect(css).toMatch(/\.moveOverlay\s*\{[^}]*clip-path:\s*polygon/);
    expect(css).not.toMatch(/\.hexInner::(?:before|after)[\s\S]*moveOverlay/);
  });
});
