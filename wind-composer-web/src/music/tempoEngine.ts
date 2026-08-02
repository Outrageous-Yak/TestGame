import { clamp } from "../utils";

/** Smooths BPM: max 1 BPM change per bar; gust adds temporary +2 BPM that decays. */
export class TempoEngine {
  private currentBpm = 100;
  private gustBoost = 0;
  private lastBar = -1;

  getBpm(): number {
    return this.currentBpm;
  }

  reset(bpm: number): void {
    this.currentBpm = bpm;
    this.gustBoost = 0;
    this.lastBar = -1;
  }

  update(
    targetBpm: number,
    bpmMin: number,
    bpmMax: number,
    measure: number,
    gust: boolean,
  ): number {
    const clampedTarget = clamp(targetBpm, bpmMin, bpmMax);
    if (gust) this.gustBoost = Math.min(2, this.gustBoost + 2);

    if (measure !== this.lastBar && measure >= 0) {
      this.lastBar = measure;
      const goal = clamp(clampedTarget + this.gustBoost, bpmMin, bpmMax + 2);
      const diff = goal - this.currentBpm;
      if (Math.abs(diff) > 0.001) {
        this.currentBpm += clamp(diff, -1, 1);
      }
      this.gustBoost *= 0.55;
      if (this.gustBoost < 0.05) this.gustBoost = 0;
    }

    return clamp(this.currentBpm, bpmMin, bpmMax + 2);
  }
}

export function windToTargetBpm(
  windKmh: number,
  bpmMin: number,
  bpmMax: number,
  trendWindDelta = 0,
  stormLikelihood = 0,
): number {
  const trendWind = windKmh + trendWindDelta * 0.35;
  const factor = clamp(trendWind / 45);
  return bpmMin + factor * (bpmMax - bpmMin) + stormLikelihood * 4;
}
