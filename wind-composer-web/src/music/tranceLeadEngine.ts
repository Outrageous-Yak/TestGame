import type { MelodyNoteDto } from "../types";
import { clamp } from "../utils";
import type { MusicMemory } from "./musicMemory";
import type { ScaleEngine } from "./scaleEngine";
import { UK_TRANCE_HOOK_CONTOURS } from "./ukTranceGroove";

export interface TranceLeadContext {
  chordTones: number[];
  energy: number;
  section: string;
  bar: number;
  rootMidi: number;
}

export class TranceLeadEngine {
  private hook: number[] = [];
  private hookBar = -1;
  private repeatCount = 0;
  private contourKey: keyof typeof UK_TRANCE_HOOK_CONTOURS = "rising";

  constructor(
    private scale: ScaleEngine,
    private memory: MusicMemory,
  ) {}

  reset(): void {
    this.hook = [];
    this.hookBar = -1;
    this.repeatCount = 0;
  }

  maybeNotes(ctx: TranceLeadContext): MelodyNoteDto[] {
    const inDrop = ctx.section === "Drop" || ctx.section === "Groove" || ctx.section === "Flow";
    const inBuild = ctx.section === "Build";
    if (!inDrop && !inBuild) return [];

    const activity = clamp(0.55 + ctx.energy * 0.4 + (inDrop ? 0.15 : 0));
    if (Math.random() > activity * 0.55) return [];

    if (!this.hook.length || ctx.bar - this.hookBar >= 8 || this.repeatCount >= 4) {
      this.hook = this.buildHook(ctx);
      this.hookBar = ctx.bar;
      this.repeatCount = 0;
      if (!this.memory.motifOverused(this.hook)) {
        this.memory.rememberMotif(this.hook);
      }
    }

    const noteIdx = this.repeatCount % this.hook.length;
    const midi = this.hook[noteIdx];
    this.repeatCount += 1;

    const vel = clamp(0.62 + ctx.energy * 0.28 + (inDrop ? 0.1 : 0), 0.55, 0.92);
    const dur = inBuild ? 0.35 : 0.65 + (noteIdx === this.hook.length - 1 ? 0.25 : 0);

    return [{ midi, velocity: vel, duration_sec: dur }];
  }

  private buildHook(ctx: TranceLeadContext): number[] {
    const contours = Object.keys(UK_TRANCE_HOOK_CONTOURS) as (keyof typeof UK_TRANCE_HOOK_CONTOURS)[];
    this.contourKey = contours[ctx.bar % contours.length];
    const degrees = UK_TRANCE_HOOK_CONTOURS[this.contourKey];
    const root = ctx.rootMidi + 12;
    const notes: number[] = [];
    for (const deg of degrees) {
      notes.push(this.scale.stepNote(root, deg, true));
    }
    return notes;
  }
}
