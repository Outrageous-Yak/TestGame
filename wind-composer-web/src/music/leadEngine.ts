import type { MelodyNoteDto } from "../types";
import { clamp, randBetween } from "../utils";
import type { MusicMemory } from "./musicMemory";
import type { ScaleEngine } from "./scaleEngine";
import type { StyleProfile } from "./styleEngine";

export interface LeadContext {
  chordTones: number[];
  energy: number;
  hope: number;
  bar: number;
  gust: boolean;
  style: StyleProfile;
}

export class LeadEngine {
  private motif: number[] = [];
  private phrasePhase = 0;

  constructor(
    private scale: ScaleEngine,
    private memory: MusicMemory,
  ) {}

  maybeNotes(ctx: LeadContext): MelodyNoteDto[] {
    const activity = ctx.style.leadActivity * (0.4 + ctx.energy * 0.6) * ctx.hope;
    if (Math.random() > activity * 0.35 + 0.05) return [];
    if (!ctx.chordTones.length) return [];

    if (ctx.gust || Math.random() < 0.15) return this.flourish(ctx);

    if (this.phrasePhase === 0 || Math.random() < 0.3) {
      this.motif = this.buildMotif(ctx);
      this.phrasePhase = 1;
      if (!this.memory.motifOverused(this.motif)) {
        this.memory.rememberMotif(this.motif);
      } else {
        this.motif = [ctx.chordTones[Math.floor(Math.random() * ctx.chordTones.length)]];
      }
    }

    const midi = this.motif[0];
    this.motif = [...this.motif.slice(1), midi];
    const vel = clamp(0.32 + activity * 0.52);
    return [{ midi, velocity: vel, duration_sec: 0.55 + randBetween(0, 0.4) }];
  }

  private buildMotif(ctx: LeadContext): number[] {
    const tones = ctx.chordTones;
    const motif = [tones[Math.floor(Math.random() * tones.length)]];
    for (let i = 0; i < randBetween(2, 5); i++) {
      const step = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
      motif.push(this.scale.stepNote(motif[motif.length - 1], step, false));
    }
    return motif;
  }

  private flourish(ctx: LeadContext): MelodyNoteDto[] {
    const top = Math.max(...ctx.chordTones);
    return [{ midi: top, velocity: 0.78, duration_sec: 0.35 }];
  }
}
