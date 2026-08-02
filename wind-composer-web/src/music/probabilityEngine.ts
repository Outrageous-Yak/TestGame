import { clamp } from "../utils";

export interface WeightedChoice {
  label: string;
  weight: number;
}

export function weightedChoice(options: WeightedChoice[]): string {
  const total = options.reduce((s, o) => s + Math.max(0, o.weight), 0);
  if (total <= 0) return options[0]?.label ?? "";
  let pick = Math.random() * total;
  for (const o of options) {
    pick -= Math.max(0, o.weight);
    if (pick <= 0) return o.label;
  }
  return options[options.length - 1].label;
}

export function gustActionWeights(windSpeed: number, gustDelta: number, energy: number): Record<string, number> {
  const strength = clamp((gustDelta / 25) + energy * 0.3 + windSpeed / 80);
  return {
    bass_variation: 0.25 * strength,
    fill: 0.3 * strength,
    lead_flourish: 0.2 * strength,
    reverse_fx: 0.1 * strength * 0.5,
    riser: 0.1 * strength,
    crash: 0.15 * strength,
  };
}

export function pickGustAction(weights: Record<string, number>): string {
  return weightedChoice(Object.entries(weights).map(([label, weight]) => ({ label, weight })));
}

export function beatMicroDecision(energy: number): string {
  const p = Math.random();
  if (p < 0.02 * energy) return "hat_ghost";
  if (p < 0.04 * energy) return "filter_tick";
  if (p < 0.06 * energy) return "pan_drift";
  return "none";
}
