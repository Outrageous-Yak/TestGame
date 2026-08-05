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

  it("exposes player move asset path", () => {
    expect(SOUND_EFFECT_PATHS.playerMove).toBe("sounds/effects/player-move.mp3");
  });

  it("tracks enabled state", () => {
    setSoundEffectsEnabled(false);
    expect(isSoundEffectsEnabled()).toBe(false);
    setSoundEffectsEnabled(true);
    expect(isSoundEffectsEnabled()).toBe(true);
  });
});
