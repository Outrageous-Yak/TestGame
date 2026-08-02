import { describe, expect, it } from "vitest";
import {
  getWorkletUrlFromBase,
  hasAudibleStartupEvents,
  shouldReportSilence,
} from "./audioDiagnostics";

describe("audio diagnostics", () => {
  it("worklet URL respects BASE_PATH subdirectory", () => {
    const url = getWorkletUrlFromBase("/TestGame/wind-composer/", "https://outrageous-yak.github.io");
    expect(url).toBe("https://outrageous-yak.github.io/TestGame/wind-composer/synth-worklet.js");
  });

  it("worklet URL does not assume domain root", () => {
    const url = getWorkletUrlFromBase("/TestGame/wind-composer/");
    expect(url).toContain("/TestGame/wind-composer/synth-worklet.js");
    expect(url).not.toMatch(/^https?:\/\/[^/]+\/synth-worklet\.js$/);
  });

  it("Start schedules audible events when master gain is non-zero", () => {
    expect(hasAudibleStartupEvents(3, 1)).toBe(true);
    expect(hasAudibleStartupEvents(0, 1)).toBe(false);
    expect(hasAudibleStartupEvents(3, 0)).toBe(false);
  });

  it("silence detector activates after threshold", () => {
    expect(shouldReportSilence(0, 2500)).toBe(true);
    expect(shouldReportSilence(0.01, 2500)).toBe(false);
    expect(shouldReportSilence(0, 500)).toBe(false);
  });
});
