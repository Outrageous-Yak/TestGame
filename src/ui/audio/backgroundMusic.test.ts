import { describe, expect, it } from "vitest";
import { isBackgroundMusicPlaying } from "./backgroundMusic";

describe("backgroundMusic", () => {
  it("reports not playing before start", () => {
    expect(isBackgroundMusicPlaying()).toBe(false);
  });
});
