import type { RhythmEventDto } from "../types";
import { clamp } from "../utils";
import type { MusicMemory } from "./musicMemory";

export interface FillContext {
  bar: number;
  phraseLength: number;
  energy: number;
  stormLikelihood: number;
  fillProbability: number;
}

const FILL_TYPES = ["tom_run", "hat_roll", "snare_build", "crash", "perc_burst", "kick_double"];

export class FillEngine {
  private readonly fillBars = [4, 8, 16, 32, 64];

  constructor(private memory: MusicMemory) {}

  maybeFill(ctx: FillContext): RhythmEventDto[] {
    if (ctx.bar <= 0 || ctx.bar % 4 !== 0) return [];

    let prob = ctx.fillProbability * (0.5 + ctx.energy * 0.5) + ctx.stormLikelihood * 0.22;
    for (const fb of this.fillBars) {
      if (ctx.bar % fb === 0) prob += 0.07;
    }
    if (Math.random() > prob) return [];

    let fillType = FILL_TYPES[Math.floor(Math.random() * FILL_TYPES.length)];
    if (this.memory.fillOverused(fillType)) {
      fillType = Math.random() < 0.5 ? "perc_burst" : "kick_double";
    }
    this.memory.rememberFill(fillType);

    const strength = clamp(0.48 + ctx.energy * 0.42);
    const events: RhythmEventDto[] = [
      { layer: "snare", strength, is_pulse: true },
      { layer: "hat", strength: strength * 0.75, is_pulse: false },
    ];

    if (fillType === "crash") events.push({ layer: "crash", strength: 0.88, is_pulse: true });
    if (fillType === "tom_run") events.push({ layer: "tom", strength: strength * 0.7, is_pulse: false });
    if (fillType === "hat_roll") events.push({ layer: "open_hat", strength: strength * 0.65, is_pulse: false });
    if (fillType === "snare_build") events.push({ layer: "snare", strength: strength * 0.9, is_pulse: true });
    if (fillType === "kick_double") events.push({ layer: "kick", strength: strength * 0.85, is_pulse: true });
    if (fillType === "perc_burst") events.push({ layer: "noise", strength: strength * 0.6, is_pulse: false });

    return events;
  }
}
