import type { MelodyNoteDto } from "../types";
import { clamp } from "../utils";
import type { MusicMemory } from "./musicMemory";
import type { StyleProfile } from "./styleEngine";

export interface BassContext {
  chordTones: number[];
  energy: number;
  windDirection: number;
  pressureTrend: number;
  barInPhrase: number;
  style: StyleProfile;
}

export class BassEngine {
  constructor(private memory: MusicMemory) {}

  onBar(ctx: BassContext): MelodyNoteDto[] {
    if (!ctx.chordTones.length) return [];
    const root = ctx.chordTones[0];
    const fifth = ctx.chordTones[Math.min(2, ctx.chordTones.length - 1)];
    const style = ctx.style.bassStyle;

    let pattern: number[];
    if (style === "ambient") {
      pattern = [root - 12];
    } else if (style === "house") {
      pattern = this.housePattern(root, fifth, ctx);
    } else if (style === "trance") {
      pattern = [root - 12, root - 5, root - 12, fifth - 12];
    } else if (style === "techno") {
      pattern = [root - 12, root - 12, fifth - 12, root - 12];
    } else {
      pattern = [root - 12, fifth - 12];
    }

    if (this.memory.bassOverused(pattern)) {
      pattern = pattern.length > 1 ? [...pattern].reverse() : pattern;
    }
    this.memory.rememberBass(pattern);

    const vel = clamp(0.38 + ctx.energy * 0.48);
    return pattern.map((midi, i) => ({
      midi,
      velocity: vel * (0.88 + i * 0.03),
      duration_sec: 0.32 + (style === "house" ? 0.05 : 0),
    }));
  }

  private housePattern(root: number, fifth: number, ctx: BassContext): number[] {
    if (ctx.barInPhrase % 4 === 0) return [root - 12, root - 12, fifth - 12, root - 12];
    if (Math.random() < 0.35 + ctx.energy * 0.22) {
      return [root - 12, root - 7, fifth - 12, root - 12];
    }
    return [root - 12, root - 12, root - 12, fifth - 12];
  }
}
