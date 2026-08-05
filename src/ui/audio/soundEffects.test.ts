import { describe, expect, it, beforeEach } from "vitest";
import {
  configureSoundEffects,
  isSoundEffectsEnabled,
  setSoundEffectsEnabled,
  SOUND_EFFECT_PATHS,
} from "./soundEffects";

describe("soundEffects", () => {
  beforeEach(() => {
    configureSoundEffects({ enabled: true, volume: 0.5 });
  });

  it("exposes sound asset paths", () => {
    expect(SOUND_EFFECT_PATHS.playerMove).toBe("sounds/effects/player-move.mp3");
    expect(SOUND_EFFECT_PATHS.portalLand).toBe("sounds/effects/portal-land.mp3");
    expect(SOUND_EFFECT_PATHS.goalLand).toBe("sounds/effects/goal-land.mp3");
    expect(SOUND_EFFECT_PATHS.failedMove).toBe("sounds/effects/failed-move.mp3");
  });

  it("tracks enabled state", () => {
    setSoundEffectsEnabled(false);
    expect(isSoundEffectsEnabled()).toBe(false);
    setSoundEffectsEnabled(true);
    expect(isSoundEffectsEnabled()).toBe(true);
  });
});
