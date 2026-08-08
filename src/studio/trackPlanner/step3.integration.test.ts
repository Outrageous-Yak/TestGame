import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

describe("Track Planner player lock bypass", () => {
  it("Track Planner does not apply player progression locks to authoring", () => {
    const root = join(import.meta.dirname, "..", "..");
    const screen = readFileSync(join(root, "studio/trackPlanner/TrackPlannerScreen.tsx"), "utf8");
    const editor = readFileSync(join(root, "studio/trackPlanner/editor/TrackEditor.tsx"), "utf8");
    expect(screen).not.toContain("getTrackStatus");
    expect(screen).not.toContain("isTrackUnlocked");
    expect(editor).not.toContain("getTrackStatus");
  });
});
