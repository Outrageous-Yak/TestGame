import { clamp } from "../utils";
import type { MusicMemory } from "./musicMemory";

export interface TransitionContext {
  energy: number;
  stormLikelihood: number;
  sectionChange: boolean;
  transitionProbability: number;
  gust: boolean;
}

const TRANSITIONS = [
  "filter_sweep",
  "noise_riser",
  "reverse_crash",
  "sub_drop",
  "impact",
  "reverb_tail",
  "delay_freeze",
];

export class TransitionEngine {
  constructor(private memory: MusicMemory) {}

  maybeTransition(ctx: TransitionContext): string | null {
    let prob = ctx.transitionProbability * (0.4 + ctx.energy * 0.4);
    if (ctx.sectionChange) prob += 0.32;
    if (ctx.stormLikelihood > 0.5) prob += 0.14;
    if (ctx.gust) prob += 0.1;
    if (Math.random() > clamp(prob)) return null;

    let choices = TRANSITIONS.filter((t) => !this.memory.transitionRecent(t));
    if (!choices.length) choices = [...TRANSITIONS];
    const fx = choices[Math.floor(Math.random() * choices.length)];
    this.memory.rememberTransition(fx);
    return fx;
  }
}
