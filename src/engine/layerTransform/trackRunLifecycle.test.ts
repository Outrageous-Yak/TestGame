import { describe, expect, it } from "vitest";
import { resolveTrackRunOptions } from "./trackRunLifecycle";
import type { TrackTransformSelection } from "./types";

const storedSelection: TrackTransformSelection = {
  seed: "run-abc",
  layerTransforms: { 1: "reflect-horizontal", 2: "symmetry-b", 3: "identity", 4: "symmetry-c", 5: "identity", 6: "symmetry-b", 7: "reflect-horizontal" },
};

describe("track run lifecycle", () => {
  it("fresh generates a new-on-replay run and avoids the stored combination", () => {
    const opts = resolveTrackRunOptions({
      trackId: "fc_t01",
      intent: "fresh",
      stored: { trackId: "fc_t01", runSeed: "run-abc", selection: storedSelection },
      forcedSelection: null,
      variationParam: null,
      devMode: false,
    });
    expect(opts.mode).toBe("new-on-replay");
    expect(opts.preserveSelection).toBeUndefined();
    expect(opts.previousSelection).toEqual(storedSelection);
  });

  it("preserve reuses the stored seed and selection", () => {
    const opts = resolveTrackRunOptions({
      trackId: "fc_t01",
      intent: "preserve",
      stored: { trackId: "fc_t01", runSeed: "run-abc", selection: storedSelection },
      forcedSelection: null,
      variationParam: null,
      devMode: false,
    });
    expect(opts.mode).toBe("seeded");
    expect(opts.seed).toBe("run-abc");
    expect(opts.preserveSelection).toEqual(storedSelection);
  });

  it("preserve without storage falls back to a fresh run", () => {
    const opts = resolveTrackRunOptions({
      trackId: "fc_t01",
      intent: "preserve",
      stored: null,
      forcedSelection: null,
      variationParam: null,
      devMode: false,
    });
    expect(opts.mode).toBe("new-on-replay");
    expect(opts.preserveSelection).toBeUndefined();
  });

  it("replayAfterWin requests a new combination while avoiding the previous one", () => {
    const opts = resolveTrackRunOptions({
      trackId: "fc_t01",
      intent: "replayAfterWin",
      stored: { trackId: "fc_t01", runSeed: "run-abc", selection: storedSelection },
      forcedSelection: null,
      variationParam: null,
      devMode: false,
    });
    expect(opts.mode).toBe("new-on-replay");
    expect(opts.previousSelection).toEqual(storedSelection);
    expect(opts.preserveSelection).toBeUndefined();
  });

  it("fixed mode uses identity transforms", () => {
    const opts = resolveTrackRunOptions({
      trackId: "fc_t01",
      intent: "fixed",
      stored: null,
      forcedSelection: null,
      variationParam: "fixed",
      devMode: false,
    });
    expect(opts.mode).toBe("fixed");
  });

  it("forced dev URL overrides lifecycle", () => {
    const forced = { seed: "forced", layerTransforms: { 1: "symmetry-c" } };
    const opts = resolveTrackRunOptions({
      trackId: "fc_t01",
      intent: "preserve",
      stored: null,
      forcedSelection: forced,
      variationParam: null,
      devMode: true,
    });
    expect(opts.forcedSelection).toEqual(forced);
  });
});
