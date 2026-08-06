import { describe, expect, it } from "vitest";
import {
  UK_TRANCE_KICK,
  UK_TRANCE_TEMPO,
  ukTranceBassPattern,
} from "./ukTranceGroove";
import { ProducerBrain } from "./producerBrain";
import type { ProducerTickContext } from "./producerTypes";

function ukCtx(overrides: Partial<ProducerTickContext> = {}): ProducerTickContext {
  return {
    styleName: "UK Trance",
    bar: 16,
    measure: 16,
    beat: 64,
    energy: 0.7,
    section: "Drop",
    danceEffectsEnabled: true,
    weatherInfluence: "balanced",
    grooveStrength: "strong",
    variation: "evolving",
    windKmh: 22,
    gust: false,
    trendWindDelta: 1,
    trendPressureDelta: 0,
    stormLikelihood: 0.15,
    bpmMin: 134,
    bpmMax: 146,
    currentBpm: 140,
    ...overrides,
  };
}

describe("UK Trance groove", () => {
  it("uses four-on-the-floor kick", () => {
    expect(UK_TRANCE_KICK.filter((x) => x > 0).length).toBe(4);
  });

  it("rolling bass has offbeat 16th entries", () => {
    const pat = ukTranceBassPattern("rolling", 36);
    expect(pat.length).toBe(16);
    expect(pat.filter((x) => x > 0).length).toBeGreaterThan(6);
    expect(pat[1]).toBe(36);
    expect(pat[0]).toBe(0);
  });

  it("producer targets UK trance BPM range", () => {
    const brain = new ProducerBrain();
    brain.tick(ukCtx({ windKmh: 30 }));
    const bpm = brain.getTargetBpm();
    expect(bpm).toBeGreaterThanOrEqual(UK_TRANCE_TEMPO.minBpm);
    expect(bpm).toBeLessThanOrEqual(UK_TRANCE_TEMPO.maxBpm);
  });

  it("enables rolling bass mode for UK Trance", () => {
    const brain = new ProducerBrain();
    expect(brain.usesRollingBass("UK Trance")).toBe(true);
    expect(brain.getLeadPreset("UK Trance")).toBe("supersaw");
  });
});
