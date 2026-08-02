import type { RhythmEventDto } from "../types";
import { clamp, randBetween } from "../utils";
import type { StyleProfile } from "./styleEngine";

export interface DrumContext {
  beat: number;
  bar: number;
  energy: number;
  precipitation: number;
  snowfall: number;
  style: StyleProfile;
  sectionEnergy: number;
}

export class DrumEngine {
  onBeat(ctx: DrumContext): RhythmEventDto[] {
    const events: RhythmEventDto[] = [];
    const step = ctx.beat % 16;
    const pattern = ctx.style.kickPattern;
    const density = ctx.style.drumDensity * (0.5 + ctx.energy * 0.5) * ctx.sectionEnergy;

    if (pattern[step] && Math.random() < 0.96) {
      events.push({ layer: "kick", strength: clamp(0.55 + ctx.energy * 0.35), is_pulse: true });
    }

    const hatPattern = ctx.style.hatPattern;
    if (density > 0.12 && hatPattern[step]) {
      const vel = clamp(density * 0.4 + randBetween(0, 0.12));
      const layer = ctx.style.offbeatOpenHat && step % 4 === 2 ? "open_hat" : "hat";
      events.push({ layer, strength: vel, is_pulse: false });
    }

    if (density > 0.2 && step % 2 === 1 && Math.random() < density * 0.85) {
      events.push({ layer: "hat", strength: clamp(density * 0.28), is_pulse: false });
    }

    if (density > 0.35 && (step === 4 || step === 12) && Math.random() < density) {
      const layer = ctx.style.useClap && step === 12 ? "clap" : "snare";
      events.push({ layer, strength: clamp(0.45 + ctx.energy * 0.35), is_pulse: true });
    }

    if (ctx.style.name === "Trance" && density > 0.5 && step % 2 === 0) {
      events.push({ layer: "hat", strength: clamp(density * 0.32), is_pulse: false });
    }

    if (ctx.style.name === "Deep House" && density > 0.4 && step % 4 === 2) {
      events.push({ layer: "percussion", strength: clamp(density * 0.35), is_pulse: false });
    }

    if (ctx.precipitation > 0.5 && step % 4 === 2) {
      events.push({ layer: "noise", strength: clamp(ctx.precipitation * 0.22), is_pulse: false });
    }

    if (ctx.snowfall > 0.2 && step % 8 === 0) {
      events.push({ layer: "ride", strength: 0.18, is_pulse: false });
    }

    if (Math.random() < density * 0.04 * ctx.energy) {
      events.push({ layer: "hat", strength: 0.12, is_pulse: false });
    }

    return events;
  }
}
