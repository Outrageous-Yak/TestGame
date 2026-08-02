import { describe, expect, it } from "vitest";
import { loadSettings } from "../storage";
import { StationStore } from "../storage";
import { MusicSession } from "./musicSession";

describe("tick stress", () => {
  it("handles large sample position without hanging", () => {
    const settings = loadSettings();
    const stations = new StationStore();
    const session = new MusicSession(settings, stations);
    session.setMusicalStyle("Deep House");
    const start = performance.now();
    const tick = session.tick(48000 * 3600, 0.5, false, 48000);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
    expect(tick.plan.tempo_bpm).toBeGreaterThan(0);
  });

  it("handles first tick at zero", () => {
    const settings = loadSettings();
    const stations = new StationStore();
    const session = new MusicSession(settings, stations);
    const tick = session.tick(0, 0.3, false, 44100);
    expect(tick.plan.chord).not.toBeNull();
  });
});
