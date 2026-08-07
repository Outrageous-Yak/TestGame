import { describe, expect, it } from "vitest";
import { VILLAIN_DISPLAY_NAMES, VILLAIN_VOICE_PATHS, villainDisplayName } from "./villainVoice";

describe("villainVoice", () => {
  it("maps bad1 to Lollipop Cop voice asset", () => {
    expect(VILLAIN_VOICE_PATHS.bad1).toBe("sounds/villains/lollipop-cop.mp3");
    expect(VILLAIN_DISPLAY_NAMES.bad1).toBe("Lollipop Cop");
    expect(villainDisplayName("bad1")).toBe("Lollipop Cop");
    expect(villainDisplayName("bad2")).toBe("bad2");
  });
});
