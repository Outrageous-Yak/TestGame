import { clamp } from "../utils";
import type { ProducerAction } from "./producerTypes";

export class NoveltyManager {
  private recentActions: ProducerAction[] = [];
  private motifRepetitions = 0;
  private lastSurpriseBar = -32;

  reset(): void {
    this.recentActions = [];
    this.motifRepetitions = 0;
    this.lastSurpriseBar = -32;
  }

  recordAction(action: ProducerAction, bar: number): void {
    this.recentActions.push(action);
    if (this.recentActions.length > 20) this.recentActions.shift();
    if (action === "AddFill" || action === "TriggerDrop" || action === "BeginBreakdown") {
      this.lastSurpriseBar = bar;
    }
  }

  canSurprise(bar: number, surpriseBudget: number): boolean {
    const barsSince = bar - this.lastSurpriseBar;
    return barsSince >= 16 && surpriseBudget > 0.35;
  }

  actionCooldown(action: ProducerAction): boolean {
    const recent = this.recentActions.slice(-4);
    return recent.filter((a) => a === action).length >= 2;
  }

  variationTarget(variationSetting: number): number {
    return clamp(0.25 + variationSetting * 0.55, 0.2, 0.85);
  }

  familiarityTarget(variationSetting: number): number {
    return clamp(1 - variationSetting * 0.45, 0.35, 0.9);
  }
}
