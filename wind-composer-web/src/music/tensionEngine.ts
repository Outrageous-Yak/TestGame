import { clamp } from "../utils";

/** Tracks musical tension with mandatory release after sustained peaks. */
export class TensionEngine {
  private tension = 0.35;
  private tensionBars = 0;
  private maxTensionBars = 24;

  getTension(): number {
    return this.tension;
  }

  reset(): void {
    this.tension = 0.35;
    this.tensionBars = 0;
  }

  update(
    target: number,
    section: string,
    pressureTrend: number,
    stormLikelihood: number,
    barChanged: boolean,
  ): number {
    const sectionBias =
      section === "Build" ? 0.12 : section === "Breakdown" ? 0.08 : section === "Drop" ? -0.15 : 0;
    const pressureBias = clamp(-pressureTrend * 0.02, -0.12, 0.12);
    const stormBias = stormLikelihood * 0.15;
    const goal = clamp(target + sectionBias + pressureBias + stormBias, 0, 1);

    this.tension += (goal - this.tension) * 0.08;

    if (barChanged) {
      if (this.tension > 0.65) this.tensionBars += 1;
      else this.tensionBars = Math.max(0, this.tensionBars - 1);

      if (this.tensionBars >= this.maxTensionBars) {
        this.tension *= 0.82;
        this.tensionBars = 0;
      }
    }

    return this.tension;
  }

  applyRelease(amount = 0.25): void {
    this.tension = clamp(this.tension - amount, 0, 1);
    this.tensionBars = 0;
  }
}
