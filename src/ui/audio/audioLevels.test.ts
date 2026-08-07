import { describe, expect, it } from "vitest";
import {
  BGM_TARGET_PEAK_DB,
  PROMINENT_SFX_TARGET_PEAK_DB,
  SFX_TARGET_PEAK_DB,
  expectedBgmPlaybackPeakDb,
  expectedPlaybackPeakDb,
  normalizedBgmGain,
  normalizedSoundGain,
} from "./audioLevels";

describe("audioLevels", () => {
  it("normalizes standard effects to the same peak loudness", () => {
    const move = expectedPlaybackPeakDb("playerMove");
    const portal = expectedPlaybackPeakDb("portalLand");
    const failed = expectedPlaybackPeakDb("failedMove");
    const evilLaugh = expectedPlaybackPeakDb("redCardEvilLaugh");

    expect(move).toBeCloseTo(SFX_TARGET_PEAK_DB, 1);
    expect(portal).toBeCloseTo(SFX_TARGET_PEAK_DB, 1);
    expect(failed).toBeCloseTo(SFX_TARGET_PEAK_DB, 1);
    expect(evilLaugh).toBeCloseTo(PROMINENT_SFX_TARGET_PEAK_DB, 1);
  });

  it("makes goal and red-card laugh louder than standard effects", () => {
    const goal = expectedPlaybackPeakDb("goalLand");
    const evilLaugh = expectedPlaybackPeakDb("redCardEvilLaugh");
    const move = expectedPlaybackPeakDb("playerMove");

    expect(goal).toBeCloseTo(PROMINENT_SFX_TARGET_PEAK_DB, 1);
    expect(evilLaugh).toBeCloseTo(PROMINENT_SFX_TARGET_PEAK_DB, 1);
    expect(goal - move).toBeGreaterThan(0);
    expect(goal - move).toBeLessThanOrEqual(6);
  });

  it("keeps background music below sound effects", () => {
    const bgm = expectedBgmPlaybackPeakDb();
    const sfx = expectedPlaybackPeakDb("playerMove");

    expect(bgm).toBeCloseTo(BGM_TARGET_PEAK_DB, 1);
    expect(bgm).toBeLessThan(sfx);
  });

  it("exposes positive normalized gains", () => {
    expect(normalizedSoundGain("playerMove")).toBeGreaterThan(1);
    expect(normalizedSoundGain("goalLand")).toBeLessThan(1);
    expect(normalizedBgmGain()).toBeLessThan(1);
  });
});
