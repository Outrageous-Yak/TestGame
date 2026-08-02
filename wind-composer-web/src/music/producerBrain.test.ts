import { describe, expect, it } from "vitest";
import { ProducerBrain } from "./producerBrain";
import type { ProducerTickContext } from "./producerTypes";
import { DEEP_HOUSE_KICK, DEEP_HOUSE_TEMPO } from "./deepHouseGroove";
import { windToTargetBpm } from "./tempoEngine";

function baseCtx(overrides: Partial<ProducerTickContext> = {}): ProducerTickContext {
  return {
    styleName: "Deep House",
    bar: 8,
    measure: 8,
    beat: 32,
    energy: 0.55,
    section: "Groove",
    danceEffectsEnabled: true,
    weatherInfluence: "balanced",
    grooveStrength: "strong",
    variation: "evolving",
    windKmh: 18,
    gust: false,
    trendWindDelta: 2,
    trendPressureDelta: -1,
    stormLikelihood: 0.1,
    bpmMin: 110,
    bpmMax: 126,
    currentBpm: 118,
    ...overrides,
  };
}

describe("ProducerBrain", () => {
  it("produces Deep House four-on-the-floor kick pattern", () => {
    const brain = new ProducerBrain();
    const kick = brain.getKickPattern("Deep House");
    expect(kick).toEqual(DEEP_HOUSE_KICK);
    expect(kick.filter((x) => x > 0).length).toBe(4);
  });

  it("smooths target BPM within genre range", () => {
    const brain = new ProducerBrain();
    brain.tick(baseCtx({ windKmh: 5, currentBpm: 118 }));
    const t1 = brain.getTargetBpm();
    brain.tick(baseCtx({ windKmh: 45, currentBpm: t1, bar: 9 }));
    const t2 = brain.getTargetBpm();
    expect(t1).toBeGreaterThanOrEqual(DEEP_HOUSE_TEMPO.minBpm);
    expect(t2).toBeLessThanOrEqual(DEEP_HOUSE_TEMPO.maxBpm);
    expect(Math.abs(t2 - t1)).toBeLessThan(8);
  });

  it("evaluates and may reduce pads when density is high", () => {
    const brain = new ProducerBrain();
    for (let bar = 1; bar <= 16; bar++) {
      brain.tick(baseCtx({ bar, section: "Groove", energy: 0.85 }));
    }
    const state = brain.getState();
    expect(state.bar).toBe(16);
    expect(state.tension).toBeGreaterThan(0);
    expect(state.tension).toBeLessThan(1);
  });

  it("ramps startup groove phase", () => {
    const brain = new ProducerBrain();
    brain.tick(baseCtx({ bar: 0 }));
    expect(brain.getState().startupGroovePhase).toBe(0);
    brain.tick(baseCtx({ bar: 1 }));
    expect(brain.getState().startupGroovePhase).toBeGreaterThan(0);
  });
});

describe("windToTargetBpm", () => {
  it("maps wind within Deep House BPM range", () => {
    const low = windToTargetBpm(0, 110, 126);
    const high = windToTargetBpm(50, 110, 126);
    expect(low).toBeGreaterThanOrEqual(110);
    expect(high).toBeLessThanOrEqual(130);
    expect(high).toBeGreaterThan(low);
  });
});
