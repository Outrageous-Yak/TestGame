import { describe, expect, it } from "vitest";
import { getGameAudioContext, unlockGameAudio } from "./gameAudioContext";

describe("gameAudioContext", () => {
  it("returns null outside browser", async () => {
    expect(await getGameAudioContext()).toBeNull();
    expect(await unlockGameAudio()).toBe(false);
  });
});
